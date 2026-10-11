const { Router } = require("express");
const scholarshipController = require("../../../controllers/admin/scholarship.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const {
  listScholarshipsQueryValidator,
  scholarshipIdParam,
  updateScholarshipValidator,
  addSourceValidator,
  patchSourceValidator,
} = require("../../../validators/scholarship.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", validate(listScholarshipsQueryValidator), scholarshipController.list);
router.get("/sources", scholarshipController.listSources);
router.post("/sources", permit(PERMISSIONS.MANAGE_SCHOLARSHIP_SOURCES), validate(addSourceValidator), scholarshipController.addSource);
router.patch(
  "/sources/:id",
  permit(PERMISSIONS.MANAGE_SCHOLARSHIP_SOURCES),
  validate(patchSourceValidator),
  scholarshipController.patchSource
);
router.get("/crawl-runs", scholarshipController.listCrawlRuns);
router.post("/crawl", permit(PERMISSIONS.MANAGE_SCHOLARSHIP_SOURCES), scholarshipController.triggerCrawl);

router.get("/:id", validate([scholarshipIdParam()]), scholarshipController.getById);
router.patch("/:id", permit(PERMISSIONS.VERIFY_SCHOLARSHIPS), validate(updateScholarshipValidator), scholarshipController.update);
router.delete("/:id", permit(PERMISSIONS.DELETE_SCHOLARSHIPS), validate([scholarshipIdParam()]), scholarshipController.remove);

module.exports = router;
