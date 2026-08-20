const { Router } = require("express");
const programmeController = require("../../../controllers/admin/programme.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const { createProgrammeValidator, updateProgrammeValidator } = require("../../../validators/programme.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.MANAGE_PROGRAMMES));
router.post("/", validate(createProgrammeValidator), programmeController.create);
router.patch("/:id", validate([mongoIdParam(), ...updateProgrammeValidator]), programmeController.update);

module.exports = router;
