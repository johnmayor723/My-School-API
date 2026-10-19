const { Schema, model } = require("mongoose");

// Nav taxonomy behind the Education/Training/Migration submenus — "program"
// here means a marketing-site menu entry, not a My School Placement
// academic Programme (see models/Programme.js, an unrelated concept).
const programSchema = new Schema(
  {
    category: { type: String, enum: ["education", "training", "migration"], required: true, index: true },
    slug: { type: String, required: true, trim: true },
    label: { type: String, required: true },
    href: { type: String }, // used for anchor-style items (e.g. training/migration sub-sections)
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

programSchema.index({ category: 1, order: 1 });

module.exports = model("Program", programSchema);
