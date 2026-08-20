const { Router } = require("express");
const paymentController = require("../../../controllers/admin/payment.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { referenceParamValidator, listPaymentsQueryValidator } = require("../../../validators/payment.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.VIEW_PAYMENTS));
router.get("/", validate(listPaymentsQueryValidator), paymentController.list);
router.get("/:reference", validate(referenceParamValidator), paymentController.getByReference);

module.exports = router;
