const { Schema, model } = require("mongoose");

// Generic dedup/audit log for every scheduled or event-triggered
// notification across the app (reminders, adviser alerts, etc.) -- one
// shared collection rather than bolting ad hoc "already sent" fields onto
// each model that can trigger a notification. dedupeKey design is per
// notification type; see NOTIFICATIONS_AND_ADVISER_PLAN.md Part A/B for the
// key shapes (e.g. "scholarship:<savedId>:<offsetDays>:<deadlineISO>").
const notificationLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    // "sms" covers the parent-consent reminder, which sends to whichever
    // channel the parent originally chose (email or phone/SMS) -- never
    // WhatsApp, since ParentConsent has no WhatsApp consent flow of its own.
    channel: { type: String, enum: ["email", "whatsapp", "sms"], required: true },
    dedupeKey: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// A given (type, channel, dedupeKey) should only ever be logged once per
// user -- this is the actual dedup guarantee, enforced at the DB level so a
// race between two cron runs can't double-send.
notificationLogSchema.index({ user: 1, type: 1, channel: 1, dedupeKey: 1 }, { unique: true });

module.exports = model("NotificationLog", notificationLogSchema);
