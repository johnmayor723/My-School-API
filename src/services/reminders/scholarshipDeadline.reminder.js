const { SavedScholarship } = require("../../models");
const scholarshipClient = require("../scholarshipService.client");
const { daysUntil } = require("../../utils/dateMath");
const { notifyStudent } = require("./notifyStudent");
const { NOTIFICATION_TYPES } = require("../../config/constants");
const logger = require("../../config/logger");

// Checked smallest-first: only the nearest unmet threshold should ever fire
// in a given run. If a scholarship is saved (or its deadline pulled in) when
// daysLeft is already e.g. 5, both the 14- and 7-day buckets would otherwise
// satisfy "daysLeft <= offsetDays" simultaneously -- sending both, each
// wrongly worded with its own threshold number instead of the real 5 days
// left. Stopping at the first (smallest) match and wording the message from
// the actual daysLeft, not the bucket's offsetDays, fixes both problems.
const OFFSET_DAYS_ASC = [1, 7, 14];
const TYPE = NOTIFICATION_TYPES.SCHOLARSHIP_DEADLINE;
const WHATSAPP_TEMPLATE = "scholarship_deadline_reminder";

function emailBody(user, live, daysLeft) {
  const dayWord = daysLeft === 1 ? "day" : "days";
  const deadlineText = new Date(live.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const text = `Hi ${user.firstName},\n\nThe deadline for "${live.title}" is in ${daysLeft} ${dayWord} (${deadlineText}). ${
    live.applicationUrl ? `Apply here: ${live.applicationUrl}` : "Check My School Placement for the application link."
  }\n\nYou're getting this because you saved this scholarship. Manage your reminder settings under Profile.`;
  const html = `<p>Hi ${user.firstName},</p><p>The deadline for <strong>${live.title}</strong> is in ${daysLeft} ${dayWord} (${deadlineText}).</p>${
    live.applicationUrl ? `<p><a href="${live.applicationUrl}">Apply here</a></p>` : ""
  }<p style="color:#666;font-size:13px">You're getting this because you saved this scholarship. Manage your reminder settings under Profile.</p>`;
  return { text, html };
}

// Re-fetches each saved scholarship's *live* deadline from scholarship-service
// rather than trusting SavedScholarship's own snapshot -- so if an admin
// pushes back a deadline, the reminder schedule follows automatically (the
// dedupeKey embeds the live deadline, so a changed deadline naturally resets
// which offsets have already fired).
async function run() {
  const saved = await SavedScholarship.find().populate("student");
  let sentCount = 0;

  for (const entry of saved) {
    const user = entry.student;
    if (!user) continue;

    let live;
    try {
      const result = await scholarshipClient.getScholarship(entry.scholarshipId);
      live = result.data;
    } catch (err) {
      if (err.statusCode === 404) continue; // deleted upstream since saved -- skip silently, per plan
      logger.warn("Scholarship deadline reminder: could not refresh scholarship", {
        scholarshipId: entry.scholarshipId,
        error: err.message,
      });
      continue;
    }

    if (!live?.deadline) continue;
    const daysLeft = daysUntil(live.deadline);
    if (daysLeft < 0) continue;

    for (const offsetDays of OFFSET_DAYS_ASC) {
      if (daysLeft > offsetDays) continue;
      const dedupeKey = `scholarship:${entry._id}:${offsetDays}:${live.deadline}`;
      const { text, html } = emailBody(user, live, daysLeft);
      sentCount += await notifyStudent(user, {
        type: TYPE,
        dedupeKey,
        email: { subject: `${live.title} — deadline in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`, text, html },
        whatsapp: { templateName: WHATSAPP_TEMPLATE, params: [user.firstName, live.title, String(daysLeft), live.deadline] },
      });
      break;
    }
  }

  return sentCount;
}

module.exports = { run };
