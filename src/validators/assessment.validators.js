const { body, query } = require("express-validator");
const { OLEVEL_EXAM_TYPES, OLEVEL_GRADE_SCALE, INSTITUTION_TYPE, INSTITUTION_OWNERSHIP, ASSESSMENT_STATUS, PAYMENT_STATUS_ON_ASSESSMENT } = require("../config/constants");
const { paginationQuery } = require("./common.validators");

const createAssessmentValidator = [
  body("preferredProgramme").isMongoId().withMessage("preferredProgramme must be a valid id"),
  // Optional: defaults to the currently active admission session when omitted.
  body("admissionSession").optional().isMongoId().withMessage("admissionSession must be a valid id"),

  body("preferences.states").optional().isArray(),
  body("preferences.states.*").optional().isString().trim(),
  body("preferences.institutionTypes").optional().isArray(),
  body("preferences.institutionTypes.*").optional().isIn(Object.values(INSTITUTION_TYPE)),
  body("preferences.ownership").optional().isArray(),
  body("preferences.ownership.*").optional().isIn(Object.values(INSTITUTION_OWNERSHIP)),
  body("preferences.maxResults").optional().isInt({ min: 1, max: 100 }),

  // Optional override of the stored profile — lets a student tweak figures for this one assessment.
  body("academicOverride.fullName").optional().isString().trim(),
  body("academicOverride.utmeRegNumber").optional().isString().trim(),
  body("academicOverride.utmeScore").optional().isInt({ min: 0, max: 400 }),
  body("academicOverride.utmeSubjects").optional().isArray({ max: 8 }),
  body("academicOverride.utmeSubjects.*").optional().isString().trim(),
  body("academicOverride.oLevelSubjects").optional().isArray({ max: 20 }),
  body("academicOverride.oLevelSubjects.*.subject").if(body("academicOverride.oLevelSubjects").exists()).isString().trim().notEmpty(),
  body("academicOverride.oLevelSubjects.*.grade")
    .if(body("academicOverride.oLevelSubjects").exists())
    .isString()
    .trim()
    .toUpperCase()
    .isIn(Object.keys(OLEVEL_GRADE_SCALE)),
  body("academicOverride.oLevelSubjects.*.examType").optional().isIn(Object.values(OLEVEL_EXAM_TYPES)),
  body("academicOverride.oLevelSittings").optional().isInt({ min: 1, max: 2 }),
];

const listAssessmentsQueryValidator = [
  ...paginationQuery(),
  query("status").optional().isIn(Object.values(ASSESSMENT_STATUS)),
  query("paymentStatus").optional().isIn(Object.values(PAYMENT_STATUS_ON_ASSESSMENT)),
];

const adminListAssessmentsQueryValidator = [
  ...listAssessmentsQueryValidator,
  query("student").optional().isMongoId(),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),
];

module.exports = { createAssessmentValidator, listAssessmentsQueryValidator, adminListAssessmentsQueryValidator };
