/**
 * Bulk-seeds PUBLISHED AdmissionRule documents for every active
 * InstitutionProgramme offering, so the matching engine actually has
 * something to evaluate against. Without this, the Draft->Review->Approved->
 * Published workflow and the matching engine are both fully built but sit on
 * an almost-empty AdmissionRule collection.
 *
 * Each rule combines:
 *  - the offering programme's subjectProfile (see apply-subject-profiles.js)
 *    for O'Level/UTME subject requirements, and
 *  - the offering institution's metadata.competitivenessIndex tier for a
 *    UTME minimum-score cutoff.
 *
 * This is a general JAMB-pattern default, not institution-verified data —
 * the same "best-effort, not authoritative" caveat already used for
 * competitiveness tiers. Every generated rule records that plainly in its
 * source/verification fields so it reads as a starting point, not a
 * confirmed requirement, and admins can edit/republish any individual rule
 * from the admin console same as any other rule.
 *
 * Existing PUBLISHED rules are left untouched (idempotent, safe to re-run
 * after new institutions/programmes are added).
 *
 * Usage: node scripts/rules/generate-admission-rules.js [--dry-run] [--session="2026/2027"]
 */

const { connectDb, disconnectDb } = require("../../src/config/db");
const { Institution, InstitutionProgramme, Programme, AdmissionSession, AdmissionRule } = require("../../src/models");
const logger = require("../../src/config/logger");
const { RULE_STATUS, RULE_SOURCE_TYPE, RECORD_STATUS } = require("../../src/config/constants");

const DRY_RUN = process.argv.includes("--dry-run");
const SESSION_ARG = process.argv.find((a) => a.startsWith("--session="))?.split("=")[1];

const GENERATED_NOTE =
  "Auto-generated from a general JAMB subject-combination pattern by course category and the institution's " +
  "competitiveness tier. Not institution-verified — review and replace with the university's actual published " +
  "requirements when available.";

function utmeCutoffFor(competitivenessIndex) {
  if (competitivenessIndex === undefined || competitivenessIndex === null) return 140;
  if (competitivenessIndex >= 0.9) return 210;
  if (competitivenessIndex >= 0.75) return 190;
  if (competitivenessIndex >= 0.65) return 180;
  if (competitivenessIndex >= 0.55) return 160;
  if (competitivenessIndex >= 0.35) return 150;
  if (competitivenessIndex >= 0.2) return 140;
  return 120;
}

async function resolveSession() {
  if (SESSION_ARG) {
    const named = await AdmissionSession.findOne({ name: SESSION_ARG });
    if (!named) throw new Error(`No admission session named "${SESSION_ARG}"`);
    return named;
  }
  const candidates = await AdmissionSession.find({ isActive: true });
  const real = candidates.filter((s) => !/test/i.test(s.name));
  if (real.length === 1) return real[0];
  if (real.length === 0 && candidates.length > 0) return candidates[0];
  throw new Error(
    `Ambiguous admission session (${candidates.length} active) — pass --session="2026/2027" to pick one explicitly.`
  );
}

async function run() {
  await connectDb();
  logger.info(`Generating admission rules${DRY_RUN ? " (dry run)" : ""}`);

  const session = await resolveSession();
  logger.info(`Target admission session: ${session.name} (${session._id})`);

  const [offerings, institutions, programmes, existingRules] = await Promise.all([
    InstitutionProgramme.find({ status: RECORD_STATUS.ACTIVE }).lean(),
    Institution.find({}, { name: 1, metadata: 1 }).lean(),
    Programme.find({}, { name: 1, subjectProfile: 1 }).lean(),
    AdmissionRule.find({ admissionSession: session._id, status: RULE_STATUS.PUBLISHED }, { institution: 1, programme: 1 }).lean(),
  ]);

  const institutionById = new Map(institutions.map((i) => [String(i._id), i]));
  const programmeById = new Map(programmes.map((p) => [String(p._id), p]));
  const existingKeys = new Set(existingRules.map((r) => `${r.institution}:${r.programme}`));

  const now = new Date();
  const docs = [];
  let skippedExisting = 0;
  let skippedMissingRef = 0;

  for (const offering of offerings) {
    const key = `${offering.institution}:${offering.programme}`;
    if (existingKeys.has(key)) {
      skippedExisting += 1;
      continue;
    }

    const institution = institutionById.get(String(offering.institution));
    const programme = programmeById.get(String(offering.programme));
    if (!institution || !programme) {
      skippedMissingRef += 1;
      continue;
    }

    const profile = programme.subjectProfile || {};
    const olevelSubjects = profile.olevelRequiredSubjects?.length ? profile.olevelRequiredSubjects : ["English Language", "Mathematics"];
    const utmeSubjects = profile.utmeRequiredSubjects?.length ? profile.utmeRequiredSubjects : ["English Language"];
    const minimumScore = utmeCutoffFor(institution.metadata?.competitivenessIndex);

    docs.push({
      institution: offering.institution,
      programme: offering.programme,
      admissionSession: session._id,
      status: RULE_STATUS.PUBLISHED,
      utme: {
        minimumScore,
        requiredSubjects: utmeSubjects,
        subjectCombinations: [utmeSubjects],
      },
      olevel: {
        minimumCredits: profile.olevelMinimumCredits || 5,
        requiredSubjects: olevelSubjects,
        minimumGrade: "C6",
        acceptedExaminations: ["WAEC", "NECO"],
        sittingsAllowed: 2,
      },
      additional: { postUtmeRequired: true },
      source: {
        title: "General JAMB subject-combination pattern (auto-generated)",
        type: RULE_SOURCE_TYPE.OTHER,
        sourceDate: now,
      },
      verification: { notes: GENERATED_NOTE },
      reviewNotes: GENERATED_NOTE,
      submittedForReviewAt: now,
      reviewedAt: now,
      approvedAt: now,
      publishedAt: now,
    });
  }

  logger.info(
    `Prepared ${docs.length} new rules (${skippedExisting} already published, ${skippedMissingRef} with a missing institution/programme reference)`
  );

  if (!DRY_RUN && docs.length > 0) {
    const BATCH = 2000;
    let inserted = 0;
    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      const res = await AdmissionRule.insertMany(batch, { ordered: false });
      inserted += res.length;
      logger.info(`  inserted ${inserted}/${docs.length}`);
    }
  }

  logger.info("Rule generation complete", { created: DRY_RUN ? 0 : docs.length, dryRun: DRY_RUN });
  await disconnectDb();
}

run().catch((err) => {
  logger.error("Rule generation failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
