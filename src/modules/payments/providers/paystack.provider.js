const axios = require("axios");
const crypto = require("crypto");
const env = require("../../../config/env");
const { PAYMENT_PROVIDERS, PAYMENT_STATUS } = require("../../../config/constants");
const { AppError } = require("../../../errors/AppError");

const BASE_URL = "https://api.paystack.co";

function client() {
  if (!env.paystack.secretKey) {
    throw new AppError("Paystack is not configured (PAYSTACK_SECRET_KEY is missing)", 500, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${env.paystack.secretKey}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

function mapStatus(paystackStatus) {
  switch (paystackStatus) {
    case "success":
      return PAYMENT_STATUS.SUCCESS;
    case "failed":
      return PAYMENT_STATUS.FAILED;
    case "abandoned":
      return PAYMENT_STATUS.CANCELLED;
    default:
      return PAYMENT_STATUS.PROCESSING;
  }
}

// Paystack amounts are in the smallest currency unit (kobo for NGN).
async function initialize({ email, amount, reference, callbackUrl, metadata }) {
  const { data } = await client().post("/transaction/initialize", {
    email,
    amount: Math.round(amount * 100),
    reference,
    callback_url: callbackUrl,
    metadata,
  });
  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    providerReference: data.data.reference,
  };
}

async function verify(reference) {
  const { data } = await client().get(`/transaction/verify/${encodeURIComponent(reference)}`);
  const tx = data.data;
  return {
    status: mapStatus(tx.status),
    amount: tx.amount / 100,
    currency: tx.currency,
    channel: tx.channel,
    paidAt: tx.paid_at ? new Date(tx.paid_at) : null,
    providerReference: tx.reference,
    raw: tx,
  };
}

// Paystack signs webhook payloads: HMAC-SHA512 of the raw request body, keyed
// with the secret key, compared against the x-paystack-signature header.
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.paystack.secretKey || !signatureHeader) return false;
  const hash = crypto.createHmac("sha512", env.paystack.secretKey).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

function extractReferenceFromWebhookEvent(event) {
  return event?.data?.reference;
}

module.exports = {
  name: PAYMENT_PROVIDERS.PAYSTACK,
  initialize,
  verify,
  verifyWebhookSignature,
  extractReferenceFromWebhookEvent,
};
