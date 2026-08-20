const { AssessmentRecommendation, Institution } = require("../models");
const assessmentService = require("./assessment.service");

async function compare(assessmentId, institutionIds, requestingUser) {
  const { assessment } = await assessmentService.getRecommendations(assessmentId, requestingUser);

  const recommendations = await AssessmentRecommendation.find({
    assessment: assessmentId,
    institution: { $in: institutionIds },
  })
    .populate("institution", "name slug state ownership institutionType metadata")
    .populate("programme", "name slug faculty degreeType");

  const byInstitution = new Map(recommendations.map((rec) => [String(rec.institution._id), rec]));

  const missingIds = institutionIds.filter((id) => !byInstitution.has(String(id)));
  const missingInstitutions = missingIds.length
    ? await Institution.find({ _id: { $in: missingIds } }).select("name slug state ownership institutionType")
    : [];

  const rows = institutionIds.map((id) => {
    const rec = byInstitution.get(String(id));
    if (rec) {
      return {
        institution: rec.institution,
        programme: rec.programme,
        matchScore: rec.matchScore,
        category: rec.category,
        eligibility: rec.eligibility,
        reasons: rec.reasons,
        failedRequirements: rec.failedRequirements,
        warnings: rec.warnings,
        hasRecommendation: true,
      };
    }
    const institution = missingInstitutions.find((i) => String(i._id) === String(id));
    return {
      institution: institution || { _id: id },
      programme: null,
      matchScore: null,
      category: null,
      eligibility: null,
      reasons: [],
      failedRequirements: ["No recorded admission rule was found for this institution for the assessed programme and session."],
      warnings: [],
      hasRecommendation: false,
    };
  });

  return { assessmentId, rows };
}

module.exports = { compare };
