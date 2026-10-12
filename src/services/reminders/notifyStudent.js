const { wasSent, recordSent } = require("../notificationLog.service");
const { sendMail } = require("../../utils/mailer");
const { sendWhatsApp } = require("../../utils/whatsappSender");
const logger = require("../../config/logger");

// Shared dispatch for every student-facing reminder type (all but the
// parent-consent nudge, which goes to the parent's contact, not the
// student's, and so isn't gated by the student's own prefs). Each channel is
// deduped independently via NotificationLog's (user, type, channel,
// dedupeKey) unique index -- a student with both channels on should get
// both, not just the first one tried. A send that throws is logged and not
// recorded, so the next cron run retries it rather than losing it silently.
async function notifyStudent(user, { type, dedupeKey, email, whatsapp }) {
  const prefs = user.notificationPreferences || { email: true, whatsapp: false };
  let sentCount = 0;

  if (prefs.email !== false && user.email) {
    if (!(await wasSent(user._id, type, "email", dedupeKey))) {
      try {
        await sendMail({ to: user.email, subject: email.subject, text: email.text, html: email.html });
        await recordSent(user._id, type, "email", dedupeKey);
        sentCount += 1;
      } catch (err) {
        logger.error("Reminder email failed", { type, dedupeKey, user: String(user._id), error: err.message });
      }
    }
  }

  if (prefs.whatsapp && user.phone) {
    if (!(await wasSent(user._id, type, "whatsapp", dedupeKey))) {
      try {
        await sendWhatsApp(user.phone, whatsapp.templateName, whatsapp.params);
        await recordSent(user._id, type, "whatsapp", dedupeKey);
        sentCount += 1;
      } catch (err) {
        logger.error("Reminder WhatsApp failed", { type, dedupeKey, user: String(user._id), error: err.message });
      }
    }
  }

  return sentCount;
}

module.exports = { notifyStudent };
