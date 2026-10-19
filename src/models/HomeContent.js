const { Schema, model } = require("mongoose");

// Singleton document (one row) holding the marketing homepage's copy, so even
// the custom-laid-out sections stay editable from the admin UI instead of
// being hardcoded in the frontend.
const homeContentSchema = new Schema({
  hero: {
    eyebrow: String,
    title: String,
    subtitle: String,
  },
  mission: {
    eyebrow: String,
    text: String,
  },
  services: [
    {
      n: String,
      title: String,
      image: String,
      to: String,
      blurb: String,
    },
  ],
  cta: {
    eyebrow: String,
    title: String,
    text: String,
    buttonLabel: String,
  },
  testimonial: {
    eyebrow: String,
    quote: String,
  },
});

module.exports = model("HomeContent", homeContentSchema);
