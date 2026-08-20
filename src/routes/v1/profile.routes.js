const { Router } = require("express");
const profileController = require("../../controllers/profile.controller");
const { authenticate, requireStudent } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { updateProfileValidator } = require("../../validators/profile.validators");

const router = Router();

router.use(authenticate, requireStudent);
router.get("/", profileController.getProfile);
router.patch("/", validate(updateProfileValidator), profileController.updateProfile);

module.exports = router;
