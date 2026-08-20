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
  },
  { timestamps: true }
);

institutionProgrammeSchema.index({ institution: 1, programme: 1 }, { unique: true });
institutionProgrammeSchema.index({ programme: 1, status: 1 });

module.exports = model("InstitutionProgramme", institutionProgrammeSchema);
