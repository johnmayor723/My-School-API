const env = require("../../config/env");

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

function isConfigured() {
  return Boolean(env.sms.termii.apiKey && env.sms.termii.senderId);
}

async function send(to, message) {
  const res = await fetch(TERMII_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.sms.termii.apiKey,
      to: toTermiiFormat(to),
      from: env.sms.termii.senderId,
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

module.exports = { isConfigured, send };
