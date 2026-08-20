const { Router } = require("express");
const institutionController = require("../../../controllers/admin/institution.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const {
  createInstitutionValidator,
  updateInstitutionValidator,
  listInstitutionsQueryValidator,
  addProgrammeOfferingValidator,
} = require("../../../validators/institution.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);
router.get("/", validate(listInstitutionsQueryValidator), institutionController.list);
router.get("/:id", validate([mongoIdParam()]), institutionController.getById);
router.post("/", permit(PERMISSIONS.MANAGE_INSTITUTIONS), validate(createInstitutionValidator), institutionController.create);
router.patch(
  "/:id",
  permit(PERMISSIONS.MANAGE_INSTITUTIONS),
  validate([mongoIdParam(), ...updateInstitutionValidator]),
  institutionController.update
);
router.delete("/:id", permit(PERMISSIONS.MANAGE_INSTITUTIONS), validate([mongoIdParam()]), institutionController.remove);
router.post(
  "/:id/programmes",
  permit(PERMISSIONS.MANAGE_INSTITUTIONS),
  validate([mongoIdParam(), ...addProgrammeOfferingValidator]),
  institutionController.addProgrammeOffering
);

module.exports = router;
