const { Assessment } = require("../../models");
const { PAYMENT_STATUS_ON_ASSESSMENT, NOTIFICATION_TYPES } = require("../../config/constants");
const { notifyStudent } = require("./notifyStudent");

const OFFSET_HOURS = 24;
const TYPE = NOTIFICATION_TYPES.UNPAID_ASSESSMENT;
const WHATSAPP_TEMPLATE = "unpaid_assessment_reminder";

// Not in the Phase 1 memo's 8 items -- a product add-on, not a spec
// requirement (see NOTIFICATIONS_AND_ADVISER_PLAN.md Part B). Single
// reminder at 24h, not a repeating series.
async function run() {
  const cutoff = new Date(Date.now() - OFFSET_HOURS * 60 * 60 * 1000);
  const unpaid = await Assessment.find({
    paymentStatus: PAYMENT_STATUS_ON_ASSESSMENT.UNPAID,
    createdAt: { $lte: cutoff },
  }).populate("student");

  let sentCount = 0;
  for (const assessment of unpaid) {
    const user = assessment.student;
    if (!user) continue;

    const dedupeKey = `assessment:${assessment._id}:unpaid`;
    sentCount += await notifyStudent(user, {
      type: TYPE,
      dedupeKey,
      email: {
        subject: "Your My School Placement report is waiting",
        text: `Hi ${user.firstName},\n\nYou started an assessment but haven't completed payment to unlock the full report yet. Log in to finish up whenever you're ready.\n\nManage your reminder settings under Profile.`,
        html: `<p>Hi ${user.firstName},</p><p>You started an assessment but haven't completed payment to unlock the full report yet. Log in to finish up whenever you're ready.</p><p style="color:#666;font-size:13px">Manage your reminder settings under Profile.</p>`,
      },
      whatsapp: { templateName: WHATSAPP_TEMPLATE, params: [user.firstName] },
    });
  }

  return sentCount;
}

module.exports = { run };
