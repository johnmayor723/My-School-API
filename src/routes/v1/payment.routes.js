const { Router } = require("express");
const { param } = require("express-validator");
const paymentController = require("../../controllers/payment.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { initializePaymentValidator, referenceParamValidator } = require("../../validators/payment.validators");

const router = Router();

router.post("/webhook/:provider", validate([param("provider").isString().trim().notEmpty()]), paymentController.webhook);

router.use(authenticate, requireStudent);
router.post("/initialize", validate(initializePaymentValidator), paymentController.initialize);
router.post("/:reference/verify", validate(referenceParamValidator), paymentController.verify);
router.get("/:reference", validate(referenceParamValidator), paymentController.getByReference);

module.exports = router;
