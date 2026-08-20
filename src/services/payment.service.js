const { v4: uuid } = require("uuid");
const { Payment, Assessment } = require("../models");
const { getProvider } = require("../modules/payments/paymentProvider.factory");
const assessmentService = require("./assessment.service");
const auditService = require("./audit.service");
const logger = require("../config/logger");
const env = require("../config/env");
const { NotFoundError, ForbiddenError, ConflictError } = require("../errors/AppError");
const { RESOURCE_TYPES, PAYMENT_STATUS, PAYMENT_STATUS_ON_ASSESSMENT } = require("../config/constants");

function assertOwnerOrStaff(payment, requestingUser) {
  const isOwner = String(payment.user) === String(requestingUser._id);
  if (!isOwner && requestingUser.userType !== "staff") {
    throw new ForbiddenError("You do not have access to this payment");
  }
}

async function initializePayment(assessmentId, user, req) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw new NotFoundError("Assessment not found");
  if (String(assessment.student) !== String(user._id)) {
    throw new ForbiddenError("You do not have access to this assessment");
  }
  if (assessment.paymentStatus === PAYMENT_STATUS_ON_ASSESSMENT.PAID) {
    throw new ConflictError("This assessment has already been paid for");
  }

  const provider = getProvider();
  const reference = `MSP-${uuid()}`;
  const callbackUrl = `${env.clientUrls[0] || "http://localhost:3000"}/payments/callback`;

  const providerResult = await provider.initialize({
    email: user.email,
    amount: assessment.price,
    currency: assessment.currency,
    reference,
    callbackUrl,
    metadata: { assessmentId: String(assessment._id), userId: String(user._id) },
  });

  const payment = await Payment.create({
    user: user._id,
    assessment: assessment._id,
    amount: assessment.price,
    currency: assessment.currency,
    provider: provider.name,
    reference,
    providerReference: providerResult.providerReference,
    authorizationUrl: providerResult.authorizationUrl,
  });

  assessment.paymentStatus = PAYMENT_STATUS_ON_ASSESSMENT.PENDING;
  await assessment.save();

  await auditService.record({
    user: user._id,
    action: "PAYMENT_INITIALIZED",
    resourceType: RESOURCE_TYPES.PAYMENT,
    resourceId: payment._id,
    newValue: { reference, amount: assessment.price, currency: assessment.currency },
    req,
  });

  return payment;
}

async function applyVerificationResult(payment, verification) {
  payment.status = verification.status;
  payment.channel = verification.channel || payment.channel;
  payment.metadata = verification.raw;
  if (verification.status === PAYMENT_STATUS.SUCCESS) {
    payment.verifiedAt = new Date();
  } else if (verification.status === PAYMENT_STATUS.FAILED || verification.status === PAYMENT_STATUS.CANCELLED) {
    payment.failureReason = `Provider reported status: ${verification.status}`;
  }
  await payment.save();

  if (verification.status === PAYMENT_STATUS.SUCCESS) {
    await assessmentService.unlockAfterPayment(payment.assessment);
  }
  return payment;
}

async function verifyPayment(reference, req) {
  const payment = await Payment.findOne({ reference });
  if (!payment) throw new NotFoundError("Payment not found");

  const provider = getProvider(payment.provider);
  const verification = await provider.verify(payment.providerReference || reference);
  await applyVerificationResult(payment, verification);

  await auditService.record({
    user: payment.user,
    action: "PAYMENT_VERIFIED",
    resourceType: RESOURCE_TYPES.PAYMENT,
    resourceId: payment._id,
    newValue: { status: payment.status },
    req,
  });

  return payment;
}

async function getByReference(reference, requestingUser) {
  const payment = await Payment.findOne({ reference }).populate("assessment", "status paymentStatus price currency");
  if (!payment) throw new NotFoundError("Payment not found");
  assertOwnerOrStaff(payment, requestingUser);
  return payment;
}

async function listAll({ page = 1, limit = 20, status, user }) {
  const filter = {};
  if (status) filter.status = status;
  if (user) filter.user = user;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Payment.find(filter).populate("user", "firstName lastName email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);
  return { items, total };
}

async function handleWebhook(providerName, rawBody, signatureHeader) {
  const provider = getProvider(providerName);
  const valid = provider.verifyWebhookSignature(rawBody, signatureHeader);
  if (!valid) {
    logger.warn("Rejected payment webhook with invalid signature", { provider: providerName });
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

  const payment = await Payment.findOne({ $or: [{ reference }, { providerReference: reference }] });
  if (!payment) {
    logger.warn("Payment webhook referenced an unknown payment", { provider: providerName, reference });
    return { handled: false };
  }

  const verification = await provider.verify(payment.providerReference || payment.reference);
  await applyVerificationResult(payment, verification);

  await auditService.record({
    action: "PAYMENT_WEBHOOK_PROCESSED",
    resourceType: RESOURCE_TYPES.PAYMENT,
    resourceId: payment._id,
    newValue: { status: payment.status },
  });

  return { handled: true, payment };
}

module.exports = { initializePayment, verifyPayment, getByReference, listAll, handleWebhook };
