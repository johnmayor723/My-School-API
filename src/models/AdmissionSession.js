const { Schema, model } = require("mongoose");
const { ADMISSION_SESSION_STATUS } = require("../config/constants");

const admissionSessionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g. "2026/2027"
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(ADMISSION_SESSION_STATUS),
      default: ADMISSION_SESSION_STATUS.UPCOMING,
    },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

admissionSessionSchema.index({ isActive: 1 });
admissionSessionSchema.index({ status: 1 });

module.exports = model("AdmissionSession", admissionSessionSchema);
