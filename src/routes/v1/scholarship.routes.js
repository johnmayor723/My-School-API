const { Router } = require("express");
const scholarshipController = require("../../controllers/scholarship.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { listScholarshipsQueryValidator, scholarshipIdParam } = require("../../validators/scholarship.validators");

const router = Router();

router.get("/", validate(listScholarshipsQueryValidator), scholarshipController.list);

// Deliberately only authenticate+requireStudent, not requireActive -- see
// scholarship.controller.js's comment on saveScholarship.
router.get("/saved", authenticate, requireStudent, scholarshipController.listSaved);
router.post("/:id/save", authenticate, requireStudent, validate([scholarshipIdParam()]), scholarshipController.saveScholarship);
router.delete("/:id/save", authenticate, requireStudent, validate([scholarshipIdParam()]), scholarshipController.unsaveScholarship);

router.get("/:id", validate([scholarshipIdParam()]), scholarshipController.getById);

module.exports = router;
