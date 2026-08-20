const { Router } = require("express");
const admissionSessionController = require("../../../controllers/admin/admissionSession.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam, paginationQuery } = require("../../../validators/common.validators");
const { createSessionValidator, updateSessionValidator } = require("../../../validators/admissionSession.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.MANAGE_ADMISSION_SESSIONS));
router.get("/", validate(paginationQuery()), admissionSessionController.list);
router.post("/", validate(createSessionValidator), admissionSessionController.create);
router.patch("/:id", validate([mongoIdParam(), ...updateSessionValidator]), admissionSessionController.update);

module.exports = router;
