const { v4: uuid } = require("uuid");
const { SessionPass, ProvidusSettlementLog } = require("../models");
const { getProvider } = require("../modules/payments/paymentProvider.factory");
const auditService = require("./audit.service");
const logger = require("../config/logger");
const env = require("../config/env");
const { NotFoundError, ForbiddenError, ValidationAppError } = require("../errors/AppError");
const { RESOURCE_TYPES, PAYMENT_STATUS, PAYMENT_PROVIDERS, SESSION_PASS_SERVICE_TYPE } = require("../config/constants");

function assertOwnerOrStaff(pass, requestingUser) {
  const isOwner = String(pass.user) === String(requestingUser._id);
  if (!isOwner && requestingUser.userType !== "staff") {
    throw new ForbiddenError("You do not have access to this session pass");
  }
}

async function initializePass(user, req, serviceType) {
  if (!Object.values(SESSION_PASS_SERVICE_TYPE).includes(serviceType)) {
    throw new ValidationAppError(`serviceType must be one of: ${Object.values(SESSION_PASS_SERVICE_TYPE).join(", ")}`);
  }

  const provider = getProvider();
  const reference = `MSP-SP-${uuid()}`;
  const callbackUrl = `${env.publicWebUrl}/session-passes/callback`;
  const amount = env.sessionPassPrices[serviceType];

  const providerResult = await provider.initialize({
    email: user.email,
    amount,
    currency: env.sessionPassCurrency,
    reference,
    callbackUrl,
    metadata: { userId: String(user._id), serviceType },
  });

  const pass = await SessionPass.create({
    user: user._id,
    serviceType,
    amount,
    currency: env.sessionPassCurrency,
    provider: provider.name,
    reference,
    providerReference: providerResult.providerReference,
    authorizationUrl: providerResult.authorizationUrl,
    // Only Providus returns this today (a reserved virtual account has no
    // authorizationUrl to redirect to) -- kept so it isn't silently dropped
    // before any checkout UI exists to display it. applyVerificationResult
    // overwrites metadata once the pass actually settles.
    metadata: providerResult.bankDetails,
  });

  await auditService.record({
    user: user._id,
    action: "SESSION_PASS_INITIALIZED",
    resourceType: RESOURCE_TYPES.SESSION_PASS,
    resourceId: pass._id,
    newValue: { reference, serviceType, amount, currency: env.sessionPassCurrency },
    req,
  });

  return pass;
}

async function applyVerificationResult(pass, verification) {
  pass.status = verification.status;
  pass.channel = verification.channel || pass.channel;
  pass.metadata = verification.raw;
  if (verification.status === PAYMENT_STATUS.SUCCESS) {
    pass.verifiedAt = new Date();
    pass.activatedAt = pass.activatedAt || new Date();
    pass.expiresAt = new Date(pass.activatedAt.getTime() + env.sessionPassDurationHours * 60 * 60 * 1000);
  } else if (verification.status === PAYMENT_STATUS.FAILED || verification.status === PAYMENT_STATUS.CANCELLED) {
    pass.failureReason = `Provider reported status: ${verification.status}`;
  }
  await pass.save();
  return pass;
}

async function verifyPass(reference, req) {
  const pass = await SessionPass.findOne({ reference });
  if (!pass) throw new NotFoundError("Session pass not found");

  const provider = getProvider(pass.provider);
  const verification = await provider.verify(pass.providerReference || reference);
  await applyVerificationResult(pass, verification);

  await auditService.record({
    user: pass.user,
    action: "SESSION_PASS_VERIFIED",
    resourceType: RESOURCE_TYPES.SESSION_PASS,
    resourceId: pass._id,
    newValue: { status: pass.status, expiresAt: pass.expiresAt },
    req,
  });

  return pass;
}

async function getByReference(reference, requestingUser) {
  const pass = await SessionPass.findOne({ reference });
  if (!pass) throw new NotFoundError("Session pass not found");
  assertOwnerOrStaff(pass, requestingUser);
  return pass;
}

// serviceType omitted -> any active pass of either type qualifies (used by
// the pre-existing assessment-report/AI-chat unlock and scholarship
// redaction, neither of which is domestic/international-specific). Passed
// -> only a pass of that exact type counts (used to gate adviser enquiries).
async function getActivePass(userId, serviceType) {
  const filter = { user: userId, status: PAYMENT_STATUS.SUCCESS, expiresAt: { $gt: new Date() } };
  if (serviceType) filter.serviceType = serviceType;
  return SessionPass.findOne(filter).sort({ expiresAt: -1 });
}

async function hasActivePass(userId, serviceType) {
  const pass = await getActivePass(userId, serviceType);
  return Boolean(pass);
}

async function handleWebhook(providerName, rawBody, signatureHeader) {
  const provider = getProvider(providerName);
  const valid = provider.verifyWebhookSignature(rawBody, signatureHeader);
  if (!valid) {
    logger.warn("Rejected session pass webhook with invalid signature", { provider: providerName });
    throw new ForbiddenError("Invalid webhook signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new ForbiddenError("Malformed webhook payload");
  }

  const reference = provider.extractReferenceFromWebhookEvent(event);
  if (!reference) return { handled: false };

  const pass = await SessionPass.findOne({ $or: [{ reference }, { providerReference: reference }] });
  if (!pass) {
    logger.warn("Session pass webhook referenced an unknown pass", { provider: providerName, reference });
    return { handled: false };
  }

  const verification = await provider.verify(pass.providerReference || pass.reference);
  await applyVerificationResult(pass, verification);

  await auditService.record({
    action: "SESSION_PASS_WEBHOOK_PROCESSED",
    resourceType: RESOURCE_TYPES.SESSION_PASS,
    resourceId: pass._id,
    newValue: { status: pass.status },
  });

  return { handled: true, pass };
}

// ProvidusBank "Settlement Notification" webhook -- distinct from
// handleWebhook above because the contract is entirely different: no
// reference we generated, a fixed static signature rather than a body HMAC,
// mandatory dedupe by settlementId, and a response body whose exact shape
// (requestSuccessful/sessionId/responseMessage/responseCode) the bank
// parses, so errors can never be allowed to fall through to the app's
// generic error envelope -- every path below returns a well-formed object
// for the controller to send as-is as a 200.
//
// A reserved virtual account's number is matched against
// SessionPass.providerReference (same field every other provider stores
// its own transaction reference in) -- intentional reuse, not a new
// concept, see initialize()/providus.provider.js for why that field is
// still never populated for Providus yet: reserving an account requires
// GetProvidusAccount, which the bank hasn't spec'd. Until it is, every real
// notification will correctly fall into the "unknown account" branch below
// and come back rejected (02) -- that is expected, not a bug.
function buildSettlementResponse(sessionId, responseCode, responseMessage, requestSuccessful = true) {
  return { requestSuccessful, sessionId, responseMessage, responseCode };
}

async function handleProvidusSettlementNotification(body, signatureHeader) {
  const sessionId = body?.sessionId;
  try {
    const provider = getProvider(PAYMENT_PROVIDERS.PROVIDUS);
    if (!provider.verifyWebhookSignature(null, signatureHeader)) {
      logger.warn("Rejected Providus settlement notification with invalid signature", { sessionId });
      return buildSettlementResponse(sessionId, "02", "rejected transaction");
    }

    const { settlementId, accountNumber } = body || {};
    if (!settlementId || !accountNumber) {
      logger.warn("Rejected Providus settlement notification with missing settlementId/accountNumber", { sessionId });
      return buildSettlementResponse(sessionId, "02", "rejected transaction");
    }

    const existing = await ProvidusSettlementLog.findOne({ settlementId });
    if (existing) {
      return buildSettlementResponse(sessionId, "01", "duplicate transaction");
    }

    const pass = await SessionPass.findOne({ provider: PAYMENT_PROVIDERS.PROVIDUS, providerReference: accountNumber });
    if (!pass) {
      logger.warn("Providus settlement notification for an unknown virtual account", { sessionId, accountNumber, settlementId });
      await ProvidusSettlementLog.create({ settlementId, accountNumber, responseCode: "02", rawPayload: body });
      return buildSettlementResponse(sessionId, "02", "rejected transaction");
    }

    await applyVerificationResult(pass, { status: PAYMENT_STATUS.SUCCESS, channel: "bank_transfer", raw: body });
    await ProvidusSettlementLog.create({ settlementId, accountNumber, sessionPass: pass._id, responseCode: "00", rawPayload: body });
    await auditService.record({
      user: pass.user,
      action: "SESSION_PASS_PROVIDUS_SETTLED",
      resourceType: RESOURCE_TYPES.SESSION_PASS,
      resourceId: pass._id,
      newValue: { settlementId, accountNumber, settledAmount: body.settledAmount, expiresAt: pass.expiresAt },
    });

    return buildSettlementResponse(sessionId, "00", "success");
  } catch (err) {
    logger.error("Providus settlement notification handling failed", { sessionId, error: err.message });
    return buildSettlementResponse(sessionId, "03", "system failure", false);
  }
}

module.exports = {
  initializePass,
  verifyPass,
  getByReference,
  getActivePass,
  hasActivePass,
  handleWebhook,
  handleProvidusSettlementNotification,
};
