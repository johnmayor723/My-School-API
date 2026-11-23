const axios = require("axios");
const crypto = require("crypto");
const env = require("../../../config/env");
const { PAYMENT_PROVIDERS, PAYMENT_STATUS } = require("../../../config/constants");
const { AppError } = require("../../../errors/AppError");

// 2026-11-17: ProvidusBank shared the "Virtual Payment Service" spec, so both
// legs are now real:
// - INBOUND: the Settlement Notification webhook (payload shape, response
//   codes, dedupe rule, X-Auth-Signature scheme) -- verifyWebhookSignature
//   below, handled in sessionPass.service.js#handleProvidusSettlementNotification.
// - OUTBOUND: PiPCreateReservedAccountNumber (reserve a virtual account) and
//   PiPverifyTransaction_sessionid/_settlementid (look up a transaction) --
//   note the bank's own UAT sign-off sheet called the former "GetProvidusAccount"
//   and the latter "ProvidusTransactionsStatus"; those were just working
//   names for the same two endpoints below, not separate undocumented ones.
//   ("No the second BaseURL is not for you, kindly ignore" -- the bank's doc
//   examples use other base URLs (192.168.1.210:8088, localhost:54356) as
//   generic placeholders; PROVIDUS_BASE_URL below is the one actually
//   confirmed+whitelisted for us.)
//
// Confirmed so far:
// - BaseUrl: PROVIDUS_BASE_URL (test: http://102.209.190.54:8088/appdevapi/api/)
//   -- 2026-11-17's confirmed base URL (port 8882) turned out to be wrong;
//   it only ever served a dead Tomcat 404. The bank's engineers corrected
//   it to port 8088 on 2026-11-23, and PiPCreateReservedAccountNumber now
//   returns a real 200 (responseCode "00", a generated account_number) --
//   first genuinely live-verified call on this integration. The IIS server
//   on 8088 also took ~25s to respond on that first call, well past the
//   15s axios timeout below, so the timeout was raised to stay safe.
// - Client-Id header: PROVIDUS_CLIENT_ID (sent as-is, already base64)
// - X-Auth-Signature header: SHA512("ClientId:ClientSecret") hex, compared
//   case-insensitively -- ClientSecret itself is never sent on the wire,
//   only used to derive this signature. Verified against the bank's own
//   worked examples (Settlement Notification spec + the Virtual Payment
//   Service doc's curl samples use the identical signature value).
// - This signature is static (same value every call as long as the
//   credentials don't change) -- it is NOT an HMAC over the request/webhook
//   body, so verifyWebhookSignature below ignores the body entirely.
// - This is a *virtual account* collection rail (payer transfers to a
//   generated account number), not a redirect-checkout flow like
//   Paystack/Flutterwave -- initialize() returns account details instead of
//   an authorizationUrl. SessionPass/the checkout UI still need a "bank
//   transfer" display mode to actually surface this to a payer -- Providus
//   isn't wired into the live checkout flow yet (env.paymentProvider still
//   defaults elsewhere), this just makes the provider itself correct and
//   ready for when that UI work happens.
// - verify(reference) genuinely doesn't fit this rail the way it does
//   Paystack/Flutterwave's: those pass a single transaction reference
//   produced at initialize() time; Providus's initialize() only produces a
//   *persistent account number*, not a transaction id -- no transaction
//   exists to verify until a real transfer lands, at which point the
//   Settlement Notification webhook already activates the pass on its own
//   (see handleProvidusSettlementNotification). verify() below is wired to
//   PiPverifyTransaction_settlementid (matching ProvidusSettlementLog's key)
//   for manual reconciliation only -- calling it with a bare account number
//   (what sessionPass.service.js's normal auto-verify flow would pass) will
//   not resolve to anything, since the bank has no settlement for an account
//   that hasn't been funded yet. Not treating this as solved until the
//   checkout/reconciliation UI actually decides how it wants to call this.
//
// The sign-off sheet also lists GetNIPAccount/NIPFundTransfer/GetNipBank/
// NIPFundTransferMultipleDebitAccounts/GetNIPTransactionStatus and BVN 1.0/2.0
// lookups -- those are outbound-transfer and BVN-verification capabilities,
// unrelated to this session-pass collection flow, not scaffolded here.
//
// LIVE-VERIFIED 2026-11-23: initialize() -> PiPCreateReservedAccountNumber
// against the corrected port-8088 base URL returns a real 200
// (requestSuccessful: true, responseCode "00", a generated account_number).
// The 2026-11-17 404 was simply the wrong port (8882), not a missing/
// unprovisioned endpoint -- no alternate paths were guessed; the bank's
// own engineers supplied the correction. verify() -> PiPverifyTransaction_
// settlementid has NOT been live-tested yet (needs a real settled
// transaction/settlementId to call it against); treat it as unconfirmed
// until reconciliation is actually exercised end to end.

function buildAuthHeaders() {
  if (!env.providus.clientId || !env.providus.clientSecret) {
    throw new AppError(
      "ProvidusBank is not configured (PROVIDUS_CLIENT_ID/PROVIDUS_CLIENT_SECRET missing)",
      500,
      "PAYMENT_PROVIDER_NOT_CONFIGURED"
    );
  }
  const signature = crypto
    .createHash("sha512")
    .update(`${env.providus.clientId}:${env.providus.clientSecret}`)
    .digest("hex");
  return { "Client-Id": env.providus.clientId, "X-Auth-Signature": signature };
}

function client() {
  return axios.create({
    baseURL: env.providus.baseUrl,
    headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
    // The bank's IIS test server took ~25s to answer the first live call.
    timeout: 45000,
  });
}

// account_name is just a display label the bank wraps as "MERCHANT(<name>)"
// on the reserved account -- not used for any matching, so a best-effort
// human-readable value is fine. bvn is optional per the bank's own example
// (empty string accepted).
async function initialize({ email, metadata } = {}) {
  const http = client();
  const accountName = String(metadata?.accountName || email || "MySchoolPlacement").slice(0, 100);

  let response;
  try {
    response = await http.post("PiPCreateReservedAccountNumber", { account_name: accountName, bvn: "" });
  } catch (err) {
    throw new AppError(
      `ProvidusBank reserved-account request failed: ${err.response?.data?.responseMessage || err.message}`,
      502,
      "PAYMENT_PROVIDER_REQUEST_FAILED"
    );
  }

  const data = response.data;
  if (!data?.requestSuccessful || data.responseCode !== "00" || !data.account_number) {
    throw new AppError(
      `ProvidusBank declined the reserved-account request: ${data?.responseMessage || "unknown error"}`,
      502,
      "PAYMENT_PROVIDER_REQUEST_FAILED"
    );
  }

  return {
    providerReference: data.account_number,
    authorizationUrl: null,
    // Not part of the generic provider interface (see sessionPass.service.js)
    // -- surfaced so a future bank-transfer checkout UI has something to
    // display; today sessionPass.service.js folds this into the pass's
    // metadata at creation time rather than dropping it.
    bankDetails: { accountNumber: data.account_number, accountName: data.account_name, bankName: "Providus Bank" },
  };
}

// Reconciliation lookup only -- see the file-header note on why this doesn't
// fit the normal auto-verify flow for this rail. `reference` here is treated
// as a Providus settlementId, not our own pass.reference or the account
// number sessionPass.service.js would otherwise pass in.
async function verify(reference) {
  const http = client();
  let response;
  try {
    response = await http.get("PiPverifyTransaction_settlementid", { params: { settlement_id: reference } });
  } catch (err) {
    throw new AppError(
      `ProvidusBank transaction-status request failed: ${err.response?.data?.responseMessage || err.message}`,
      502,
      "PAYMENT_PROVIDER_REQUEST_FAILED"
    );
  }

  const tx = response.data || {};
  const settled = Number(tx.settledAmount) > 0;
  return {
    status: settled ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.PENDING,
    amount: tx.transactionAmount,
    currency: tx.currency,
    channel: "bank_transfer",
    paidAt: tx.tranDateTime ? new Date(tx.tranDateTime) : null,
    providerReference: tx.accountNumber,
    raw: tx,
  };
}

// Same formula as buildAuthHeaders -- ProvidusBank reuses the static
// Client-Id:ClientSecret signature on inbound webhook calls too, rather than
// signing each webhook body separately. Compared case-insensitively per
// their spec ("kindly make the value of the X-Auth-Signature non case
// sensitive").
function verifyWebhookSignature(_rawBody, signatureHeader) {
  if (!signatureHeader || !env.providus.clientId || !env.providus.clientSecret) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${env.providus.clientId}:${env.providus.clientSecret}`)
    .digest("hex");
  return String(signatureHeader).toLowerCase() === expected.toLowerCase();
}

function extractReferenceFromWebhookEvent(event) {
  return event?.data?.reference || event?.reference || null;
}

module.exports = {
  name: PAYMENT_PROVIDERS.PROVIDUS,
  initialize,
  verify,
  verifyWebhookSignature,
  extractReferenceFromWebhookEvent,
};
