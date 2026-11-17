const env = require("../config/env");
const logger = require("../config/logger");
const meta = require("./whatsappProviders/meta");
const infobip = require("./whatsappProviders/infobip");

// WHATSAPP_PROVIDER selects which backend sendWhatsApp() dispatches to. Each
// provider module exposes the same { isConfigured(), send(to, templateName,
// params) } shape, so switching providers is a one-line env change — no
// caller-side changes. `templateName` must already be an approved Meta
// message template either way (Infobip is a BSP on top of the same Meta
// template-approval flow, not a bypass of it).
const PROVIDERS = { meta, infobip };

/**
 * Sends a WhatsApp template message via the configured provider
 * (env.whatsapp.provider); logs instead of sending when it isn't configured
 * — same dark-launch convention as sendSms.
 */
async function sendWhatsApp(to, templateName, params = []) {
  const provider = PROVIDERS[env.whatsapp.provider];
  if (!provider || !provider.isConfigured()) {
    logger.info(`WhatsApp message not sent (provider "${env.whatsapp.provider}" not configured) — logging instead`, {
      to,
      templateName,
      params,
    });
    return { sent: false };
  }
  await provider.send(to, templateName, params);
  return { sent: true };
}

module.exports = { sendWhatsApp };
