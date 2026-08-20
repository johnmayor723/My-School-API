const { Router } = require("express");
const authController = require("../../controllers/auth.controller");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshValidator,
  updateAccountValidator,
  changePasswordValidator,
} = require("../../validators/auth.validators");

const router = Router();

router.post("/register", authLimiter, validate(registerValidator), authController.register);
router.post("/login", authLimiter, validate(loginValidator), authController.login);
router.post("/refresh", authLimiter, validate(refreshValidator), authController.refresh);
router.post("/logout", validate(refreshValidator), authController.logout);
router.post("/forgot-password", authLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordValidator), authController.resetPassword);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validate(updateAccountValidator), authController.updateMe);
router.post("/change-password", authenticate, validate(changePasswordValidator), authController.changePassword);

module.exports = router;
