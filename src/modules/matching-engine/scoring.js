const { MATCH_SCORE_WEIGHTS } = require("../../config/constants");

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function scoreUtmeScoreComponent(utmeScoreResult) {
  if (!utmeScoreResult.hasData) return 0;
  const { studentScore, minimumScore } = utmeScoreResult;
  if (utmeScoreResult.passed) {
    // Baseline 70% of the weight just for clearing the bar; the remaining 30%
    // scales in as the student's score comfortably exceeds the minimum.
    const margin = clamp((studentScore - minimumScore) / Math.max(minimumScore * 0.3, 1));
    return MATCH_SCORE_WEIGHTS.utmeScore * (0.7 + 0.3 * margin);
  }
  // Partial credit for scoring instructive results, capped well below "passed".
  const ratio = clamp(studentScore / Math.max(minimumScore, 1), 0, 1);
  return MATCH_SCORE_WEIGHTS.utmeScore * ratio * 0.5;
}

function scoreUtmeSubjectsComponent(utmeSubjectsResult) {
  if (!utmeSubjectsResult.hasData) return 0;
  const fraction = utmeSubjectsResult.passed ? 1 : clamp(utmeSubjectsResult.matchedFraction || 0);
  return MATCH_SCORE_WEIGHTS.utmeSubjects * fraction;
}

function scoreOlevelComponent(olevelResult) {
  if (!olevelResult.hasData) return 0;
  if (olevelResult.passed) return MATCH_SCORE_WEIGHTS.olevel;
  const subjectFraction = olevelResult.requiredSubjectsCount
    ? olevelResult.satisfiedSubjectsCount / olevelResult.requiredSubjectsCount
    : 0;
  const creditFraction = olevelResult.requiredCredits
    ? clamp(olevelResult.totalCredits / olevelResult.requiredCredits)
    : 0;
  const fraction = clamp((subjectFraction + creditFraction) / 2);
  return MATCH_SCORE_WEIGHTS.olevel * fraction * 0.6;
}

function scorePreferencesComponent(preferenceMatchRatio) {
  // A student with no stated preferences is not penalised — full weight, neutral.
  return MATCH_SCORE_WEIGHTS.preferences * clamp(preferenceMatchRatio ?? 1);
}

function scoreCompetitivenessComponent(competitivenessIndex) {
  // No reliable competitiveness data is invented — absent data scores a neutral value.
  const value = typeof competitivenessIndex === "number" ? 1 - clamp(competitivenessIndex) : 0.7;
  return MATCH_SCORE_WEIGHTS.competitiveness * value;
}

function computeScore({ utmeScoreResult, utmeSubjectsResult, olevelResult, preferenceMatchRatio, competitivenessIndex }) {
  const total =
    scoreUtmeScoreComponent(utmeScoreResult) +
    scoreUtmeSubjectsComponent(utmeSubjectsResult) +
    scoreOlevelComponent(olevelResult) +
    scorePreferencesComponent(preferenceMatchRatio) +
    scoreCompetitivenessComponent(competitivenessIndex);

  return Math.round(clamp(total, 0, 100));
}

function computePreferenceMatchRatio(institution, preferences) {
  const wantedStates = preferences?.states || [];
  const wantedTypes = preferences?.institutionTypes || [];
  const wantedOwnership = preferences?.ownership || [];

  const criteria = [];
  if (wantedStates.length) criteria.push(wantedStates.includes(institution.state));
  if (wantedTypes.length) criteria.push(wantedTypes.includes(institution.institutionType));
  if (wantedOwnership.length) criteria.push(wantedOwnership.includes(institution.ownership));

  if (criteria.length === 0) return 1; // no stated preference => neutral, not penalised
  return criteria.filter(Boolean).length / criteria.length;
}

module.exports = { computeScore, computePreferenceMatchRatio, MATCH_SCORE_WEIGHTS };
