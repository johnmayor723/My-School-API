const env = require("../config/env");
const logger = require("../config/logger");

const TERMII_SEND_URL = "https://api.ng.termii.com/api/sms/send";

// Termii expects a bare international-format number (no leading "+"), e.g.
// 2348012345678. Identifiers arrive as whatever a user typed (local 0-prefix,
// +234, or already 234-prefixed) — normalized here so callers don't have to
// care about the provider's format.
function toTermiiFormat(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

async function sendViaTermii(to, message) {
  const res = await fetch(TERMII_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.sms.termiiApiKey,
      to: toTermiiFormat(to),
      from: env.sms.termiiSenderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code === "ivalid_api_key" || body.code === "error") {
    throw new Error(`Termii responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

/**
 * Sends SMS via Termii when credentials are configured; logs instead of
 * sending when SMS_ENABLED is off (same dark-launch convention as
 * mailer.js's fallback), so the phone-OTP code path is exercisable
 * end-to-end without a provider plugged in.
 */
async function sendSms(to, message) {
  if (!env.sms.enabled) {
    logger.info("SMS not sent (no provider configured) — logging instead", { to, message });
    return { sent: false };
  }
  if (!env.sms.termiiApiKey || !env.sms.termiiSenderId) {
    throw new Error("SMS_ENABLED is true but TERMII_API_KEY/TERMII_SENDER_ID are not set");
  }
  await sendViaTermii(to, message);
  return { sent: true };
}

module.exports = { sendSms };
