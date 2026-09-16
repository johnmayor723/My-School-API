const { Schema, model } = require("mongoose");
const { CUTOFF_TYPE, CUTOFF_SOURCE_TYPE, CUTOFF_CANDIDATE_STATUS, CUTOFF_CONFIDENCE } = require("../config/constants");

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

/**
 * A single scraped/staged cutoff fact awaiting human review. Nothing here is
 * trusted until an admin approves it into a CutoffRecord — this is the
 * pipeline's "never invent certainty" checkpoint: every field a scraper
 * couldn't resolve confidently (institution match, programme match, session,
 * cutoffType classification) is left null/low-confidence rather than guessed.
 */
const cutoffCandidateSchema = new Schema(
  {
    cutoffType: { type: String, enum: Object.values(CUTOFF_TYPE), required: true },

    rawInstitutionName: { type: String, required: true, trim: true },
    rawProgrammeName: { type: String, trim: true },
    resolvedInstitution: { type: Schema.Types.ObjectId, ref: "Institution" },
    resolvedProgramme: { type: Schema.Types.ObjectId, ref: "Programme" },
    rawAdmissionSessionLabel: { type: String, trim: true },
    admissionSession: { type: Schema.Types.ObjectId, ref: "AdmissionSession" },

    cutoffMark: { type: Number, required: true, min: 0, max: 1000 },
    scale: { type: String, trim: true, default: "UTME/400" },

    confidence: { type: String, enum: Object.values(CUTOFF_CONFIDENCE), required: true },
    normalizationWarnings: { type: [String], default: [] },
    // The original text a number was extracted from, so a reviewer can verify
    // the extraction without re-fetching the source.
    rawExtractionSnippet: { type: String, trim: true },

    // Stable key from cutoffNormalization.buildDedupeKey — used to detect
    // repeat/duplicate candidates across scrape runs.
    dedupeKey: { type: String, required: true },
    source: { type: cutoffSourceSchema, required: true },
    scraperKey: { type: String, trim: true, required: true },

    status: { type: String, enum: Object.values(CUTOFF_CANDIDATE_STATUS), default: CUTOFF_CANDIDATE_STATUS.PENDING },
    reviewNotes: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    promotedRecord: { type: Schema.Types.ObjectId, ref: "CutoffRecord" },
  },
  { timestamps: true }
);

cutoffCandidateSchema.index({ status: 1, createdAt: -1 });
cutoffCandidateSchema.index({ dedupeKey: 1, status: 1 });
cutoffCandidateSchema.index({ resolvedInstitution: 1, resolvedProgramme: 1, cutoffType: 1 });

module.exports = model("CutoffCandidate", cutoffCandidateSchema);
