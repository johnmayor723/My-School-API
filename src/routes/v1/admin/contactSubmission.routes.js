const { Router } = require("express");
const contactSubmissionController = require("../../../controllers/admin/contactSubmission.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");
const { body } = require("express-validator");

const router = Router();

router.use(authenticate, requireStaff, permit(PERMISSIONS.VIEW_CONTACT_SUBMISSIONS));

router.get("/", contactSubmissionController.list);
router.patch("/:id", validate([mongoIdParam(), body("read").optional().isBoolean().toBoolean()]), contactSubmissionController.markRead);

module.exports = router;
