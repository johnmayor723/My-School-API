const { Router } = require("express");
const controller = require("../../../controllers/admin/cutoffSource.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const { createSourceValidator, updateSourceValidator } = require("../../../validators/cutoffSource.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);
router.get("/", controller.list);
router.get("/:id", validate([mongoIdParam()]), controller.getById);
router.post("/", permit(PERMISSIONS.MANAGE_CUTOFF_SOURCES), validate(createSourceValidator), controller.create);
router.patch(
  "/:id",
  permit(PERMISSIONS.MANAGE_CUTOFF_SOURCES),
  validate([mongoIdParam(), ...updateSourceValidator]),
  controller.update
);

module.exports = router;
