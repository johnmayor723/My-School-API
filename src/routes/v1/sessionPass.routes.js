const { Router } = require("express");
const { param } = require("express-validator");
const sessionPassController = require("../../controllers/sessionPass.controller");
const { authenticate, requireStudent, requireActive } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { referenceParamValidator, initializeValidator, getActiveQueryValidator } = require("../../validators/sessionPass.validators");

const router = Router();

router.post("/webhook/:provider", validate([param("provider").isString().trim().notEmpty()]), sessionPassController.webhook);

router.use(authenticate, requireStudent, requireActive);
router.post("/initialize", validate(initializeValidator), sessionPassController.initialize);
router.post("/:reference/verify", validate(referenceParamValidator), sessionPassController.verify);
router.get("/active", validate(getActiveQueryValidator), sessionPassController.getActive);

module.exports = router;
