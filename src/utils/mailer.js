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

async function sendViaGemfiMailService({ to, subject, text, html }) {
  const res = await fetch(env.gemfiMail.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Auth": env.gemfiMail.internalSecret },
    body: JSON.stringify({ to, subject, text, html, fromName: env.mail.fromName }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gemfi-mail-service responded ${res.status}: ${body}`);
  }
}

/**
 * Sends an email via gemfi-mail-service when configured (see env.gemfiMail
 * above), falling back to direct SMTP, then to logging when neither is
 * configured — same dark-launch convention as smsSender.js.
 */
async function sendMail({ to, subject, text, html }) {
  if (env.gemfiMail.url) {
    await sendViaGemfiMailService({ to, subject, text, html });
    return { sent: true };
  }

  const t = getTransporter();
  if (!t) {
    logger.info("Mail not sent (no mail provider configured) — logging instead", { to, subject, text });
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
