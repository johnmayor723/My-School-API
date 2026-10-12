const { ParentConsent } = require("../../models");
const { PARENT_CONSENT_STATUS, OTP_CHANNEL, NOTIFICATION_TYPES } = require("../../config/constants");
const { hoursSince } = require("../../utils/dateMath");
const { wasSent, recordSent } = require("../notificationLog.service");
const { sendMail } = require("../../utils/mailer");
const { sendSms } = require("../../utils/smsSender");
const env = require("../../config/env");
const logger = require("../../config/logger");

const OFFSET_HOURS = [24, 72];
const TYPE = NOTIFICATION_TYPES.PARENT_CONSENT_PENDING;

// Goes to the parent's own contact, in whatever channel they originally gave
// at sign-up (email or phone) -- same mechanism as the student-triggered
// "resend" in parentConsent.service.js. Not gated by the student's own
// notificationPreferences: it isn't the student being notified, and there's
// no separate WhatsApp consent flow for parents, so WhatsApp is never used
// here regardless of the student's WhatsApp opt-in.
async function run() {
  const pending = await ParentConsent.find({ status: PARENT_CONSENT_STATUS.PENDING }).populate("student");
  let sentCount = 0;
  const consentUrl = `${env.publicWebUrl}/parent-consent`;

  for (const consent of pending) {
    const student = consent.student;
    if (!student) continue;

    const hrs = hoursSince(consent.createdAt);
    for (const offsetHours of OFFSET_HOURS) {
      if (hrs < offsetHours) continue;

      const channel = consent.channel === OTP_CHANNEL.EMAIL ? "email" : "sms";
      const dedupeKey = `consent:${consent._id}:${offsetHours}`;
      if (await wasSent(student._id, TYPE, channel, dedupeKey)) continue;

      try {
        if (channel === "email") {
          await sendMail({
            to: consent.parentEmail,
            subject: `Action needed: confirm parental consent for ${student.firstName}'s account`,
            text: `Hi ${consent.parentName},\n\n${student.firstName} signed up for My School Placement, which needs your consent before the account can be used. Confirm here: ${consentUrl}\n\nIf you've already done this, you can ignore this message.`,
            html: `<p>Hi ${consent.parentName},</p><p>${student.firstName} signed up for My School Placement, which needs your consent before the account can be used.</p><p><a href="${consentUrl}">Confirm consent</a></p><p style="color:#666;font-size:13px">If you've already done this, you can ignore this message.</p>`,
          });
        } else {
          await sendSms(
            consent.parentPhone,
            `My School Placement: ${student.firstName}'s account needs your consent to activate. Confirm at ${consentUrl}`
          );
        }
        await recordSent(student._id, TYPE, channel, dedupeKey);
        sentCount += 1;
      } catch (err) {
        logger.error("Parent consent reminder failed", { consent: String(consent._id), offsetHours, error: err.message });
      }
    }
  }

  return sentCount;
}

module.exports = { run };
