const { Schema, model } = require("mongoose");

// A student's bookmark of a scholarship that lives in the separate
// scholarship-service (SQLite), not this app's MongoDB -- scholarshipId is a
// plain string (scholarship-service's sha256-derived id), not a Mongoose ref.
// title/deadline/applicationUrl are a snapshot taken at save time so a saved
// list still shows something useful if the source record is later edited or
// deleted (scholarship-service's admin DELETE can remove it outright).
const savedScholarshipSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scholarshipId: { type: String, required: true },
    title: { type: String, required: true },
    deadline: { type: String, default: null },
    applicationUrl: { type: String, default: null },
  },
  { timestamps: true }
);

savedScholarshipSchema.index({ student: 1, scholarshipId: 1 }, { unique: true });

module.exports = model("SavedScholarship", savedScholarshipSchema);
