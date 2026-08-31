/**
 * One-time (re-runnable) pass that sets metadata.competitivenessIndex on
 * Programme records based on a hand-curated 3-tier course classification —
 * NOT the same list as apply-subject-profiles.js's 14 subject-combination
 * categories, though it reuses the same keyword-matching approach. A course's
 * subject combination and its admission competitiveness are different axes:
 * Medicine and Nursing share an O'Level/UTME subject profile but sit in
 * different competitiveness tiers, so this needs its own classification.
 *
 * Tiers (best-effort general knowledge, not verified admission-ratio data —
 * same "sanity-check before treating as authoritative" caveat as
 * apply-competitiveness-tiers.js):
 *
 *   Tier 1 (0.9)  — Medicine & Surgery / Dentistry, Law, Petroleum &
 *                   Petrochemical Engineering. The small set of courses with
 *                   nationally-recognised, unusually high cutoffs.
 *   Tier 2 (0.6)  — Other professional/STEM courses: Engineering (all other
 *                   disciplines), Computing, Architecture & Built Environment,
 *                   Pharmacy, Nursing & Allied Health, Physical Sciences,
 *                   Accounting/Finance/Banking/Actuarial Science.
 *   Tier 3 (0.3)  — Other biological sciences, social sciences and education:
 *                   Life Sciences, Agriculture & Environment, Social Sciences,
 *                   Education, general Business/Management/Economics, Mass
 *                   Communication, Arts/Humanities/Languages.
 *
 * This combines with the offering institution's own competitivenessIndex (see
 * apply-competitiveness-tiers.js) in the matching engine and the admission
 * rule generator — see COMPETITIVENESS_BLEND_WEIGHTS in src/config/constants.js.
 *
 * Unlike Institution.metadata.competitivenessIndex, this value has no manual-
 * override lock: it is purely an internal generation/scoring input, not a
 * number admins edit directly. The actual manual override in this system is
 * per institution+course: an admin editing a DRAFT AdmissionRule's own
 * utme.minimumScore with the university's real published cutoff (see
 * admissionRule.service.js) — that already takes precedence over anything
 * this script or the auto-generator computes, once published and verified.
 *
 * Usage: node scripts/tiers/apply-course-tiers.js [--dry-run]
 */

const { connectDb, disconnectDb } = require("../../src/config/db");
const { Programme } = require("../../src/models");
const logger = require("../../src/config/logger");

const DRY_RUN = process.argv.includes("--dry-run");

// Ordered, most specific first — Petroleum/Petrochemical Engineering must be
// tested before the generic "engineering" pattern in Tier 2.
const TIER_1 = [
  { label: "Medicine & Surgery / Dentistry", test: /medicine|surgery|dentistry|dental/i },
  { label: "Law", test: /\blaw\b|jurisprudence/i },
  { label: "Petroleum & Petrochemical Engineering", test: /petroleum|petrochemical/i },
];

const TIER_2 = [
  { label: "Engineering (other disciplines)", test: /engineering/i },
  { label: "Computing", test: /computer|software|cyber ?security|information technology|data science|artificial intelligence/i },
  { label: "Architecture & Built Environment", test: /architecture|building|quantity surv|estate management|urban.*plan|surveying/i },
  { label: "Pharmacy", test: /pharmac/i },
  { label: "Nursing & Allied Health", test: /nursing|physiotherapy|medical laboratory|radiography|public health|physiology|anatomy/i },
  { label: "Physical Sciences", test: /\bphysics\b|\bchemistry\b|\bmathematics\b|statistics|\bgeology\b|geophysics/i },
  { label: "Accounting, Finance & Banking", test: /accounting|banking|finance|actuarial|insurance/i },
];

const TIER_3 = [
  { label: "Life Sciences", test: /biochemistry|microbiology|botany|zoology|genetics|biotechnology|molecular biology|plant science/i },
  { label: "Agriculture & Environment", test: /agric|forestry|fisher|animal (science|production)|crop production|wildlife/i },
  { label: "Social Sciences", test: /sociology|political science|psychology|criminology|international relations|social work/i },
  { label: "Education", test: /education/i },
  { label: "Business, Management & Economics", test: /business admin|management|marketing|procurement|entrepreneur|\beconomics\b/i },
  { label: "Mass Communication & Media", test: /mass comm|journalism|media studies|broadcasting|theatre|film/i },
  { label: "Arts, Humanities & Languages", test: /\barts?\b|language|linguistic|religious studies|\bhistory\b|literature|philosophy/i },
];

// Faculty-level fallback for programmes whose name doesn't match any keyword
// above (compound/local-language combos JAMB's catalog is full of).
const FACULTY_FALLBACK = [
  { test: /^law$/i, index: 0.9 },
  { test: /medical|med.*pharm|health/i, index: 0.6 },
  { test: /engineering/i, index: 0.6 },
  { test: /^sciences?$/i, index: 0.6 },
  { test: /agriculture/i, index: 0.3 },
  { test: /social sciences/i, index: 0.3 },
  { test: /administration/i, index: 0.3 },
  { test: /education/i, index: 0.3 },
  { test: /arts/i, index: 0.3 },
];

// Unclassified programmes default to Tier 3 (0.3) rather than the matching
// engine's neutral fallback — an unrecognised course name is far more likely
// to be a niche/general course than a hidden Tier 1 professional course.
const DEFAULT_INDEX = 0.3;

const EXCLUDE_PATTERN = /delete me test/i;

function indexFor(programme) {
  if (EXCLUDE_PATTERN.test(programme.name)) return null;

  const name = programme.name || "";
  for (const { test } of TIER_1) if (test.test(name)) return 0.9;
  for (const { test } of TIER_2) if (test.test(name)) return 0.6;
  for (const { test } of TIER_3) if (test.test(name)) return 0.3;

  const faculty = programme.faculty || "";
  for (const fallback of FACULTY_FALLBACK) {
    if (fallback.test.test(faculty)) return fallback.index;
  }

  return DEFAULT_INDEX;
}

async function run() {
  await connectDb();
  logger.info(`Applying course competitiveness tiers${DRY_RUN ? " (dry run)" : ""}`);

  const programmes = await Programme.find({}, { name: 1, faculty: 1, metadata: 1 });
  const stats = { updated: 0, excluded: 0, unchanged: 0 };
  const byTier = new Map();

  for (const programme of programmes) {
    const index = indexFor(programme);
    if (index === null) {
      stats.excluded += 1;
      continue;
    }
    byTier.set(index, (byTier.get(index) || 0) + 1);

    if (programme.metadata?.competitivenessIndex === index) {
      stats.unchanged += 1;
      continue;
    }

    logger.info(`  ${programme.name} -> ${index} (faculty: ${programme.faculty || "n/a"})`);
    stats.updated += 1;
    if (!DRY_RUN) {
      await Programme.updateOne({ _id: programme._id }, { $set: { "metadata.competitivenessIndex": index } });
    }
  }

  logger.info("Course tier assignment complete", stats);
  logger.info("By tier:", Object.fromEntries(byTier));
  await disconnectDb();
}

run().catch((err) => {
  logger.error("Course tier assignment failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
