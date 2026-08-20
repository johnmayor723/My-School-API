/**
 * One-time (re-runnable) pass that sets metadata.competitivenessIndex on
 * Institution records based on a hand-curated tier mapping, not any field
 * JAMB's catalog provides. Matching is by exact institution name — JAMB's
 * import also produces accessory records (Teaching Hospital, Open & Distance
 * Learning Programme, etc.) alongside the real degree-admission institution
 * of the same federal university; those are intentionally left untiered
 * (competitivenessIndex stays unset, matching engine's neutral 0.7 fallback
 * applies) rather than guessed at via substring matching.
 *
 * Usage: node scripts/tiers/apply-competitiveness-tiers.js [--dry-run]
 */

const { connectDb, disconnectDb } = require("../../src/config/db");
const { Institution } = require("../../src/models");
const logger = require("../../src/config/logger");

const DRY_RUN = process.argv.includes("--dry-run");

// Tier 1 (0.90) — first-generation federal universities (1948-1970).
const TIER_1_FEDERAL = [
  "University of Ibadan",
  "University of Nigeria",
  "Obafemi Awolowo University",
  "Ahmadu Bello University",
  "University of Lagos",
  "University of Benin",
];

// Tier 2 (0.75) — second-generation federal universities (1970s).
const TIER_2_FEDERAL = [
  "University of Calabar",
  "University of Ilorin",
  "University of Jos",
  "Usmanu Danfodiyo University",
  "University of Maiduguri",
  "University of Port Harcourt",
  "Bayero University",
];

// 0.65 — well-regarded/selective private universities, named explicitly so
// they aren't flattened into the generic private-university default below.
// Best-effort general-knowledge list, not verified admission-ratio data —
// sanity-check before treating as authoritative.
const ELITE_PRIVATE = [
  "Covenant University",
  "Babcock University",
  "Afe Babalola University",
  "American University of Nigeria",
  "Bowen University",
  "Landmark University",
  "Redeemer's University",
  "Pan-Atlantic University",
];

// Tier 3 (0.55) — early/well-documented state universities, named explicitly
// so they aren't flattened into the generic state-university default (0.35).
// Best-effort short list, not exhaustive — see scoring caveats in memory.
const TIER_3_STATE = [
  "Rivers State University",
  "Enugu State University of Science and Technology",
  "Imo State University",
  "Ambrose Alli University",
  "Lagos State University",
  "Olabisi Onabanjo University",
];

// Accessory/non-admission records JAMB's catalog produces that happen to
// classify as institutionType "university" but aren't real degree-admission
// institutions — left untiered rather than force-fit into a tier.
const EXCLUDE_PATTERN = /teaching hospital|open & distance learning|delete me test/i;

// JAMB's raw catalog is inconsistent about apostrophes, hyphens, and doubled
// whitespace in institution names (e.g. "Usmanu  Danfodiyo University" with a
// double space, "University of Port-Harcourt" hyphenated, "Redeemers
// University" with no apostrophe). Normalize before matching against the
// named lists so those variants don't silently fall through to the generic
// tier defaults below.
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAMED = new Map([
  ...TIER_1_FEDERAL.map((name) => [normalizeName(name), { index: 0.9, label: name }]),
  ...TIER_2_FEDERAL.map((name) => [normalizeName(name), { index: 0.75, label: name }]),
  ...ELITE_PRIVATE.map((name) => [normalizeName(name), { index: 0.65, label: name }]),
  ...TIER_3_STATE.map((name) => [normalizeName(name), { index: 0.55, label: name }]),
]);

function tierFor(institution) {
  if (EXCLUDE_PATTERN.test(institution.name)) return null;
  const named = NAMED.get(normalizeName(institution.name));
  if (named) return named.index;

  if (institution.institutionType === "polytechnic") return 0.2;
  if (institution.institutionType === "college_of_education") return 0.1;
  if (institution.institutionType === "university") {
    if (institution.ownership === "state") return 0.35;
    return 0.55; // federal (not tier 1/2) or private (not elite)
  }
  return null;
}

async function run() {
  await connectDb();
  logger.info(`Applying competitiveness tiers${DRY_RUN ? " (dry run)" : ""}`);

  const institutions = await Institution.find({}, { name: 1, institutionType: 1, ownership: 1, metadata: 1 });
  const stats = { updated: 0, excluded: 0, unchanged: 0, manualSkipped: 0 };
  const foundNames = new Set();

  for (const institution of institutions) {
    const index = tierFor(institution);
    const normalized = normalizeName(institution.name);
    if (NAMED.has(normalized)) foundNames.add(normalized);

    if (institution.metadata?.competitivenessManuallySet) {
      stats.manualSkipped += 1;
      continue;
    }

    if (index === null) {
      if (EXCLUDE_PATTERN.test(institution.name)) stats.excluded += 1;
      continue;
    }

    if (institution.metadata?.competitivenessIndex === index) {
      stats.unchanged += 1;
      continue;
    }

    logger.info(`  ${institution.name} -> ${index} (${institution.institutionType}, ${institution.ownership})`);
    stats.updated += 1;
    if (!DRY_RUN) {
      await Institution.updateOne({ _id: institution._id }, { $set: { "metadata.competitivenessIndex": index } });
    }
  }

  const missing = [...NAMED.entries()]
    .filter(([key]) => !foundNames.has(key))
    .map(([, { label }]) => label);
  if (missing.length > 0) {
    logger.info(`Named-list entries not yet found in DB (re-run after import completes): ${missing.join(", ")}`);
  }

  logger.info("Tier assignment complete", stats);
  await disconnectDb();
}

run().catch((err) => {
  logger.error("Tier assignment failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
