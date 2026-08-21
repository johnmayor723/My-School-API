const { body, query } = require("express-validator");
const { DEGREE_TYPE, RECORD_STATUS } = require("../config/constants");
const { paginationQuery } = require("./common.validators");

const createProgrammeValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("alternativeNames").optional().isArray(),
  body("alternativeNames.*").optional().isString().trim(),
  body("faculty").optional().trim(),
  body("department").optional().trim(),
  body("degreeType").optional().isIn(Object.values(DEGREE_TYPE)),
  body("status").optional().isIn(Object.values(RECORD_STATUS)),
  body("relatedProgrammes").optional().isArray(),
  body("relatedProgrammes.*").optional().isMongoId(),
];

const updateProgrammeValidator = [
  body("name").optional().trim().notEmpty(),
  body("alternativeNames").optional().isArray(),
  body("faculty").optional().trim(),
  body("department").optional().trim(),
  body("degreeType").optional().isIn(Object.values(DEGREE_TYPE)),
  body("status").optional().isIn(Object.values(RECORD_STATUS)),
  body("relatedProgrammes").optional().isArray(),
  body("relatedProgrammes.*").optional().isMongoId(),
];

const listProgrammesQueryValidator = [
  ...paginationQuery(),
  query("search").optional().isString().trim(),
  query("faculty").optional().isString().trim(),
  query("institution").optional().isMongoId(),
];

const searchProgrammesQueryValidator = [
  query("q").optional().isString().trim(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  query("olevelSubjects").optional().isString().trim(),
];

module.exports = {
  createProgrammeValidator,
  updateProgrammeValidator,
  listProgrammesQueryValidator,
  searchProgrammesQueryValidator,
};
