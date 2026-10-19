const { Schema, model } = require("mongoose");
const contentBlockSchema = require("./contentBlock.schema");

const blogPostSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    title: { type: String, required: true },
    excerpt: { type: String },
    featuredImage: { type: String },
    blocks: [contentBlockSchema],
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = model("BlogPost", blogPostSchema);
