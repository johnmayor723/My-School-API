const { body, query } = require("express-validator");
const { INSTITUTION_OWNERSHIP, INSTITUTION_TYPE, RECORD_STATUS } = require("../config/constants");
const { paginationQuery } = require("./common.validators");

const createInstitutionValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("state").trim().notEmpty().withMessage("state is required"),
  body("region").optional().trim(),
  body("town").optional().trim(),
  body("ownership").isIn(Object.values(INSTITUTION_OWNERSHIP)).withMessage("ownership is invalid"),
  body("institutionType").optional().isIn(Object.values(INSTITUTION_TYPE)),
  body("website").optional().isURL().withMessage("website must be a valid URL"),
  body("status").optional().isIn(Object.values(RECORD_STATUS)),
  body("metadata.shortName").optional().trim(),
  body("metadata.foundedYear").optional().isInt({ min: 1800, max: new Date().getFullYear() }),
];

const updateInstitutionValidator = [
  body("name").optional().trim().notEmpty(),
  body("state").optional().trim().notEmpty(),
  body("region").optional().trim(),
  body("town").optional().trim(),
  body("ownership").optional().isIn(Object.values(INSTITUTION_OWNERSHIP)),
  body("institutionType").optional().isIn(Object.values(INSTITUTION_TYPE)),
  body("website").optional().isURL(),
  body("status").optional().isIn(Object.values(RECORD_STATUS)),
  body("metadata.competitivenessIndex").optional({ nullable: true }).isFloat({ min: 0, max: 1 }),
];

const listInstitutionsQueryValidator = [
  ...paginationQuery(),
  query("state").optional().isString().trim(),
  query("ownership").optional().isIn(Object.values(INSTITUTION_OWNERSHIP)),
  query("institutionType").optional().isIn(Object.values(INSTITUTION_TYPE)),
  query("search").optional().isString().trim(),
  query("status").optional().isIn(Object.values(RECORD_STATUS)),
];

const addProgrammeOfferingValidator = [body("programme").isMongoId().withMessage("programme must be a valid id")];

module.exports = {
  createInstitutionValidator,
  updateInstitutionValidator,
  listInstitutionsQueryValidator,
  addProgrammeOfferingValidator,
};
