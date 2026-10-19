const { Schema, model } = require("mongoose");
const contentBlockSchema = require("./contentBlock.schema");

const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    heroImage: { type: String },
    blocks: [contentBlockSchema],
  },
  { timestamps: true }
);

module.exports = model("Page", pageSchema);
