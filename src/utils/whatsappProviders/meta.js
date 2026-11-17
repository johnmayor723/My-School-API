const env = require("../../config/env");

// Meta requires E.164 without a leading "+" for the Cloud API, e.g.
// 2348012345678.
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

function isConfigured() {
  return Boolean(env.whatsapp.meta.phoneNumberId && env.whatsapp.meta.accessToken);
}

async function send(to, templateName, params = []) {
  const url = `https://graph.facebook.com/${env.whatsapp.meta.apiVersion}/${env.whatsapp.meta.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.whatsapp.meta.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: params?.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text) })) }]
          : [],
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WhatsApp Cloud API responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { isConfigured, send };
