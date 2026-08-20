const { body } = require("express-validator");
const { OLEVEL_EXAM_TYPES, OLEVEL_GRADE_SCALE, INSTITUTION_TYPE, INSTITUTION_OWNERSHIP } = require("../config/constants");

const updateProfileValidator = [
  body("fullName").optional().trim().notEmpty(),
  body("utmeRegNumber").optional().trim(),
  body("utmeScore").optional().isInt({ min: 0, max: 400 }).withMessage("utmeScore must be between 0 and 400"),
  body("utmeSubjects").optional().isArray({ max: 8 }),
  body("utmeSubjects.*").optional().isString().trim().notEmpty(),

  body("oLevelSubjects").optional().isArray({ max: 20 }),
  body("oLevelSubjects.*.subject").if(body("oLevelSubjects").exists()).isString().trim().notEmpty(),
  body("oLevelSubjects.*.grade")
    .if(body("oLevelSubjects").exists())
    .isString()
    .trim()
    .toUpperCase()
    .isIn(Object.keys(OLEVEL_GRADE_SCALE))
    .withMessage(`grade must be one of ${Object.keys(OLEVEL_GRADE_SCALE).join(", ")}`),
  body("oLevelSubjects.*.examType").optional().isIn(Object.values(OLEVEL_EXAM_TYPES)),
  body("oLevelSittings").optional().isInt({ min: 1, max: 2 }),

  body("preferredProgramme").optional().isMongoId(),
  body("preferredStates").optional().isArray(),
  body("preferredStates.*").optional().isString().trim(),
  body("preferredInstitutionTypes").optional().isArray(),
  body("preferredInstitutionTypes.*").optional().isIn(Object.values(INSTITUTION_TYPE)),
  body("preferredOwnership").optional().isArray(),
  body("preferredOwnership.*").optional().isIn(Object.values(INSTITUTION_OWNERSHIP)),
];

module.exports = { updateProfileValidator };
