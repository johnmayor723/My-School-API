const { body, query } = require("express-validator");
const { OLEVEL_GRADE_SCALE, OLEVEL_EXAM_TYPES, RULE_SOURCE_TYPE, RULE_STATUS } = require("../config/constants");
const { paginationQuery } = require("./common.validators");

const ruleBodyValidator = [
  body("institution").isMongoId().withMessage("institution must be a valid id"),
  body("programme").isMongoId().withMessage("programme must be a valid id"),
  body("admissionSession").isMongoId().withMessage("admissionSession must be a valid id"),

  body("utme.minimumScore").isInt({ min: 0, max: 400 }).withMessage("utme.minimumScore is required (0-400)"),
  body("utme.requiredSubjects").isArray({ min: 1 }).withMessage("utme.requiredSubjects must list at least one subject"),
  body("utme.requiredSubjects.*").isString().trim().notEmpty(),
  body("utme.subjectCombinations").optional().isArray(),
  body("utme.notes").optional().isString().trim(),

  body("olevel.minimumCredits").isInt({ min: 1, max: 9 }).withMessage("olevel.minimumCredits is required"),
  body("olevel.requiredSubjects").isArray({ min: 1 }).withMessage("olevel.requiredSubjects must list at least one subject"),
  body("olevel.requiredSubjects.*").isString().trim().notEmpty(),
  body("olevel.minimumGrade").optional().isIn(Object.keys(OLEVEL_GRADE_SCALE)),
  body("olevel.acceptedExaminations").optional().isArray(),
  body("olevel.acceptedExaminations.*").optional().isIn(Object.values(OLEVEL_EXAM_TYPES)),
  body("olevel.sittingsAllowed").optional().isInt({ min: 1, max: 2 }),
  body("olevel.notes").optional().isString().trim(),

  body("additional.postUtmeRequired").optional().isBoolean(),
  body("additional.postUtmeMinimumScore").optional().isInt({ min: 0 }),
  body("additional.directEntryAccepted").optional().isBoolean(),
  body("additional.minimumAge").optional().isInt({ min: 0 }),
  body("additional.programmeSpecific").optional().isArray(),
  body("additional.notes").optional().isString().trim(),

  body("source.title").optional().isString().trim(),
  body("source.type").optional().isIn(Object.values(RULE_SOURCE_TYPE)),
  body("source.url").optional().isURL(),
  body("source.sourceDate").optional().isISO8601().toDate(),
];

const updateRuleValidator = [
  body("utme.minimumScore").optional().isInt({ min: 0, max: 400 }),
  body("utme.requiredSubjects").optional().isArray({ min: 1 }),
  body("utme.subjectCombinations").optional().isArray(),
  body("olevel.minimumCredits").optional().isInt({ min: 1, max: 9 }),
  body("olevel.requiredSubjects").optional().isArray({ min: 1 }),
  body("olevel.minimumGrade").optional().isIn(Object.keys(OLEVEL_GRADE_SCALE)),
  body("olevel.acceptedExaminations").optional().isArray(),
  body("olevel.sittingsAllowed").optional().isInt({ min: 1, max: 2 }),
  body("additional.postUtmeRequired").optional().isBoolean(),
  body("additional.directEntryAccepted").optional().isBoolean(),
  body("source.title").optional().isString().trim(),
  body("source.type").optional().isIn(Object.values(RULE_SOURCE_TYPE)),
  body("source.url").optional().isURL(),
  body("source.sourceDate").optional().isISO8601().toDate(),
];

const reviewActionValidator = [
  body("decision").isIn(["approve", "request_changes"]).withMessage("decision must be 'approve' or 'request_changes'"),
  body("notes").optional().isString().trim(),
];

const archiveActionValidator = [body("notes").optional().isString().trim()];

const listRulesQueryValidator = [
  ...paginationQuery(),
  query("institution").optional().isMongoId(),
  query("programme").optional().isMongoId(),
  query("admissionSession").optional().isMongoId(),
  query("status").optional().isIn(Object.values(RULE_STATUS)),
];

module.exports = {
  createRuleValidator: ruleBodyValidator,
  updateRuleValidator,
  reviewActionValidator,
  archiveActionValidator,
  listRulesQueryValidator,
};
