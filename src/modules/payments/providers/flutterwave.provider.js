const axios = require("axios");
const env = require("../../../config/env");
const { PAYMENT_PROVIDERS, PAYMENT_STATUS } = require("../../../config/constants");
const { AppError } = require("../../../errors/AppError");

const BASE_URL = "https://api.flutterwave.com/v3";

function client() {
  if (!env.flutterwave.secretKey) {
    throw new AppError("Flutterwave is not configured (FLUTTERWAVE_SECRET_KEY is missing)", 500, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${env.flutterwave.secretKey}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

function mapStatus(flwStatus) {
  switch (flwStatus) {
    case "successful":
      return PAYMENT_STATUS.SUCCESS;
    case "failed":
      return PAYMENT_STATUS.FAILED;
    case "cancelled":
      return PAYMENT_STATUS.CANCELLED;
    default:
      return PAYMENT_STATUS.PROCESSING;
  }
}

async function initialize({ email, amount, reference, callbackUrl, metadata }) {
  const { data } = await client().post("/payments", {
    tx_ref: reference,
    amount,
    currency: "NGN",
    redirect_url: callbackUrl,
    customer: { email },
    meta: metadata,
  });
  return {
    authorizationUrl: data.data.link,
    providerReference: reference,
  };
}

async function verify(reference) {
  // Flutterwave verifies by their internal numeric transaction id; when we only
  // hold our tx_ref, resolve it first.
  const isNumericId = /^\d+$/.test(String(reference));
  let tx;
  if (isNumericId) {
    const { data } = await client().get(`/transactions/${reference}/verify`);
    tx = data.data;
  } else {
    const { data } = await client().get("/transactions", { params: { tx_ref: reference } });
    tx = (data.data || [])[0];
    if (tx) {
      const verifyResp = await client().get(`/transactions/${tx.id}/verify`);
      tx = verifyResp.data.data;
    }
  }
  if (!tx) return { status: PAYMENT_STATUS.PROCESSING, amount: null, currency: null, channel: null, paidAt: null, providerReference: reference, raw: null };

  return {
    status: mapStatus(tx.status),
    amount: tx.amount,
    currency: tx.currency,
    channel: tx.payment_type,
    paidAt: tx.created_at ? new Date(tx.created_at) : null,
    providerReference: String(tx.id),
    raw: tx,
  };
}

// Flutterwave webhooks are authenticated with a static shared secret hash
// echoed back in the "verif-hash" header — a direct comparison, not an HMAC.
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.flutterwave.secretHash || !signatureHeader) return false;
  return signatureHeader === env.flutterwave.secretHash;
}

function extractReferenceFromWebhookEvent(event) {
  return event?.data?.tx_ref || (event?.data?.id ? String(event.data.id) : undefined);
}

module.exports = {
  name: PAYMENT_PROVIDERS.FLUTTERWAVE,
  initialize,
  verify,
  verifyWebhookSignature,
  extractReferenceFromWebhookEvent,
};
