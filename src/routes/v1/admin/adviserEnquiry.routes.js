const { Router } = require("express");
const adviserEnquiryController = require("../../../controllers/admin/adviserEnquiry.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const {
  updateAdviserEnquiryValidator,
  listAdviserEnquiriesQueryValidator,
  sendAdviserEnquiryMessageValidator,
} = require("../../../validators/adviserEnquiry.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", permit(PERMISSIONS.VIEW_ADVISER_ENQUIRIES), validate(listAdviserEnquiriesQueryValidator), adviserEnquiryController.list);
router.get("/:id", permit(PERMISSIONS.VIEW_ADVISER_ENQUIRIES), validate([mongoIdParam()]), adviserEnquiryController.getById);
router.patch(
  "/:id",
  permit(PERMISSIONS.MANAGE_ADVISER_ENQUIRIES),
  validate([mongoIdParam(), ...updateAdviserEnquiryValidator]),
  adviserEnquiryController.update
);
router.get("/:id/messages", permit(PERMISSIONS.VIEW_ADVISER_ENQUIRIES), validate([mongoIdParam()]), adviserEnquiryController.listMessages);
router.post(
  "/:id/messages",
  permit(PERMISSIONS.MANAGE_ADVISER_ENQUIRIES),
  validate([mongoIdParam(), ...sendAdviserEnquiryMessageValidator]),
  adviserEnquiryController.sendMessage
);

module.exports = router;
