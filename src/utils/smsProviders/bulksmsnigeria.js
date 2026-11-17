const env = require("../../config/env");

const BULKSMSNIGERIA_SEND_URL = `https://www.bulksmsnigeria.com/api/${env.sms.bulksmsnigeria.sandbox ? "sandbox/v2" : "v2"}/sms`;

// BulkSMSNigeria expects a bare international-format number (no leading
// "+"), e.g. 2348012345678 — same convention as the other NG providers here.
function toBulkSmsNigeriaFormat(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

function isConfigured() {
  return Boolean(env.sms.bulksmsnigeria.apiToken && env.sms.bulksmsnigeria.senderId);
}

async function send(to, message) {
  const res = await fetch(BULKSMSNIGERIA_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${env.sms.bulksmsnigeria.apiToken}`,
    },
    body: JSON.stringify({
      from: env.sms.bulksmsnigeria.senderId,
      to: toBulkSmsNigeriaFormat(to),
      body: message,
      ...(env.sms.bulksmsnigeria.gateway ? { gateway: env.sms.bulksmsnigeria.gateway } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(`BulkSMSNigeria responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { isConfigured, send };
