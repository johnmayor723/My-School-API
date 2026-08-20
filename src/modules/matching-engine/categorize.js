const { MATCH_CATEGORY, ELIGIBILITY_STATUS, MATCH_SCORE_THRESHOLDS } = require("../../config/constants");

/**
 * A student who fails a mandatory requirement is never presented as a strong
 * or possible match, regardless of the numeric score.
 */
function categorize(score, { mandatoryFailure }) {
  if (mandatoryFailure) return MATCH_CATEGORY.NOT_CURRENTLY_SUITABLE;
  if (score >= MATCH_SCORE_THRESHOLDS.STRONG_MATCH) return MATCH_CATEGORY.STRONG_MATCH;
  if (score >= MATCH_SCORE_THRESHOLDS.POSSIBLE_MATCH) return MATCH_CATEGORY.POSSIBLE_MATCH;
  if (score >= MATCH_SCORE_THRESHOLDS.BORDERLINE) return MATCH_CATEGORY.BORDERLINE;
  return MATCH_CATEGORY.NOT_CURRENTLY_SUITABLE;
}

function mapEligibility(category, { mandatoryFailure, hasSufficientData }) {
  if (!hasSufficientData) return ELIGIBILITY_STATUS.INSUFFICIENT_INFORMATION;
  if (mandatoryFailure) return ELIGIBILITY_STATUS.NOT_CURRENTLY_ELIGIBLE;
  if (category === MATCH_CATEGORY.STRONG_MATCH || category === MATCH_CATEGORY.POSSIBLE_MATCH) {
    return ELIGIBILITY_STATUS.LIKELY_ELIGIBLE_BASED_ON_RECORDED_RULES;
  }
  if (category === MATCH_CATEGORY.BORDERLINE) return ELIGIBILITY_STATUS.POSSIBLY_ELIGIBLE;
  return ELIGIBILITY_STATUS.NOT_CURRENTLY_ELIGIBLE;
}

module.exports = { categorize, mapEligibility };
