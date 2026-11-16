const { Schema, model } = require("mongoose");
const { PAYMENT_STATUS, PAYMENT_PROVIDERS, SESSION_PASS_SERVICE_TYPE } = require("../config/constants");

const sessionPassSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Domestic (Nigerian scholarships/admissions) vs international (manual,
    // no foreign-school API yet) -- each priced and sold separately, see
    // env.sessionPassPrices. A pass only unlocks features of its own type.
    serviceType: { type: String, enum: Object.values(SESSION_PASS_SERVICE_TYPE), required: true },

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

    // Set together the moment verification reports SUCCESS — a pass is "active"
    // purely by expiresAt being in the future, there is no separate flag.
    activatedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

sessionPassSchema.index({ user: 1, expiresAt: -1 });
sessionPassSchema.index({ user: 1, serviceType: 1, expiresAt: -1 });
sessionPassSchema.index({ status: 1 });

module.exports = model("SessionPass", sessionPassSchema);
