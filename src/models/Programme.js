const { Schema, model } = require("mongoose");
const { slugify } = require("../utils/slugify");
const { DEGREE_TYPE, RECORD_STATUS } = require("../config/constants");

const programmeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    alternativeNames: { type: [String], default: [] },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    degreeType: { type: String, enum: Object.values(DEGREE_TYPE), default: DEGREE_TYPE.BACHELOR },
    status: { type: String, enum: Object.values(RECORD_STATUS), default: RECORD_STATUS.ACTIVE },
    // Curated by admins — powers "alternative course" discovery in the matching engine.
    relatedProgrammes: [{ type: Schema.Types.ObjectId, ref: "Programme" }],
    // General O'Level/UTME subject pattern for this course by category (e.g. all
    // "Medicine & Surgery" programmes share the same JAMB combination nationally).
    // Not institution-specific — drives course-discovery filtering and seeds the
    // per-institution AdmissionRule generator; individual rules still carry their
    // own institution-verified requirements once published.
    subjectProfile: {
      olevelRequiredSubjects: { type: [String], default: [] },
      olevelMinimumCredits: { type: Number, min: 0, max: 9, default: 5 },
      utmeRequiredSubjects: { type: [String], default: [] },
    },
    metadata: {
      // 0..1 indicator of the course's own admission competitiveness
      // (Medicine/Law/Petroleum Engineering score high; general Arts/Education
      // score low), independent of any offering institution's own
      // competitivenessIndex. Assigned by scripts/tiers/apply-course-tiers.js;
      // an internal input to cutoff generation and live scoring, not something
      // admins edit directly — the actual per-institution cutoff an admin sets
      // by hand lives on AdmissionRule.utme.minimumScore instead.
      competitivenessIndex: { type: Number, min: 0, max: 1 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

programmeSchema.index({ name: "text", alternativeNames: "text" });
programmeSchema.index({ faculty: 1 });
programmeSchema.index({ status: 1 });

programmeSchema.pre("validate", function preValidate(next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

module.exports = model("Programme", programmeSchema);
