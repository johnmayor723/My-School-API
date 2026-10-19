const { Router } = require("express");
const contactController = require("../../controllers/contact.controller");
const { validate } = require("../../middleware/validate");
const { contactSubmitValidator } = require("../../validators/content.validators");
const { contactLimiter } = require("../../middleware/rateLimiter");

const router = Router();

router.post("/", contactLimiter, validate(contactSubmitValidator), contactController.submit);

module.exports = router;
