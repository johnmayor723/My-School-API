const { Schema, model } = require("mongoose");
const { OTP_CHANNEL, PARENT_CONSENT_STATUS } = require("../config/constants");

// One record per student who signed up under MINIMUM_CONSENT_AGE. Created by
// parentConsent.service.js#initiate at sign-up time, flipped to VERIFIED by
// #verify once the parent proves control of their own email/phone via OTP.
const parentConsentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    parentName: { type: String, required: true, trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },
    parentPhone: { type: String, trim: true },
    channel: { type: String, enum: Object.values(OTP_CHANNEL), required: true },
    status: { type: String, enum: Object.values(PARENT_CONSENT_STATUS), default: PARENT_CONSENT_STATUS.PENDING },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parentConsentSchema.pre("validate", function requireContact(next) {
  if (!this.parentEmail && !this.parentPhone) {
    return next(new Error("A parent email or phone number is required"));
  }
  next();
});

module.exports = model("ParentConsent", parentConsentSchema);
