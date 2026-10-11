const { Router } = require("express");
const scholarshipController = require("../../controllers/scholarship.controller");
const { validate } = require("../../middleware/validate");
const { listScholarshipsQueryValidator, scholarshipIdParam } = require("../../validators/scholarship.validators");

const router = Router();

router.get("/", validate(listScholarshipsQueryValidator), scholarshipController.list);
router.get("/:id", validate([scholarshipIdParam()]), scholarshipController.getById);

module.exports = router;
