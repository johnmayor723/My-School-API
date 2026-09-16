const { Schema, model } = require("mongoose");
const {
  ASSESSMENT_STATUS,
  PAYMENT_STATUS_ON_ASSESSMENT,
  OLEVEL_EXAM_TYPES,
  INSTITUTION_TYPE,
  INSTITUTION_OWNERSHIP,
} = require("../config/constants");

const oLevelSubjectSnapshotSchema = new Schema(
  {
    subject: String,
    grade: String,
    examType: { type: String, enum: Object.values(OLEVEL_EXAM_TYPES) },
  },
  { _id: false }
);

// A frozen copy of the student's academic data at the moment the assessment
// was created, so a report generated today stays explainable even if the
// student later edits their profile.
const academicSnapshotSchema = new Schema(
  {
    fullName: String,
    utmeRegNumber: String,
    utmeScore: Number,
    utmeSubjects: [String],
    oLevelSubjects: [oLevelSubjectSnapshotSchema],
    oLevelSittings: Number,
    stateOfOrigin: String,
    residentialState: String,
  },
  { _id: false }
);

const preferencesSchema = new Schema(
  {
    states: { type: [String], default: [] },
    institutionTypes: { type: [String], enum: Object.values(INSTITUTION_TYPE), default: [] },
    ownership: { type: [String], enum: Object.values(INSTITUTION_OWNERSHIP), default: [] },
    maxResults: { type: Number, default: 20, min: 1, max: 100 },
  },
  { _id: false }
);

const previewSummarySchema = new Schema(
  {
    totalPotentialMatches: { type: Number, default: 0 },
    strongMatches: { type: Number, default: 0 },
    possibleMatches: { type: Number, default: 0 },
    borderlineMatches: { type: Number, default: 0 },
    institutionsAwaitingData: { type: Number, default: 0 },
    alternativeOptionsAvailable: { type: Boolean, default: false },
  },
  { _id: false }
);

const assessmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academicSnapshot: { type: academicSnapshotSchema, required: true },
    preferredProgramme: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    admissionSession: { type: Schema.Types.ObjectId, ref: "AdmissionSession", required: true },
    preferences: { type: preferencesSchema, default: () => ({}) },

    status: { type: String, enum: Object.values(ASSESSMENT_STATUS), default: ASSESSMENT_STATUS.PENDING },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS_ON_ASSESSMENT),
      default: PAYMENT_STATUS_ON_ASSESSMENT.UNPAID,
    },

    price: { type: Number, required: true },
    currency: { type: String, required: true },

    previewSummary: { type: previewSummarySchema, default: () => ({}) },
    processingError: { type: String },
    unlockedAt: { type: Date },
  },
  { timestamps: true }
);

assessmentSchema.index({ student: 1, createdAt: -1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ paymentStatus: 1 });

module.exports = model("Assessment", assessmentSchema);
