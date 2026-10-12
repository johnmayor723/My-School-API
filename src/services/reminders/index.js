const scholarshipDeadline = require("./scholarshipDeadline.reminder");
const parentConsent = require("./parentConsent.reminder");
const unpaidAssessment = require("./unpaidAssessment.reminder");
const admissionSessionClosing = require("./admissionSessionClosing.reminder");
const logger = require("../../config/logger");

const REMINDERS = { scholarshipDeadline, parentConsent, unpaidAssessment, admissionSessionClosing };

// One daily pass checking all 4 alert types in sequence -- cheap enough not
// to need separate cron entries per type (see plan doc, Part A). A failure
// in one reminder type doesn't stop the others from running.
async function runAll() {
  const results = {};
  for (const [name, reminder] of Object.entries(REMINDERS)) {
    try {
      results[name] = await reminder.run();
    } catch (err) {
      logger.error(`Reminder pass failed: ${name}`, { error: err.message, stack: err.stack });
      results[name] = { error: err.message };
    }
  }
  return results;
}

module.exports = { runAll };
