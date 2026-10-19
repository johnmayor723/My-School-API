const { Schema } = require("mongoose");

// Mirrors michelleandanthony.net's CMS block shape (heading/paragraph/quote/list/image),
// ported verbatim so migrated content needs no reshaping. Content is pre-parsed at
// migrate/edit time so the frontend never has to understand WordPress/HTML markup.
const contentBlockSchema = new Schema(
  {
    type: { type: String, enum: ["heading", "paragraph", "quote", "list", "image"], required: true },
    level: { type: Number, min: 1, max: 6 },
    text: { type: String },
    items: [{ type: String }],
    ordered: { type: Boolean, default: false },
    src: { type: String },
    alt: { type: String },
  },
  { _id: false }
);

module.exports = contentBlockSchema;
