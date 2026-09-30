const { body } = require("express-validator");
const {
  OTP_CHANNEL,
  OLEVEL_EXAM_TYPES,
  OLEVEL_GRADE_SCALE,
  INSTITUTION_TYPE,
  INSTITUTION_OWNERSHIP,
} = require("../../../config/constants");

const requestCodeValidator = [
  body("identifier").isString().trim().notEmpty().withMessage("identifier is required"),
  body("channel").isIn(Object.values(OTP_CHANNEL)).withMessage("channel must be email or phone"),
];

const verifyCodeValidator = [
  body("identifier").isString().trim().notEmpty().withMessage("identifier is required"),
  body("channel").isIn(Object.values(OTP_CHANNEL)).withMessage("channel must be email or phone"),
  body("code").isString().trim().notEmpty().withMessage("code is required"),
];

const completeSignupValidator = [
  body("registrationToken").isString().notEmpty().withMessage("registrationToken is required"),
  body("firstName").trim().notEmpty().withMessage("firstName is required"),
  body("lastName").trim().notEmpty().withMessage("lastName is required"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("dateOfBirth is required")
    .toDate()
    .custom((value) => value < new Date())
    .withMessage("dateOfBirth must be in the past"),

  body("profile.fullName").optional().trim(),
  body("profile.utmeRegNumber").optional().trim(),
  body("profile.utmeScore").optional().isInt({ min: 0, max: 400 }),
  body("profile.utmeSubjects").optional().isArray({ max: 8 }),
  body("profile.oLevelSubjects").optional().isArray({ max: 20 }),
  body("profile.oLevelSubjects.*.subject").if(body("profile.oLevelSubjects").exists()).isString().trim().notEmpty(),
  body("profile.oLevelSubjects.*.grade")
    .if(body("profile.oLevelSubjects").exists())
    .isString()
    .trim()
    .toUpperCase()
    .isIn(Object.keys(OLEVEL_GRADE_SCALE)),
  body("profile.oLevelSubjects.*.examType").optional().isIn(Object.values(OLEVEL_EXAM_TYPES)),
  body("profile.oLevelSittings").optional().isInt({ min: 1, max: 2 }),
  body("profile.interests").optional().isArray(),
  body("profile.desiredCareer").optional().trim(),
  body("profile.preferredCountry").optional().trim(),
  body("profile.stateOfOrigin").optional().trim(),
  body("profile.residentialState").optional().trim(),
  body("profile.preferredProgramme").optional().isMongoId(),
  body("profile.preferredStates").optional().isArray(),
  body("profile.preferredInstitutionTypes").optional().isArray(),
  body("profile.preferredInstitutionTypes.*").optional().isIn(Object.values(INSTITUTION_TYPE)),
  body("profile.preferredOwnership").optional().isArray(),
  body("profile.preferredOwnership.*").optional().isIn(Object.values(INSTITUTION_OWNERSHIP)),
];

const deletionCodeValidator = [body("code").isString().trim().notEmpty().withMessage("code is required")];

module.exports = { requestCodeValidator, verifyCodeValidator, completeSignupValidator, deletionCodeValidator };
