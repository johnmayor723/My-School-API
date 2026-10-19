const { Router } = require("express");
const homeContentController = require("../../../controllers/admin/homeContent.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { homeContentBodyValidator } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", homeContentController.get);
router.patch("/", permit(PERMISSIONS.MANAGE_CONTENT), validate(homeContentBodyValidator), homeContentController.update);

module.exports = router;
