const { Router } = require("express");
const authController = require("../../controllers/auth.controller");
const otpAuthController = require("../../modules/accounts/controllers/otpAuth.controller");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter, otpLimiter } = require("../../middleware/rateLimiter");
const { loginValidator, refreshValidator, updateAccountValidator } = require("../../validators/auth.validators");
const {
  requestCodeValidator,
  verifyCodeValidator,
  completeSignupValidator,
  deletionCodeValidator,
  requestAddEmailValidator,
  confirmAddEmailValidator,
} = require("../../modules/accounts/validators/otpAuth.validators");

const router = Router();

// Student sign-up and login — one-time code by email or phone.
router.post("/otp/request", otpLimiter, validate(requestCodeValidator), otpAuthController.requestCode);
router.post("/otp/verify", otpLimiter, validate(verifyCodeValidator), otpAuthController.verifyCode);
router.post("/register/complete", authLimiter, validate(completeSignupValidator), otpAuthController.completeSignup);

// STAFF (admin console) only — password login.
router.post("/login", authLimiter, validate(loginValidator), authController.login);

router.post("/refresh", authLimiter, validate(refreshValidator), authController.refresh);
router.post("/logout", validate(refreshValidator), authController.logout);

router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validate(updateAccountValidator), authController.updateMe);
router.get("/me/data-export", authenticate, otpAuthController.exportData);
router.post("/me/email/request", authenticate, otpLimiter, validate(requestAddEmailValidator), otpAuthController.requestAddEmail);
router.post("/me/email/confirm", authenticate, otpLimiter, validate(confirmAddEmailValidator), otpAuthController.confirmAddEmail);
router.post("/me/deletion-code", authenticate, otpLimiter, otpAuthController.requestDeletionCode);
router.delete("/me", authenticate, validate(deletionCodeValidator), otpAuthController.confirmDeletion);

module.exports = router;
