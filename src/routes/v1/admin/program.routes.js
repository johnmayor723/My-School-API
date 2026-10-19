const { Router } = require("express");
const programController = require("../../../controllers/admin/program.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam, programBodyValidator } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", programController.list);
router.post("/", permit(PERMISSIONS.MANAGE_CONTENT), validate(programBodyValidator), programController.create);
router.patch("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam(), ...programBodyValidator]), programController.update);
router.delete("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam()]), programController.remove);

module.exports = router;
