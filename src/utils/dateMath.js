// Calendar-day difference (UTC midnight to UTC midnight), not a raw ms/86400000
// division -- so a deadline "tomorrow at 00:05" and "today at 23:55" aren't off
// by a day depending on what time the once-daily cron happens to run.
function daysUntil(date) {
  const target = new Date(date);
  const now = new Date();
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetUTC - nowUTC) / 86400000);
}

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (60 * 60 * 1000);
}

module.exports = { daysUntil, hoursSince };
