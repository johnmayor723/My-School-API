const crypto = require("crypto");
const env = require("../../config/env");

// Infobip expects a bare international-format number (no leading "+"), e.g.
// 2348012345678 — same convention as smsProviders/infobip.js.
function toInfobipFormat(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

function isConfigured() {
  return Boolean(env.whatsapp.infobip.baseUrl && env.whatsapp.infobip.apiKey && env.whatsapp.infobip.sender);
}

// Infobip is still a WhatsApp Business Solution Provider underneath — the
// templateName still has to exist as an approved Meta template on the
// account, same as the direct Cloud API. Only Infobip's own sandbox
// template(s) work until real templates are submitted and approved.
async function send(to, templateName, params = []) {
  const res = await fetch(`https://${env.whatsapp.infobip.baseUrl}/whatsapp/1/message/template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `App ${env.whatsapp.infobip.apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          from: env.whatsapp.infobip.sender,
          to: toInfobipFormat(to),
          messageId: crypto.randomUUID(),
          content: {
            templateName,
            templateData: params?.length ? { body: { placeholders: params.map(String) } } : undefined,
            language: "en",
          },
        },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Infobip WhatsApp API responded ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { isConfigured, send };
