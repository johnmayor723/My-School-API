const { Router } = require("express");
const admissionRuleController = require("../../../controllers/admin/admissionRule.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const {
  createRuleValidator,
  updateRuleValidator,
  reviewActionValidator,
  archiveActionValidator,
  listRulesQueryValidator,
} = require("../../../validators/admissionRule.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);
router.get("/", validate(listRulesQueryValidator), admissionRuleController.list);
router.get("/:id", validate([mongoIdParam()]), admissionRuleController.getById);
router.post("/", permit(PERMISSIONS.MANAGE_ADMISSION_RULES), validate(createRuleValidator), admissionRuleController.create);
router.patch(
  "/:id",
  permit(PERMISSIONS.MANAGE_ADMISSION_RULES),
  validate([mongoIdParam(), ...updateRuleValidator]),
  admissionRuleController.update
);
router.post(
  "/:id/submit-for-review",
  permit(PERMISSIONS.MANAGE_ADMISSION_RULES),
  validate([mongoIdParam()]),
  admissionRuleController.submitForReview
);
router.post(
  "/:id/review",
  permit(PERMISSIONS.REVIEW_ADMISSION_RULES),
  validate([mongoIdParam(), ...reviewActionValidator]),
  admissionRuleController.review
);
router.post("/:id/approve", permit(PERMISSIONS.APPROVE_ADMISSION_RULES), validate([mongoIdParam()]), admissionRuleController.approve);
router.post("/:id/publish", permit(PERMISSIONS.PUBLISH_ADMISSION_RULES), validate([mongoIdParam()]), admissionRuleController.publish);
router.post(
  "/:id/archive",
  permit(PERMISSIONS.ARCHIVE_ADMISSION_RULES),
  validate([mongoIdParam(), ...archiveActionValidator]),
  admissionRuleController.archive
);

module.exports = router;
