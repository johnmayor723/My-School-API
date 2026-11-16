const axios = require("axios");
const crypto = require("crypto");
const env = require("../../../config/env");
const { PAYMENT_PROVIDERS } = require("../../../config/constants");
const { AppError } = require("../../../errors/AppError");

// Scaffold only. ProvidusBank's Accounts Collection Service integration spec
// (reserve-virtual-account endpoint, transaction-status endpoint, and the
// inbound webhook payload/signature scheme) hasn't been shared yet -- only
// the credentials and the outbound request-signing rule have. What's
// confirmed is wired below; initialize/verify/webhook throw a clear
// "not implemented" error until the real endpoint paths and payload shapes
// arrive, rather than guessing at a real bank's API surface.
//
// Confirmed so far:
// - BaseUrl: PROVIDUS_BASE_URL (test: http://102.209.190.54:8882/appdevapi/api/)
// - Client-Id header: PROVIDUS_CLIENT_ID (sent as-is, already base64)
// - X-Auth-Signature header: SHA512("ClientId:ClientSecret") -- ClientSecret
//   itself is never sent, only used to derive this signature.
// - Also note: this is a *virtual account* collection rail (payer transfers
//   to a generated account number), not a redirect-checkout flow like
//   Paystack/Flutterwave -- initialize() will need to return account details
//   instead of authorizationUrl once implemented, and SessionPass/the
//   checkout UI will need a "bank transfer" display mode for it.
//
// Named action points from ProvidusBank's UAT sign-off sheet (endpoint names
// only -- still no request/response payload shapes or exact paths), mapped
// to what each function here will call once that detail arrives:
//   initialize() -> GetProvidusAccount      (reserve a virtual account)
//   verify()     -> ProvidusTransactionsStatus
//   webhook      -> "Transaction Notification" (ProvidusBank calls OUR endpoint)
// The sign-off sheet also lists GetNIPAccount/NIPFundTransfer/GetNipBank/
// NIPFundTransferMultipleDebitAccounts/GetNIPTransactionStatus and BVN 1.0/2.0
// lookups -- those are outbound-transfer and BVN-verification capabilities,
// unrelated to this session-pass collection flow, not scaffolded here.

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
    timeout: 15000,
  });
}

function notImplemented(action) {
  throw new AppError(
    `ProvidusBank ${action} is not implemented yet -- awaiting the Accounts Collection Service integration spec (endpoint paths/payload shapes)`,
    501,
    "PAYMENT_PROVIDER_NOT_IMPLEMENTED"
  );
}

async function initialize(/* { email, amount, currency, reference, callbackUrl, metadata } */) {
  client(); // fails fast with a clear error if credentials aren't configured, same as other providers
  notImplemented("virtual account reservation");
}

async function verify(/* reference */) {
  client();
  notImplemented("transaction verification");
}

// Separate from the X-Auth-Signature above -- that one signs calls *we* make
// to ProvidusBank. Their inbound webhook signing scheme isn't confirmed yet,
// so this rejects everything until it is.
function verifyWebhookSignature() {
  return false;
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
