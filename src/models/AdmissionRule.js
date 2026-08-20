const { Schema, model } = require("mongoose");
const { RULE_STATUS, RULE_SOURCE_TYPE, OLEVEL_EXAM_TYPES, OLEVEL_GRADE_SCALE } = require("../config/constants");

const utmeRequirementSchema = new Schema(
  {
    minimumScore: { type: Number, min: 0, max: 400, required: true },
    requiredSubjects: { type: [String], default: [] },
    // Alternative acceptable subject combinations, each an array of subject names.
    subjectCombinations: { type: [[String]], default: [] },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const olevelRequirementSchema = new Schema(
  {
    minimumCredits: { type: Number, min: 0, max: 9, required: true },
    requiredSubjects: { type: [String], default: [] },
    minimumGrade: { type: String, enum: Object.keys(OLEVEL_GRADE_SCALE), default: "C6" },
    acceptedExaminations: {
      type: [String],
      enum: Object.values(OLEVEL_EXAM_TYPES),
      default: [OLEVEL_EXAM_TYPES.WAEC, OLEVEL_EXAM_TYPES.NECO],
    },
    sittingsAllowed: { type: Number, min: 1, max: 2, default: 2 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const additionalRequirementSchema = new Schema(
  {
    postUtmeRequired: { type: Boolean, default: true },
    postUtmeMinimumScore: { type: Number, min: 0 },
    directEntryAccepted: { type: Boolean, default: false },
    minimumAge: { type: Number, min: 0 },
    programmeSpecific: { type: [String], default: [] },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const sourceSchema = new Schema(
  {
    title: { type: String, trim: true },
    type: { type: String, enum: Object.values(RULE_SOURCE_TYPE), default: RULE_SOURCE_TYPE.OFFICIAL_BROCHURE },
    url: { type: String, trim: true },
    sourceDate: { type: Date },
  },
  { _id: false }
);

const verificationSchema = new Schema(
  {
    lastVerifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const admissionRuleSchema = new Schema(
  {
    institution: { type: Schema.Types.ObjectId, ref: "Institution", required: true },
    programme: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    admissionSession: { type: Schema.Types.ObjectId, ref: "AdmissionSession", required: true },

    status: { type: String, enum: Object.values(RULE_STATUS), default: RULE_STATUS.DRAFT },

    utme: { type: utmeRequirementSchema, required: true },
    olevel: { type: olevelRequirementSchema, required: true },
    additional: { type: additionalRequirementSchema, default: () => ({}) },

    source: { type: sourceSchema, default: () => ({}) },
    verification: { type: verificationSchema, default: () => ({}) },

    reviewApproved: { type: Boolean, default: false },
    reviewNotes: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },

    submittedForReviewAt: { type: Date },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

admissionRuleSchema.index({ institution: 1, programme: 1, admissionSession: 1 });
admissionRuleSchema.index({ status: 1 });
// Only one PUBLISHED rule may exist for a given institution/programme/session at a time.
admissionRuleSchema.index(
  { institution: 1, programme: 1, admissionSession: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: RULE_STATUS.PUBLISHED } }
);

module.exports = model("AdmissionRule", admissionRuleSchema);
