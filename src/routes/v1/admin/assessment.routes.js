const { Router } = require("express");
const assessmentController = require("../../../controllers/admin/assessment.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const { adminListAssessmentsQueryValidator } = require("../../../validators/assessment.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.VIEW_ASSESSMENTS));
router.get("/", validate(adminListAssessmentsQueryValidator), assessmentController.list);
router.get("/:id", validate([mongoIdParam()]), assessmentController.getById);

module.exports = router;
