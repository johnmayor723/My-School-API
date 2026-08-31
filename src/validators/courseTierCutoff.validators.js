const { body, query } = require("express-validator");
const { INSTITUTION_TIERS } = require("../config/constants");

const VALID_TIER_INDEXES = INSTITUTION_TIERS.map((t) => t.index);

const upsertCutoffsValidator = [
  body("cutoffs").isArray({ min: 1 }).withMessage("cutoffs must be a non-empty array"),
  body("cutoffs.*.institutionTier")
    .isFloat()
    .custom((v) => VALID_TIER_INDEXES.includes(Number(v)))
    .withMessage("institutionTier must be a recognised tier index"),
  body("cutoffs.*.cutoffMark")
    .custom((v) => v === null || (typeof v === "number" && v >= 0 && v <= 400))
    .withMessage("cutoffMark must be a number between 0 and 400, or null to clear"),
  body("cutoffs.*.notes").optional().isString().trim(),
];

const summaryQueryValidator = [query("programmeIds").optional().isString().trim()];

const gapsQueryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("search").optional().isString().trim(),
  query("institutionTier")
    .optional()
    .isFloat()
    .custom((v) => VALID_TIER_INDEXES.includes(Number(v)))
    .withMessage("institutionTier must be a recognised tier index"),
  query("admissionSession").optional().isMongoId(),
];

const byInstitutionQueryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("search").optional().isString().trim(),
];

module.exports = { upsertCutoffsValidator, summaryQueryValidator, gapsQueryValidator, byInstitutionQueryValidator };
