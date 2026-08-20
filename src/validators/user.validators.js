const { body, query } = require("express-validator");
const { USER_STATUS } = require("../config/constants");
const { paginationQuery } = require("./common.validators");

const createStaffUserValidator = [
  body("firstName").trim().notEmpty(),
  body("lastName").trim().notEmpty(),
  body("email").trim().isEmail().normalizeEmail(),
  body("phone").optional().trim(),
  body("password").isString().isLength({ min: 8 }).withMessage("password must be at least 8 characters long"),
  body("roles").isArray({ min: 1 }).withMessage("roles must include at least one role id"),
  body("roles.*").isMongoId(),
];

const updateStaffUserValidator = [
  body("firstName").optional().trim().notEmpty(),
  body("lastName").optional().trim().notEmpty(),
  body("phone").optional().trim(),
  body("roles").optional().isArray(),
  body("roles.*").optional().isMongoId(),
  body("status").optional().isIn(Object.values(USER_STATUS)),
];

const listUsersQueryValidator = [
  ...paginationQuery(),
  query("userType").optional().isIn(["student", "staff"]),
  query("status").optional().isIn(Object.values(USER_STATUS)),
  query("search").optional().isString().trim(),
];

module.exports = { createStaffUserValidator, updateStaffUserValidator, listUsersQueryValidator };
