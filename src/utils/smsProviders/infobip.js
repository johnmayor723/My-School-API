const env = require("../../config/env");

// Infobip expects a bare international-format number (no leading "+"), e.g.
// 2348012345678. Identifiers arrive as whatever a user typed (local 0-prefix,
// +234, or already 234-prefixed) — normalized here so callers don't have to
// care about the provider's format.
function toInfobipFormat(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

function isConfigured() {
  return Boolean(env.sms.infobip.baseUrl && env.sms.infobip.apiKey && env.sms.infobip.sender);
}

async function send(to, message) {
  const res = await fetch(`https://${env.sms.infobip.baseUrl}/sms/2/text/advanced`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `App ${env.sms.infobip.apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to: toInfobipFormat(to) }],
          from: env.sms.infobip.sender,
          text: message,
        },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Infobip responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { isConfigured, send };
