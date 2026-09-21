const { Router } = require("express");
const authController = require("../../controllers/auth.controller");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  registerValidator,
  loginValidator,
  googleLoginValidator,
  appleLoginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  refreshValidator,
  updateAccountValidator,
  changePasswordValidator,
} = require("../../validators/auth.validators");

const router = Router();

router.post("/register", authLimiter, validate(registerValidator), authController.register);
router.post("/login", authLimiter, validate(loginValidator), authController.login);
router.post("/google", authLimiter, validate(googleLoginValidator), authController.googleLogin);
router.post("/apple", authLimiter, validate(appleLoginValidator), authController.appleLogin);
router.post("/refresh", authLimiter, validate(refreshValidator), authController.refresh);
router.post("/logout", validate(refreshValidator), authController.logout);
router.post("/forgot-password", authLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordValidator), authController.resetPassword);
router.post("/verify-email", authLimiter, validate(verifyEmailValidator), authController.verifyEmail);
router.post("/resend-verification", authLimiter, validate(resendVerificationValidator), authController.resendVerification);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validate(updateAccountValidator), authController.updateMe);
router.post("/change-password", authenticate, validate(changePasswordValidator), authController.changePassword);
router.delete("/me", authenticate, authController.deleteAccount);

module.exports = router;
