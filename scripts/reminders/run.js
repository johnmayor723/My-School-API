const { connectDb, disconnectDb } = require("../../src/config/db");
const logger = require("../../src/config/logger");
const { runAll } = require("../../src/services/reminders");

// Entry point for OS crontab, once daily -- see NOTIFICATIONS_AND_ADVISER_PLAN.md
// Part A for why this is a standalone script rather than an in-process scheduler.
async function run() {
  await connectDb();
  const results = await runAll();
  await disconnectDb();
  logger.info("Reminders run complete", { results });
}

run().catch((err) => {
  logger.error("Reminders run failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
