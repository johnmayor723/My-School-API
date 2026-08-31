const { Schema, model } = require("mongoose");

/**
 * A curated real UTME cutoff for one programme at one institution tier
 * (see INSTITUTION_TIERS in config/constants.js), e.g. "Medicine at a Tier 1
 * Federal university = 250". scripts/rules/generate-admission-rules.js reads
 * this as its default cutoff source for any institution+programme offering
 * that hasn't been through the normal per-institution admin review workflow —
 * one entry here covers every institution in that tier at once, instead of
 * requiring a manually-set number per institution.
 */
const courseTierCutoffSchema = new Schema(
  {
    programme: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    // One of INSTITUTION_TIERS' index values, not an arbitrary float.
    institutionTier: { type: Number, required: true },
    cutoffMark: { type: Number, required: true, min: 0, max: 400 },
    notes: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

courseTierCutoffSchema.index({ programme: 1, institutionTier: 1 }, { unique: true });

module.exports = model("CourseTierCutoff", courseTierCutoffSchema);
