const { Institution, InstitutionProgramme, AdmissionRule, Programme } = require("../../models");
const { evaluateUtmeScore, evaluateUtmeSubjects } = require("./evaluators/utme.evaluator");
const { evaluateOlevel } = require("./evaluators/olevel.evaluator");
const { evaluateAdditional } = require("./evaluators/additional.evaluator");
const { computeScore, computePreferenceMatchRatio } = require("./scoring");
const { categorize, mapEligibility } = require("./categorize");
const { MATCH_SCORE_DISCLAIMER, RULE_STATUS, RECORD_STATUS, MATCH_CATEGORY } = require("../../config/constants");

const MAX_ALTERNATIVE_PROGRAMMES = 3;
const MAX_ALTERNATIVE_RESULTS = 10;

async function findOfferingInstitutionIds(programmeId) {
  const offerings = await InstitutionProgramme.find({ programme: programmeId, status: RECORD_STATUS.ACTIVE })
    .select("institution")
    .lean();
  return offerings.map((o) => o.institution);
}

/**
 * Runs the full deterministic evaluation of one published rule against one
 * student's academic snapshot. This — and only this — decides eligibility.
 * Nothing here is inferred by a model; every pass/fail is traceable to a
 * specific stored requirement.
 */
function evaluateAgainstRule(rule, academicSnapshot, preferences, courseCompetitivenessIndex) {
  const utmeScoreResult = evaluateUtmeScore(academicSnapshot.utmeScore, rule.utme);
  const utmeSubjectsResult = evaluateUtmeSubjects(academicSnapshot.utmeSubjects, rule.utme);
  const olevelResult = evaluateOlevel(academicSnapshot.oLevelSubjects, academicSnapshot.oLevelSittings, rule.olevel);
  const additionalResult = evaluateAdditional(rule.additional);

  const mandatoryFailure = !utmeScoreResult.passed || !utmeSubjectsResult.passed || !olevelResult.passed;
  const hasSufficientData = utmeScoreResult.hasData && utmeSubjectsResult.hasData && olevelResult.hasData;

  const preferenceMatchRatio = computePreferenceMatchRatio(rule.institution, preferences);
  const institutionCompetitivenessIndex = rule.institution?.metadata?.competitivenessIndex;

  const matchScore = computeScore({
    utmeScoreResult,
    utmeSubjectsResult,
    olevelResult,
    preferenceMatchRatio,
    institutionCompetitivenessIndex,
    courseCompetitivenessIndex,
  });
  const category = categorize(matchScore, { mandatoryFailure });
  const eligibility = mapEligibility(category, { mandatoryFailure, hasSufficientData });

  const reasons = [];
  const failedRequirements = [];
  for (const result of [utmeScoreResult, utmeSubjectsResult, olevelResult]) {
    if (!result.hasData) {
      failedRequirements.push(result.message);
      continue;
    }
    if (result.passed) reasons.push(result.message);
    else failedRequirements.push(result.message);
  }

  const warnings = [...(olevelResult.warnings || []), ...(additionalResult.warnings || []), MATCH_SCORE_DISCLAIMER];

  return {
    institution: rule.institution?._id || rule.institution,
    admissionRule: rule._id,
    matchScore,
    category,
    eligibility,
    reasons,
    failedRequirements,
    warnings,
  };
}

async function runMatchingForProgramme({ programmeId, admissionSessionId, academicSnapshot, preferences, isAlternativeProgramme = false }) {
  const institutionIds = await findOfferingInstitutionIds(programmeId);
  if (institutionIds.length === 0) {
    return { totalPotentialMatches: 0, institutionsAwaitingData: 0, recommendations: [] };
  }

  // The programme is the same for every rule evaluated in this call, so its
  // own competitiveness index is fetched once here rather than per-rule.
  const [rules, programme] = await Promise.all([
    AdmissionRule.find({
      programme: programmeId,
      admissionSession: admissionSessionId,
      institution: { $in: institutionIds },
      status: RULE_STATUS.PUBLISHED,
    })
      .populate("institution")
      .lean(),
    Programme.findById(programmeId).select("metadata.competitivenessIndex").lean(),
  ]);
  const courseCompetitivenessIndex = programme?.metadata?.competitivenessIndex;

  const recommendations = rules.map((rule) => ({
    ...evaluateAgainstRule(rule, academicSnapshot, preferences, courseCompetitivenessIndex),
    programme: programmeId,
    isAlternativeProgramme,
  }));

  recommendations.sort((a, b) => b.matchScore - a.matchScore);
  recommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  return {
    totalPotentialMatches: institutionIds.length,
    institutionsAwaitingData: Math.max(0, institutionIds.length - rules.length),
    recommendations,
  };
}

/**
 * Entry point for the admission matching engine.
 *
 * 1. Finds institutions offering the preferred programme.
 * 2. Finds applicable PUBLISHED admission rules for the given session.
 * 3-7. Evaluates UTME score, UTME subjects, O'Level results and additional
 *      conditions, recording pass/fail reasons for each.
 * 8-9. Computes a My School Placement match score and category.
 * 10. Returns explainable, ranked recommendations — plus, where the
 *     programme has curated related programmes, a secondary list of
 *     alternative-course matches.
 */
async function runMatching({ academicSnapshot, preferredProgrammeId, admissionSessionId, preferences }) {
  const primary = await runMatchingForProgramme({
    programmeId: preferredProgrammeId,
    admissionSessionId,
    academicSnapshot,
    preferences,
  });

  const programme = await Programme.findById(preferredProgrammeId).select("relatedProgrammes").lean();
  const relatedIds = (programme?.relatedProgrammes || []).slice(0, MAX_ALTERNATIVE_PROGRAMMES);

  let alternativeRecommendations = [];
  for (const relatedId of relatedIds) {
    const alt = await runMatchingForProgramme({
      programmeId: relatedId,
      admissionSessionId,
      academicSnapshot,
      preferences,
      isAlternativeProgramme: true,
    });
    alternativeRecommendations = alternativeRecommendations.concat(alt.recommendations);
  }
  alternativeRecommendations.sort((a, b) => b.matchScore - a.matchScore);
  alternativeRecommendations = alternativeRecommendations.slice(0, MAX_ALTERNATIVE_RESULTS);
  alternativeRecommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  const strongMatches = primary.recommendations.filter((r) => r.category === MATCH_CATEGORY.STRONG_MATCH).length;
  const possibleMatches = primary.recommendations.filter((r) => r.category === MATCH_CATEGORY.POSSIBLE_MATCH).length;
  const borderlineMatches = primary.recommendations.filter((r) => r.category === MATCH_CATEGORY.BORDERLINE).length;

  return {
    totalPotentialMatches: primary.totalPotentialMatches,
    institutionsAwaitingData: primary.institutionsAwaitingData,
    strongMatches,
    possibleMatches,
    borderlineMatches,
    recommendations: primary.recommendations,
    alternativeRecommendations,
    alternativeOptionsAvailable: alternativeRecommendations.length > 0,
  };
}

module.exports = { runMatching, evaluateAgainstRule };
