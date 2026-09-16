const { Schema, model } = require("mongoose");
const { slugify } = require("../utils/slugify");
const { INSTITUTION_OWNERSHIP, INSTITUTION_TYPE, RECORD_STATUS } = require("../config/constants");
const { GEOPOLITICAL_ZONES, zoneForState } = require("../config/geopoliticalZones");

const institutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    state: { type: String, required: true, trim: true },
    // Auto-derived from state via zoneForState() in the pre("validate") hook below,
    // same pattern as slug. Used for the catchment-matching default (see
    // metadata.catchmentStates for the per-institution override).
    zone: { type: String, enum: Object.values(GEOPOLITICAL_ZONES) },
    region: { type: String, trim: true },
    town: { type: String, trim: true },
    ownership: { type: String, enum: Object.values(INSTITUTION_OWNERSHIP), required: true },
    institutionType: {
      type: String,
      enum: Object.values(INSTITUTION_TYPE),
      default: INSTITUTION_TYPE.UNIVERSITY,
    },
    website: { type: String, trim: true },
    status: { type: String, enum: Object.values(RECORD_STATUS), default: RECORD_STATUS.ACTIVE },
    metadata: {
      shortName: { type: String, trim: true },
      foundedYear: { type: Number },
      notes: { type: String, trim: true },
      // Optional, admin-settable 0..1 indicator of relative admission competitiveness.
      // Left unset until reliable information is available — the matching engine
      // falls back to a neutral value rather than inventing a number.
      competitivenessIndex: { type: Number, min: 0, max: 1 },
      // True once an admin has edited competitivenessIndex by hand via the admin UI.
      // scripts/tiers/apply-competitiveness-tiers.js skips institutions with this set
      // so a re-run doesn't silently clobber a manual override back to its rule-based default.
      competitivenessManuallySet: { type: Boolean, default: false },
      // Optional admin override for this institution's real catchment states,
      // when it isn't simply "the whole zone" (e.g. a university that only
      // catches a couple of neighbouring states). Unset means the matching
      // engine falls back to the zone-wide default via zoneForState().
      catchmentStates: { type: [String], default: undefined },
      // True once an admin has hand-entered catchmentStates. Mirrors
      // competitivenessManuallySet — a future re-run of any zone/catchment
      // backfill script must skip institutions with this set.
      catchmentManuallySet: { type: Boolean, default: false },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

institutionSchema.index({ name: "text", "metadata.shortName": "text" });
institutionSchema.index({ state: 1 });
institutionSchema.index({ zone: 1 });
institutionSchema.index({ ownership: 1 });
institutionSchema.index({ institutionType: 1 });
institutionSchema.index({ status: 1 });

institutionSchema.pre("validate", function preValidate(next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name);
  }
  if (this.isModified("state") || !this.zone) {
    const derivedZone = zoneForState(this.state);
    if (derivedZone) this.zone = derivedZone;
  }
  next();
});

module.exports = model("Institution", institutionSchema);
