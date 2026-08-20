const { Router } = require("express");
const compareController = require("../../controllers/compare.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { compareValidator } = require("../../validators/compare.validators");

const router = Router();

router.post("/", authenticate, requireStudent, validate(compareValidator), compareController.compare);

module.exports = router;
