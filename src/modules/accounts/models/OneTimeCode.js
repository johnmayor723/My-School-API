const { Schema, model } = require("mongoose");
const { OTP_CHANNEL, OTP_PURPOSE } = require("../../../config/constants");

const oneTimeCodeSchema = new Schema(
  {
    identifier: { type: String, required: true, trim: true, lowercase: true },
    channel: { type: String, enum: Object.values(OTP_CHANNEL), required: true },
    purpose: { type: String, enum: Object.values(OTP_PURPOSE), required: true },
    codeHash: { type: String, required: true },
    // Null for sign-up codes, since no User exists yet at request time.
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

oneTimeCodeSchema.index({ identifier: 1, purpose: 1, consumedAt: 1, createdAt: -1 });
// Self-cleans expired codes the same way RefreshToken does.
oneTimeCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("OneTimeCode", oneTimeCodeSchema);
