/**
 * Cut-Off Marks Intelligence: JAMB reference scraper entrypoint.
 *
 * Reads scripts/import/jamb-import.js's already-cached JAMB requirement text
 * (run that script first if scripts/import/cache/requirements/ is empty),
 * extracts candidate numeric cutoffs from it, and stages them as
 * CutoffCandidate documents for admin review. Never writes a trusted
 * CutoffRecord directly — matches the existing platform convention that
 * scraped/imported data always passes through a human review gate.
 *
 * Idempotent: candidate staging keys on dedupeKey + rawExtractionSnippet, so
 * re-running after a partial run or restart doesn't create duplicate PENDING
 * rows (see src/utils/cutoffNormalization.js).
 *
 * Usage: node scripts/cutoffs/jamb-cutoff-scrape.js [--limit=N] [--dry-run] [--session="2026/2027"]
 */
const path = require("path");
const fs = require("fs/promises");
const { connectDb, disconnectDb } = require("../../src/config/db");
const models = require("../../src/models");
const logger = require("../../src/config/logger");
const { CUTOFF_SOURCE_TYPE } = require("../../src/config/constants");
const { JambCutoffScraper } = require("../../src/scrapers/jamb.scraper");

const CACHE_DIR = path.resolve(__dirname, "cache");
const COMPLETE_MARKER = path.join(CACHE_DIR, ".scrape-complete");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;
const SESSION_LABEL = (args.find((a) => a.startsWith("--session=")) || "").split("=")[1] || undefined;

async function ensureCutoffSource() {
  const { CutoffSource } = models;
  const existing = await CutoffSource.findOne({ scraperKey: "jamb" });
  if (existing) return existing;
  return CutoffSource.create({
    name: "JAMB IBASS Brochure API",
    sourceType: CUTOFF_SOURCE_TYPE.OFFICIAL,
    scraperKey: "jamb",
    baseUrl: "https://ibass-api.jamb.gov.ng/api/ibass",
    robotsPolicyNotes:
      "Public IBASS API already used read-only by scripts/import/jamb-import.js with a 300ms throttle and descriptive User-Agent; this scraper reuses that script's cached responses rather than issuing new requests.",
    rateLimitMs: 300,
    isActive: true,
  });
}

async function run() {
  await connectDb();
  logger.info(`Starting JAMB cutoff scrape${DRY_RUN ? " (dry run)" : ""}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ""}`);

  const cutoffSourceDoc = await ensureCutoffSource();
  const scraper = new JambCutoffScraper(cutoffSourceDoc);

  let stats;
  let status = "success";
  try {
    stats = await scraper.run({ limit: LIMIT, dryRun: DRY_RUN, sessionLabel: SESSION_LABEL, models });
  } catch (err) {
    status = "failed";
    throw err;
  } finally {
    if (!DRY_RUN) {
      cutoffSourceDoc.lastRunAt = new Date();
      cutoffSourceDoc.lastRunStatus = status;
      await cutoffSourceDoc.save();
    }
  }

  logger.info("JAMB cutoff scrape complete", stats);
  if (!DRY_RUN && LIMIT === Infinity) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(COMPLETE_MARKER, new Date().toISOString());
  }
  await disconnectDb();
}

run().catch((err) => {
  logger.error("JAMB cutoff scrape failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
