/**
 * One-off, idempotent pass that sets `zone` on every existing Institution from
 * its current `state`, using the same zoneForState() lookup the model's own
 * pre("validate") hook now runs on every create/update. Safe to re-run —
 * institutions that already have the correct zone are left untouched, and
 * institutions with an unrecognized state are reported rather than guessed at.
 *
 * Usage: node scripts/institutions/backfill-institution-zones.js [--dry-run]
 */

const { connectDb, disconnectDb } = require("../../src/config/db");
const { Institution } = require("../../src/models");
const { zoneForState } = require("../../src/config/geopoliticalZones");
const logger = require("../../src/config/logger");

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
  await connectDb();
  logger.info(`Backfilling Institution.zone${DRY_RUN ? " (dry run)" : ""}...`);

  const institutions = await Institution.find({}).select("name state zone");
  const stats = { updated: 0, unchanged: 0, unrecognizedState: 0 };
  const unrecognized = [];

  for (const institution of institutions) {
    const derivedZone = zoneForState(institution.state);
    if (!derivedZone) {
      stats.unrecognizedState += 1;
      unrecognized.push(`${institution.name} (state: "${institution.state}")`);
      continue;
    }

    if (institution.zone === derivedZone) {
      stats.unchanged += 1;
      continue;
    }

    logger.info(`  ${institution.name}: ${institution.state} -> ${derivedZone}`);
    stats.updated += 1;
    if (!DRY_RUN) {
      await Institution.updateOne({ _id: institution._id }, { $set: { zone: derivedZone } });
    }
  }

  if (unrecognized.length > 0) {
    logger.info(`Unrecognized state values (zone left unset — fix the state field, don't guess): ${unrecognized.join(", ")}`);
  }

  logger.info("Zone backfill complete", stats);
  await disconnectDb();
}

run().catch((err) => {
  logger.error("Zone backfill failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
