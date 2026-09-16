const { body } = require("express-validator");
const { CUTOFF_SOURCE_TYPE } = require("../config/constants");

const createSourceValidator = [
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("sourceType").isIn(Object.values(CUTOFF_SOURCE_TYPE)).withMessage("sourceType must be official or secondary"),
  body("scraperKey").isString().trim().notEmpty().withMessage("scraperKey is required"),
  body("baseUrl").optional().isURL(),
  body("robotsPolicyNotes").optional().isString().trim(),
  body("rateLimitMs").optional().isInt({ min: 0 }),
  body("isActive").optional().isBoolean(),
];

const updateSourceValidator = [
  body("name").optional().isString().trim().notEmpty(),
  body("sourceType").optional().isIn(Object.values(CUTOFF_SOURCE_TYPE)),
  body("baseUrl").optional().isURL(),
  body("robotsPolicyNotes").optional().isString().trim(),
  body("rateLimitMs").optional().isInt({ min: 0 }),
  body("isActive").optional().isBoolean(),
];

module.exports = { createSourceValidator, updateSourceValidator };
