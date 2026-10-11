const { body } = require("express-validator");

const verifyConsentValidator = [
  body("identifier").isString().trim().notEmpty().withMessage("identifier is required"),
  body("code").isString().trim().notEmpty().withMessage("code is required"),
];

module.exports = { verifyConsentValidator };
