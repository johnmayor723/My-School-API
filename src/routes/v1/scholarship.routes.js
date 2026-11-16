const { Router } = require("express");
const scholarshipController = require("../../controllers/scholarship.controller");
const { authenticate, authenticateOptional, requireStudent, requireActive } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { listScholarshipsQueryValidator, scholarshipIdParam } = require("../../validators/scholarship.validators");

const router = Router();

// authenticateOptional: reachable by anonymous visitors (redacted fields),
// upgrades to full fields for a logged-in student with an active session pass.
router.get("/", authenticateOptional, validate(listScholarshipsQueryValidator), scholarshipController.list);

// Deliberately only authenticate+requireStudent, not requireActive -- see
// scholarship.controller.js's comment on saveScholarship.
router.get("/saved", authenticate, requireStudent, scholarshipController.listSaved);
router.post("/:id/save", authenticate, requireStudent, validate([scholarshipIdParam()]), scholarshipController.saveScholarship);
router.delete("/:id/save", authenticate, requireStudent, validate([scholarshipIdParam()]), scholarshipController.unsaveScholarship);

// Free (matching itself isn't paid, see scholarship.controller.js) -- placed
// before GET /:id to avoid an id-route collision.
router.get("/personalized", authenticate, requireStudent, requireActive, scholarshipController.personalized);

router.get("/:id", authenticateOptional, validate([scholarshipIdParam()]), scholarshipController.getById);

module.exports = router;
