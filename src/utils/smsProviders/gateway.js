const env = require("../../config/env");

// Self-hosted sms-gateway-api (see /opt/sms-gateway-api) — relays to an
// Android phone's own SIM via a companion app instead of a paid SMS API.
//
// The gateway requires E.164 (+countrycode...). Identifiers arrive as
// whatever a user typed (local 0-prefix, 234-prefix, or already +234) —
// normalized here so callers don't have to care about the provider's format.
function toE164(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+${digits}`;
}

function isConfigured() {
  return Boolean(env.sms.gateway.url && env.sms.gateway.apiKey);
}

async function send(to, message) {
  const res = await fetch(`${env.sms.gateway.url}/v1/sms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.sms.gateway.apiKey}`,
    },
    body: JSON.stringify({ to: toE164(to), message }),
  });
  const body = await res.json().catch(() => ({}));
  // 202 means the gateway accepted the job but the device hasn't acked yet
  // within its timeout window — not a failure, the job still completes async.
  if (!res.ok && res.status !== 202) {
    throw new Error(`SMS gateway responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { isConfigured, send };
