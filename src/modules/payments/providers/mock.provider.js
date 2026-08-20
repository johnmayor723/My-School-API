const crypto = require("crypto");
const env = require("../../../config/env");
const { PAYMENT_PROVIDERS, PAYMENT_STATUS } = require("../../../config/constants");

// Settles every transaction instantly. Used as the default so the whole
// register -> assess -> pay -> unlock flow is runnable end-to-end without any
// external payment credentials configured.
async function initialize({ reference, amount, currency }) {
  const base = env.clientUrls[0] || "http://localhost:3000";
  return {
    authorizationUrl: `${base}/mock-checkout?reference=${encodeURIComponent(reference)}&amount=${amount}&currency=${currency}`,
    providerReference: reference,
  };
}

async function verify(reference) {
  return {
    status: PAYMENT_STATUS.SUCCESS,
    amount: null,
    currency: null,
    channel: "mock",
    paidAt: new Date(),
    providerReference: reference,
    raw: { mock: true },
  };
}

function signPayload(payload) {
  return crypto.createHmac("sha256", env.paymentWebhookSecret || "mock-secret").update(payload).digest("hex");
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const expected = signPayload(rawBody);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

function extractReferenceFromWebhookEvent(event) {
  return event?.data?.reference;
}

module.exports = {
  name: PAYMENT_PROVIDERS.MOCK,
  initialize,
  verify,
  verifyWebhookSignature,
  extractReferenceFromWebhookEvent,
  signPayload,
};
