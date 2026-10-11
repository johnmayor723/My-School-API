const env = require("../config/env");
const logger = require("../config/logger");

// Meta requires E.164 without a leading "+" for the Cloud API, e.g.
// 2348012345678 -- same normalization as smsSender.js's Termii format,
// duplicated rather than shared since the two providers' exact requirements
// could diverge later and this is three lines either way.
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

async function sendViaMetaCloud(to, templateName, params) {
  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
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

/**
 * Sends a WhatsApp template message via Meta's Cloud API when credentials
 * are configured; logs instead of sending when they're not -- same
 * dark-launch convention as sendSms/sendMail. `templateName` must already be
 * an approved Meta message template (business-initiated messages outside a
 * 24h user session window can't be freeform text); `params` fills the
 * template's body placeholders in order.
 */
async function sendWhatsApp(to, templateName, params = []) {
  if (!env.whatsapp.phoneNumberId || !env.whatsapp.accessToken) {
    logger.info("WhatsApp message not sent (Cloud API not configured) — logging instead", { to, templateName, params });
    return { sent: false };
  }
  await sendViaMetaCloud(to, templateName, params);
  return { sent: true };
}

module.exports = { sendWhatsApp };
