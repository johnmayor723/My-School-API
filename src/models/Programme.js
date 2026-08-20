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
