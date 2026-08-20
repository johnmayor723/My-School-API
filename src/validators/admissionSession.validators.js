const { body } = require("express-validator");
const { ADMISSION_SESSION_STATUS } = require("../config/constants");

const createSessionValidator = [
  body("name").trim().notEmpty().withMessage("name is required, e.g. 2026/2027"),
  body("startDate").optional().isISO8601().toDate(),
  body("endDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(Object.values(ADMISSION_SESSION_STATUS)),
  body("isActive").optional().isBoolean(),
];

const updateSessionValidator = [
  body("startDate").optional().isISO8601().toDate(),
  body("endDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(Object.values(ADMISSION_SESSION_STATUS)),
  body("isActive").optional().isBoolean(),
];

module.exports = { createSessionValidator, updateSessionValidator };
