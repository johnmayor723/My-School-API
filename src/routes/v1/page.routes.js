const { Router } = require("express");
const pageController = require("../../controllers/page.controller");
const { validate } = require("../../middleware/validate");
const { slugParam } = require("../../validators/content.validators");

const router = Router();

router.get("/:slug", validate([slugParam()]), pageController.getBySlug);

module.exports = router;
