const { Router } = require("express");
const parentConsentController = require("../../modules/accounts/controllers/parentConsent.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { otpLimiter } = require("../../middleware/rateLimiter");
const { verifyConsentValidator } = require("../../modules/accounts/validators/parentConsent.validators");

const router = Router();

// Called by the parent, who has no student session of their own.
router.post("/verify", otpLimiter, validate(verifyConsentValidator), parentConsentController.verify);

// Called by the logged-in (but INACTIVE) student — authenticate() lets
// INACTIVE through, so these stay reachable while the student is gated out
// of assessments/chat/payments/compare by requireActive.
router.get("/", authenticate, requireStudent, parentConsentController.getStatus);
router.post("/resend", authenticate, requireStudent, otpLimiter, parentConsentController.resend);

module.exports = router;
