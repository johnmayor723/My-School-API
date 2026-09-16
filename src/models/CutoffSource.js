const { Schema, model } = require("mongoose");
const { CUTOFF_SOURCE_TYPE } = require("../config/constants");

/**
 * Registry of scraper/data sources for the Cut-Off Marks Intelligence module.
 * This is a lightweight admin-managed registry, distinct from the per-record
 * provenance snapshot embedded directly on CutoffCandidate/CutoffRecord docs —
 * that snapshot must survive even if this registry doc is later edited or
 * removed, so it is never a bare reference alone.
 */
const cutoffSourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    sourceType: { type: String, enum: Object.values(CUTOFF_SOURCE_TYPE), required: true },
    // Matches a BaseScraper subclass's registration key, e.g. "jamb".
    scraperKey: { type: String, required: true, trim: true, unique: true },
    baseUrl: { type: String, trim: true },
    // Human-maintained record of when robots.txt/ToS were checked and what
    // rate limit was decided on — not automated in the MVP (see Phase 2 backlog).
    robotsPolicyNotes: { type: String, trim: true },
    rateLimitMs: { type: Number, default: 300 },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ["success", "partial", "failed"] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = model("CutoffSource", cutoffSourceSchema);
