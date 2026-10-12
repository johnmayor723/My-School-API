const env = require("../config/env");
const logger = require("../config/logger");
const gateway = require("./smsProviders/gateway");
const termii = require("./smsProviders/termii");
const infobip = require("./smsProviders/infobip");

// SMS_PROVIDER selects which backend sendSms() dispatches to. Each provider
// module exposes the same { isConfigured(), send(to, message) } shape, so
// switching providers is a one-line env change — no caller-side changes.
const PROVIDERS = { gateway, termii, infobip };

/**
 * Sends SMS via the configured provider (env.sms.provider); logs instead of
 * sending when it isn't configured, so the phone-OTP code path (and anything
 * that depends on it — signup, login, deletion) is exercisable end-to-end
 * before a real provider is plugged in.
 */
async function sendSms(to, message) {
  const provider = PROVIDERS[env.sms.provider];
  if (!provider || !provider.isConfigured()) {
    logger.info(`SMS not sent (provider "${env.sms.provider}" not configured) — logging instead`, {
      to,
      message,
    });
    return { sent: false };
  }
  await provider.send(to, message);
  return { sent: true };
}

module.exports = { sendSms };
