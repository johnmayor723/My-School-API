const { Schema, model } = require("mongoose");
const { OLEVEL_EXAM_TYPES, INSTITUTION_TYPE, INSTITUTION_OWNERSHIP } = require("../config/constants");

const oLevelSubjectSchema = new Schema(
  {
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true, uppercase: true },
    examType: { type: String, enum: Object.values(OLEVEL_EXAM_TYPES), default: OLEVEL_EXAM_TYPES.WAEC },
  },
  { _id: false }
);

const studentProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    fullName: { type: String, required: true, trim: true },
    utmeRegNumber: { type: String, trim: true, uppercase: true },
    utmeScore: { type: Number, min: 0, max: 400 },
    utmeSubjects: { type: [String], default: [] },

    oLevelSubjects: { type: [oLevelSubjectSchema], default: [] },
    oLevelSittings: { type: Number, min: 1, max: 2, default: 1 },

    // JAMB's catchment/ELDS criterion is state of origin, not where the student
    // currently lives — kept distinct from residentialState and from
    // preferredStates (which is where they *want* to study).
    stateOfOrigin: { type: String, trim: true },
    residentialState: { type: String, trim: true },

    preferredProgramme: { type: Schema.Types.ObjectId, ref: "Programme" },
    preferredStates: { type: [String], default: [] },
    preferredInstitutionTypes: {
      type: [String],
      enum: Object.values(INSTITUTION_TYPE),
      default: [],
    },
    preferredOwnership: {
      type: [String],
      enum: Object.values(INSTITUTION_OWNERSHIP),
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model("StudentProfile", studentProfileSchema);
