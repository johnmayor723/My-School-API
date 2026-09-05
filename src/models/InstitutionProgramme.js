const { Schema, model } = require("mongoose");
const { RECORD_STATUS } = require("../config/constants");

// The offering relationship: which institutions actually run which programmes.
// Kept independent of AdmissionRule so "this university offers this course" can
// be known/discoverable even before a rule for a given admission session has
// been published.
const institutionProgrammeSchema = new Schema(
  {
    institution: { type: Schema.Types.ObjectId, ref: "Institution", required: true },
    programme: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    status: { type: String, enum: Object.values(RECORD_STATUS), default: RECORD_STATUS.ACTIVE },
    // Real per-offering subject requirements parsed from JAMB's own published
    // brochure text for this exact institution+programme (see
    // scripts/rules/parse-jamb-requirements.js), as opposed to
    // Programme.subjectProfile's generic same-for-every-institution guess.
    // Left unset where the cached JAMB text was empty or nothing parseable
    // was found — the rule generator falls back to subjectProfile in that case.
    jambRequirements: {
      // Each combination already includes "English Language" (UTME-compulsory,
      // routinely omitted from JAMB's own text) and represents one acceptable
      // set of subjects; multiple entries exist where the source text offered
      // "X or Y" alternatives for a slot.
      utmeSubjectCombinations: { type: [[String]], default: undefined },
      olevelRequiredSubjects: { type: [String], default: undefined },
      olevelMinimumCredits: { type: Number, min: 0, max: 9 },
      parsedAt: { type: Date },
      rawSubjectsText: { type: String, trim: true },
      rawUtmeRequirementsText: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

institutionProgrammeSchema.index({ institution: 1, programme: 1 }, { unique: true });
institutionProgrammeSchema.index({ programme: 1, status: 1 });

module.exports = model("InstitutionProgramme", institutionProgrammeSchema);
