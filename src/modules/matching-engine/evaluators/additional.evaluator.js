/**
 * Additional requirements the student data model does not yet collect enough
 * information to verify (Post-UTME performance, date of birth, Direct Entry
 * documents). These are surfaced as warnings/notes rather than mandatory
 * pass/fail conditions, so the platform never silently claims certainty it
 * does not have.
 */
function evaluateAdditional(additionalRule) {
  const warnings = [];
  const rule = additionalRule || {};

  if (rule.postUtmeRequired) {
    warnings.push(
      rule.postUtmeMinimumScore
        ? `This programme requires a Post-UTME screening (recorded minimum: ${rule.postUtmeMinimumScore}); Post-UTME performance was not assessed here.`
        : "This programme requires a Post-UTME screening; Post-UTME performance was not assessed here."
    );
  }

  if (rule.minimumAge) {
    warnings.push(`This programme has a minimum age requirement of ${rule.minimumAge}; age was not verified in this assessment.`);
  }

  for (const note of rule.programmeSpecific || []) {
    warnings.push(`Additional requirement: ${note}`);
  }

  if (rule.notes) {
    warnings.push(rule.notes);
  }

  return { warnings };
}

module.exports = { evaluateAdditional };
