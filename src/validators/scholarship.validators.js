const { body, query, param } = require("express-validator");
const { paginationQuery } = require("./common.validators");

const SCHOLARSHIP_STATUSES = ["upcoming", "open", "closed", "suspended", "unconfirmed", "review_required", "archived"];

// scholarship-service ids are sha256-derived 24-char hex strings, not Mongo
// ObjectIds, but they share the same {24 hex chars} shape -- isMongoId() is a
// format check (validator.js), not a Mongoose lookup, so it's reusable here.
const scholarshipIdParam = () => param("id").isMongoId().withMessage("id must be a valid scholarship id");

const sourceIdParam = () => param("id").isInt({ min: 1 }).withMessage("id must be a valid source id").toInt();

// Comma-separated so the public directory can request e.g. "open,upcoming"
// in one call; scholarship-service's GET /api/scholarships splits on "," too.
const isCommaSeparatedStatusList = (value) =>
  String(value).split(",").map(s => s.trim()).filter(Boolean).every(s => SCHOLARSHIP_STATUSES.includes(s));

const listScholarshipsQueryValidator = [
  ...paginationQuery(),
  query("session").optional().isString().trim(),
  query("status").optional().isString().custom(isCommaSeparatedStatusList).withMessage("status must be one or more of: " + SCHOLARSHIP_STATUSES.join(", ")),
  query("q").optional().isString().trim(),
  query("level").optional().isString().trim(),
  query("fundingType").optional().isString().trim(),
  query("sourceType").optional().isIn(["official", "secondary"]),
];

const updateScholarshipValidator = [
  scholarshipIdParam(),
  body("status").optional().isIn(SCHOLARSHIP_STATUSES).withMessage("status is invalid"),
  body("verified").optional().isBoolean().toBoolean(),
  body("verificationNotes").optional().isString().trim().isLength({ max: 2000 }),
  // null explicitly clears the field; omit the key to leave it unchanged.
  body("deadline").optional({ nullable: true }).isISO8601().withMessage("deadline must be an ISO date or null"),
  body("applicationUrl").optional({ nullable: true }).isURL().withMessage("applicationUrl must be a valid URL or null"),
];

const addSourceValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("url").isURL().withMessage("url must be valid"),
  body("type").optional().isIn(["official", "secondary"]),
  body("trustLevel").optional().isString().trim(),
  body("notes").optional().isString().trim().isLength({ max: 1000 }),
];

const patchSourceValidator = [
  sourceIdParam(),
  body("name").optional().isString().trim().notEmpty(),
  body("type").optional().isIn(["official", "secondary"]),
  body("enabled").optional().isBoolean().toBoolean(),
  body("trust_level").optional().isString().trim(),
  body("notes").optional().isString().trim().isLength({ max: 1000 }),
];

module.exports = {
  scholarshipIdParam,
  sourceIdParam,
  listScholarshipsQueryValidator,
  updateScholarshipValidator,
  addSourceValidator,
  patchSourceValidator,
};
