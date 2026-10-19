const { Router } = require("express");
const pageController = require("../../../controllers/admin/page.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam, pageBodyValidator } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", pageController.list);
router.get("/:id", validate([mongoIdParam()]), pageController.getById);
router.post("/", permit(PERMISSIONS.MANAGE_CONTENT), validate(pageBodyValidator), pageController.create);
router.patch("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam(), ...pageBodyValidator]), pageController.update);
router.delete("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam()]), pageController.remove);

module.exports = router;
