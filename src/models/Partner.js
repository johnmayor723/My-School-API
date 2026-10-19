const { Schema, model } = require("mongoose");

const partnerSchema = new Schema(
  {
    name: { type: String, required: true },
    logo: { type: String, required: true },
    href: { type: String, default: "#" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("Partner", partnerSchema);
