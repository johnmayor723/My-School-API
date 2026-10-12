const { body, query } = require("express-validator");
const { ADVISER_ENQUIRY_STATUS } = require("../config/constants");

const createAdviserEnquiryValidator = [
  body("sourcePage").isString().trim().notEmpty().isLength({ max: 200 }).withMessage("sourcePage is required"),
  body("profileConsent")
    .isBoolean()
    .withMessage("profileConsent must be a boolean")
    .bail()
    .toBoolean()
    .custom((value) => value === true)
    .withMessage("Profile consent is required to submit an enquiry"),
  body("preferredCallbackWindow").optional().isString().trim().isLength({ max: 200 }),
];

const sendAdviserEnquiryMessageValidator = [
  body("content").isString().trim().notEmpty().isLength({ max: 2000 }).withMessage("content must be 1-2000 characters"),
];

const updateAdviserEnquiryValidator = [
  body("status").optional().isIn(Object.values(ADVISER_ENQUIRY_STATUS)),
  body("notes").optional().isString().trim().isLength({ max: 4000 }),
  body("assignedAdviser").optional({ nullable: true }).isMongoId(),
];

const listAdviserEnquiriesQueryValidator = [
  query("status").optional().isIn(Object.values(ADVISER_ENQUIRY_STATUS)),
  query("assignedAdviser").optional().isMongoId(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  createAdviserEnquiryValidator,
  sendAdviserEnquiryMessageValidator,
  updateAdviserEnquiryValidator,
  listAdviserEnquiriesQueryValidator,
};
