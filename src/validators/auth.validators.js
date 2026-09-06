const { body } = require("express-validator");

const passwordRule = () =>
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number");

const registerValidator = [
  body("firstName").trim().notEmpty().withMessage("firstName is required"),
  body("lastName").trim().notEmpty().withMessage("lastName is required"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("phone").optional().trim().isLength({ min: 7, max: 20 }).withMessage("phone must be between 7 and 20 characters"),
  passwordRule(),
  body("fullName").optional().trim(),
  body("utmeRegNumber").optional().trim(),
  body("utmeScore").optional().isInt({ min: 0, max: 400 }),
];

const loginValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("password is required"),
];

const forgotPasswordValidator = [body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail()];

const resetPasswordValidator = [
  body("token").isString().notEmpty().withMessage("token is required"),
  body("newPassword").isString().isLength({ min: 8 }).withMessage("newPassword must be at least 8 characters long"),
];

const refreshValidator = [body("refreshToken").isString().notEmpty().withMessage("refreshToken is required")];

const updateAccountValidator = [
  body("firstName").optional().trim().notEmpty().withMessage("firstName cannot be empty"),
  body("lastName").optional().trim().notEmpty().withMessage("lastName cannot be empty"),
  body("phone").optional().trim().isLength({ min: 7, max: 20 }).withMessage("phone must be between 7 and 20 characters"),
];

const changePasswordValidator = [
  body("currentPassword").isString().notEmpty().withMessage("currentPassword is required"),
  body("newPassword").isString().isLength({ min: 8 }).withMessage("newPassword must be at least 8 characters long").matches(/[0-9]/).withMessage("newPassword must contain at least one number"),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshValidator,
  updateAccountValidator,
  changePasswordValidator,
};
