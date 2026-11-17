const { Schema, model } = require("mongoose");

// Ledger of inbound ProvidusBank "Settlement Notification" webhook calls.
// Exists purely so handleProvidusSettlementNotification can dedupe on
// settlementId (per the bank's spec: "check for duplicate using settlement
// id, not session id") -- SessionPass itself has no notion of a bank
// settlement, a single SessionPass could in principle receive retried or
// duplicate notifications for the same virtual-account funding event.
const providusSettlementLogSchema = new Schema(
  {
    settlementId: { type: String, required: true, unique: true },
    accountNumber: { type: String, required: true },
    sessionPass: { type: Schema.Types.ObjectId, ref: "SessionPass" },
    responseCode: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = model("ProvidusSettlementLog", providusSettlementLogSchema);
