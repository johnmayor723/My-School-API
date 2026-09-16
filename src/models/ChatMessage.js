const { Schema, model } = require("mongoose");
const { CHAT_ROLE } = require("../config/constants");

const chatMessageSchema = new Schema(
  {
    assessment: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },
    role: { type: String, enum: Object.values(CHAT_ROLE), required: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ assessment: 1, createdAt: 1 });

module.exports = model("ChatMessage", chatMessageSchema);
