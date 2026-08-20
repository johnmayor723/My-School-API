const { Schema, model } = require("mongoose");
const { PAYMENT_STATUS, PAYMENT_PROVIDERS } = require("../config/constants");

const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assessment: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },

    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    provider: { type: String, enum: Object.values(PAYMENT_PROVIDERS), required: true },

    // Our own internally-generated reference — always present, always unique.
    reference: { type: String, required: true, unique: true },
    // The provider's own transaction id/reference, once known.
    providerReference: { type: String, unique: true, sparse: true },

    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },

    authorizationUrl: { type: String },
    channel: { type: String },
    // Raw provider payload minus anything resembling card data — never store PAN/CVV.
    metadata: { type: Schema.Types.Mixed },

    verifiedAt: { type: Date },
    failureReason: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ assessment: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = model("Payment", paymentSchema);
