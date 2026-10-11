const { NotificationLog } = require("../models");

async function wasSent(userId, type, channel, dedupeKey) {
  const existing = await NotificationLog.findOne({ user: userId, type, channel, dedupeKey });
  return Boolean(existing);
}

// Relies on the schema's unique index as the real race-safety guarantee
// (two near-simultaneous cron runs can't both succeed) -- a duplicate-key
// error here just means "already sent," not a real failure.
async function recordSent(userId, type, channel, dedupeKey) {
  try {
    await NotificationLog.create({ user: userId, type, channel, dedupeKey });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}

module.exports = { wasSent, recordSent };
