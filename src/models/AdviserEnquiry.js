const { Schema, model } = require("mongoose");
const { ADVISER_ENQUIRY_STATUS } = require("../config/constants");

// Memo item 7 ("Speak to a MACL Adviser") -- see NOTIFICATIONS_AND_ADVISER_PLAN.md
// Part C. No calendar/availability system exists anywhere in this app, so
// preferredCallbackWindow is free text ("weekday evenings"), not real
// scheduling -- a deliberate scope decision, not a placeholder for one.
const adviserEnquirySchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Which university/course/checker/scholarship page the CTA was clicked
    // from, for adviser context -- a free label, not a ref, since the
    // source could be any of several unrelated page types.
    sourcePage: { type: String, required: true, trim: true, maxlength: 200 },
    profileConsent: { type: Boolean, required: true },
    preferredCallbackWindow: { type: String, trim: true, maxlength: 200, default: "" },
    status: { type: String, enum: Object.values(ADVISER_ENQUIRY_STATUS), default: ADVISER_ENQUIRY_STATUS.NEW },
    // Round-robin on creation (see adviserEnquiry.service.js#pickNextAdviser)
    // -- null only when no ADVISER-role staff existed at creation time.
    assignedAdviser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, trim: true, maxlength: 4000, default: "" },
  },
  { timestamps: true }
);

adviserEnquirySchema.index({ status: 1 });
adviserEnquirySchema.index({ assignedAdviser: 1 });
adviserEnquirySchema.index({ student: 1, createdAt: -1 });

module.exports = model("AdviserEnquiry", adviserEnquirySchema);
