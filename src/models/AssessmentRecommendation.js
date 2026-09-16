const { Schema, model } = require("mongoose");
const { MATCH_CATEGORY, ELIGIBILITY_STATUS, CATCHMENT_STATUS } = require("../config/constants");

const assessmentRecommendationSchema = new Schema(
  {
    assessment: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },
    institution: { type: Schema.Types.ObjectId, ref: "Institution", required: true },
    programme: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    admissionRule: { type: Schema.Types.ObjectId, ref: "AdmissionRule" },

    matchScore: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, enum: Object.values(MATCH_CATEGORY), required: true },
    eligibility: { type: String, enum: Object.values(ELIGIBILITY_STATUS), required: true },

    reasons: { type: [String], default: [] },
    failedRequirements: { type: [String], default: [] },
    warnings: { type: [String], default: [] },

    // Informational only — never affects matchScore/category/eligibility above.
    catchmentStatus: { type: String, enum: Object.values(CATCHMENT_STATUS), default: CATCHMENT_STATUS.UNKNOWN },
    catchmentReason: { type: String },

    isAlternativeProgramme: { type: Boolean, default: false },
    rank: { type: Number },
  },
  { timestamps: true }
);

assessmentRecommendationSchema.index({ assessment: 1, matchScore: -1 });
assessmentRecommendationSchema.index({ institution: 1 });
assessmentRecommendationSchema.index({ programme: 1 });
assessmentRecommendationSchema.index({ category: 1 });

module.exports = model("AssessmentRecommendation", assessmentRecommendationSchema);
