const { body } = require("express-validator");

// STAFF (admin console) only — Student accounts are OTP-only, see
// src/modules/accounts/validators/otpAuth.validators.js.
const loginValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("password is required"),
];

const refreshValidator = [body("refreshToken").isString().notEmpty().withMessage("refreshToken is required")];

const updateAccountValidator = [
  body("firstName").optional().trim().notEmpty().withMessage("firstName cannot be empty"),
  body("lastName").optional().trim().notEmpty().withMessage("lastName cannot be empty"),
  body("phone").optional().trim().isLength({ min: 7, max: 20 }).withMessage("phone must be between 7 and 20 characters"),
];

module.exports = {
  loginValidator,
  refreshValidator,
  updateAccountValidator,
};
