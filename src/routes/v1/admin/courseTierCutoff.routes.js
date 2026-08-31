const { Router } = require("express");
const controller = require("../../../controllers/admin/courseTierCutoff.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const {
  upsertCutoffsValidator,
  summaryQueryValidator,
  gapsQueryValidator,
  byInstitutionQueryValidator,
} = require("../../../validators/courseTierCutoff.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);
router.get("/tiers", controller.tiers);
router.get("/summary", validate(summaryQueryValidator), controller.summary);
router.get("/gaps", validate(gapsQueryValidator), controller.gaps);
// Writes (auto-maps sibling-tier gaps) as a side effect of listing, so it's gated
// the same as the explicit PUT below rather than left open to any staff viewer.
router.get(
  "/by-institution/:institutionId",
  permit(PERMISSIONS.MANAGE_ADMISSION_RULES),
  validate([mongoIdParam("institutionId"), ...byInstitutionQueryValidator]),
  controller.byInstitution
);
router.get("/:programmeId", validate([mongoIdParam("programmeId")]), controller.listForProgramme);
router.put(
  "/:programmeId",
  permit(PERMISSIONS.MANAGE_ADMISSION_RULES),
  validate([mongoIdParam("programmeId"), ...upsertCutoffsValidator]),
  controller.upsertForProgramme
);

module.exports = router;
