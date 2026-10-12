const { Schema, model } = require("mongoose");
const { ADVISER_ENQUIRY_MESSAGE_AUTHOR } = require("../config/constants");

// In-app chat thread on an AdviserEnquiry -- added 2026-10-12 per a
// mid-build correction: the original plan had staff/student communication
// as email+WhatsApp alerts only, but the actual back-and-forth needs a real
// in-app thread. No websocket/live-push infra exists anywhere in this API
// (see plan doc), so this is a plain REST resource -- clients poll
// GET .../messages, same pattern as ChatMessage (the AI assessment chat).
const adviserEnquiryMessageSchema = new Schema(
  {
    enquiry: { type: Schema.Types.ObjectId, ref: "AdviserEnquiry", required: true },
    author: { type: String, enum: Object.values(ADVISER_ENQUIRY_MESSAGE_AUTHOR), required: true },
    // Which specific user sent it -- matters on the staff side since an
    // enquiry can be reassigned, so "staff" alone wouldn't say who.
    authorUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

adviserEnquiryMessageSchema.index({ enquiry: 1, createdAt: 1 });

module.exports = model("AdviserEnquiryMessage", adviserEnquiryMessageSchema);
