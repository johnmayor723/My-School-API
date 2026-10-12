const { Assessment, AdmissionSession, User } = require("../../models");
const { daysUntil } = require("../../utils/dateMath");
const { notifyStudent } = require("./notifyStudent");
const { NOTIFICATION_TYPES } = require("../../config/constants");

// Smallest-first, stop at the first match -- see scholarshipDeadline.reminder.js
// for why (avoids a simultaneous 14-day + 7-day double-send with inaccurate
// "14 days" wording when a session's endDate is set/moved to e.g. 5 days out).
const OFFSET_DAYS_ASC = [7, 14];
const TYPE = NOTIFICATION_TYPES.ADMISSION_SESSION_CLOSING;
const WHATSAPP_TEMPLATE = "admission_session_closing_reminder";

// Coarse signal -- session-level only, no per-institution/programme deadline
// exists anywhere in the data model (see plan doc). Many AdmissionSession
// docs have no endDate set at all; those are simply skipped, not an error.
async function run() {
  const pairs = await Assessment.aggregate([{ $group: { _id: { student: "$student", admissionSession: "$admissionSession" } } }]);

  const sessionCache = new Map();
  let sentCount = 0;

  for (const { _id } of pairs) {
    const sessionId = String(_id.admissionSession);
    if (!sessionCache.has(sessionId)) {
      sessionCache.set(sessionId, await AdmissionSession.findById(_id.admissionSession));
    }
    const session = sessionCache.get(sessionId);
    if (!session?.endDate) continue;

    const daysLeft = daysUntil(session.endDate);
    if (daysLeft < 0) continue;

    const user = await User.findById(_id.student);
    if (!user) continue;

    for (const offsetDays of OFFSET_DAYS_ASC) {
      if (daysLeft > offsetDays) continue;
      const dedupeKey = `session:${_id.student}:${_id.admissionSession}:${offsetDays}`;
      const dayWord = daysLeft === 1 ? "day" : "days";
      sentCount += await notifyStudent(user, {
        type: TYPE,
        dedupeKey,
        email: {
          subject: `${session.name} admissions session closes in ${daysLeft} ${dayWord}`,
          text: `Hi ${user.firstName},\n\nThe ${session.name} admissions session you have an assessment in closes in ${daysLeft} ${dayWord}. Log in to review your matches before it closes.\n\nManage your reminder settings under Profile.`,
          html: `<p>Hi ${user.firstName},</p><p>The <strong>${session.name}</strong> admissions session you have an assessment in closes in ${daysLeft} ${dayWord}. Log in to review your matches before it closes.</p><p style="color:#666;font-size:13px">Manage your reminder settings under Profile.</p>`,
        },
        whatsapp: { templateName: WHATSAPP_TEMPLATE, params: [user.firstName, session.name, String(daysLeft)] },
      });
      break;
    }
  }

  return sentCount;
}

module.exports = { run };
