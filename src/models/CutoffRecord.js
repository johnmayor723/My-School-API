const { Schema, model } = require("mongoose");
const { CUTOFF_TYPE, CUTOFF_SOURCE_TYPE } = require("../config/constants");

// Kept local to this file rather than shared/imported, matching AdmissionRule's
// own locally-defined sourceSchema — each model stays self-contained.
const cutoffSourceSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true },
    type: { type: String, enum: Object.values(CUTOFF_SOURCE_TYPE), required: true },
    retrievedAt: { type: Date, required: true },
    sourceRef: { type: Schema.Types.ObjectId, ref: "CutoffSource" },
  },
  { _id: false }
);

const verificationSchema = new Schema(
  {
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * A published, typed cutoff fact — the module's actual deliverable. Distinct
 * from AdmissionRule (which stays a single utme.minimumScore used by the
 * matching engine): a CutoffRecord captures one specific cutoffType for one
 * institution/programme/session, so institutional_minimum, departmental_cutoff,
 * catchment_cutoff etc. can all coexist as separate, never-mixed records for
 * the same offering. Superseded records are kept (isCurrent: false) rather
 * than deleted, so the historical trend UI has something to render.
 */
const cutoffRecordSchema = new Schema(
  {
    cutoffType: { type: String, enum: Object.values(CUTOFF_TYPE), required: true },
    // Unset only for NATIONAL_JAMB_MINIMUM (not tied to one institution).
    institution: { type: Schema.Types.ObjectId, ref: "Institution" },
    // Unset for institution-wide types (e.g. institutional_minimum).
    programme: { type: Schema.Types.ObjectId, ref: "Programme" },
    admissionSession: { type: Schema.Types.ObjectId, ref: "AdmissionSession", required: true },

    cutoffMark: { type: Number, required: true, min: 0, max: 1000 },
    scale: { type: String, trim: true, default: "UTME/400" },

    source: { type: cutoffSourceSchema, required: true },
    verification: { type: verificationSchema, default: () => ({}) },

    isCurrent: { type: Boolean, default: true },
    supersedes: { type: Schema.Types.ObjectId, ref: "CutoffRecord" },

    promotedFromCandidate: { type: Schema.Types.ObjectId, ref: "CutoffCandidate" },
    promotedToAdmissionRule: { type: Boolean, default: false },
    promotedToAdmissionRuleAt: { type: Date },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cutoffRecordSchema.index({ institution: 1, programme: 1, cutoffType: 1, admissionSession: 1 });
// Only one current record per institution/programme/cutoffType/session — mirrors
// AdmissionRule's one-PUBLISHED-per-offering partial-unique-index pattern.
cutoffRecordSchema.index(
  { institution: 1, programme: 1, cutoffType: 1, admissionSession: 1, isCurrent: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

module.exports = model("CutoffRecord", cutoffRecordSchema);
