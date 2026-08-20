const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../config/logger");

let transporter = null;

function getTransporter() {
  if (!env.mail.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email via SMTP when credentials are configured. In local/dev use
 * without SMTP_HOST set, the message is logged instead of sent so the rest of
 * the flow (password reset, etc.) is still exercisable end-to-end.
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    logger.info("Mail not sent (SMTP not configured) — logging instead", { to, subject, text });
    return { sent: false };
  }
  await t.sendMail({
    from: `"${env.mail.fromName}" <${env.mail.from}>`,
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}

module.exports = { sendMail };
