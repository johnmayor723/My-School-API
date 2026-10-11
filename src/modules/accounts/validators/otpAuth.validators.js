const { body } = require("express-validator");
const {
  OTP_CHANNEL,
  OLEVEL_EXAM_TYPES,
  OLEVEL_GRADE_SCALE,
  INSTITUTION_TYPE,
  INSTITUTION_OWNERSHIP,
  MINIMUM_CONSENT_AGE,
} = require("../../../config/constants");
const { calculateAge } = require("../../../utils/age");

// Computed straight from the raw body value rather than relying on the
// dateOfBirth chain's own toDate() sanitizer having already mutated
// req.body by the time this runs — express-validator doesn't guarantee that
// ordering across separate chains.
function isUnderConsentAge(req) {
  if (!req.body.dateOfBirth) return false;
  const dob = new Date(req.body.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  return calculateAge(dob) < MINIMUM_CONSENT_AGE;
}

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

  // Required only for applicants under MINIMUM_CONSENT_AGE — see
  // parentConsent.service.js for what happens with these once collected.
  body("parentName")
    .if((_, { req }) => isUnderConsentAge(req))
    .trim()
    .notEmpty()
    .withMessage("A parent or guardian name is required for applicants under 18"),
  body("parentEmail").optional({ checkFalsy: true }).isEmail().withMessage("parentEmail must be a valid email"),
  body("parentPhone").optional({ checkFalsy: true }).isString().trim(),
  body("parentEmail").custom((_, { req }) => {
    if (isUnderConsentAge(req) && !req.body.parentEmail && !req.body.parentPhone) {
      throw new Error("A parent email or phone number is required for applicants under 18");
    }
    return true;
  }),

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

const requestAddEmailValidator = [body("email").isEmail().withMessage("A valid email is required")];

const confirmAddEmailValidator = [
  body("email").isEmail().withMessage("A valid email is required"),
  body("code").isString().trim().notEmpty().withMessage("code is required"),
];

module.exports = {
  requestCodeValidator,
  verifyCodeValidator,
  completeSignupValidator,
  deletionCodeValidator,
  requestAddEmailValidator,
  confirmAddEmailValidator,
};
