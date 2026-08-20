const { Router } = require("express");
const roleController = require("../../../controllers/admin/role.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const { createRoleValidator, updateRoleValidator } = require("../../../validators/role.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.MANAGE_ROLES));
router.get("/", roleController.list);
router.get("/:id", validate([mongoIdParam()]), roleController.getById);
router.post("/", validate(createRoleValidator), roleController.create);
router.patch("/:id", validate([mongoIdParam(), ...updateRoleValidator]), roleController.update);

module.exports = router;
