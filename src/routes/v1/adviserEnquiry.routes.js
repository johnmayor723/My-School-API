const { Router } = require("express");
const adviserEnquiryController = require("../../controllers/adviserEnquiry.controller");
const { authenticate, requireStudent, requireActive } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { adviserEnquiryLimiter, adviserChatLimiter } = require("../../middleware/rateLimiter");
const { mongoIdParam } = require("../../validators/common.validators");
const { createAdviserEnquiryValidator, sendAdviserEnquiryMessageValidator } = require("../../validators/adviserEnquiry.validators");

const router = Router();

router.use(authenticate, requireStudent, requireActive);

router.post("/", adviserEnquiryLimiter, validate(createAdviserEnquiryValidator), adviserEnquiryController.create);
router.get("/mine", adviserEnquiryController.listMine);
router.get("/:id", validate([mongoIdParam()]), adviserEnquiryController.getMine);
router.get("/:id/messages", validate([mongoIdParam()]), adviserEnquiryController.listMessages);
router.post(
  "/:id/messages",
  adviserChatLimiter,
  validate([mongoIdParam(), ...sendAdviserEnquiryMessageValidator]),
  adviserEnquiryController.sendMessage
);

module.exports = router;
