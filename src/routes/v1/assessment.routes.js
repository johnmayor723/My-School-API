const { Router } = require("express");
const assessmentController = require("../../controllers/assessment.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { mongoIdParam } = require("../../validators/common.validators");
const { createAssessmentValidator, listAssessmentsQueryValidator } = require("../../validators/assessment.validators");

const router = Router();

router.use(authenticate, requireStudent);
router.get("/", validate(listAssessmentsQueryValidator), assessmentController.list);
router.post("/", validate(createAssessmentValidator), assessmentController.create);
router.get("/:id", validate([mongoIdParam()]), assessmentController.getById);
router.get("/:id/recommendations", validate([mongoIdParam()]), assessmentController.getRecommendations);

module.exports = router;
