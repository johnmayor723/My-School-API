const { Router } = require("express");
const partnerController = require("../../../controllers/admin/partner.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam, partnerBodyValidator } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", partnerController.list);
router.post("/", permit(PERMISSIONS.MANAGE_CONTENT), validate(partnerBodyValidator), partnerController.create);
router.patch("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam(), ...partnerBodyValidator]), partnerController.update);
router.delete("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam()]), partnerController.remove);

module.exports = router;
