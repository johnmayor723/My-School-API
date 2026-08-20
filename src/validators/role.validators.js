const { body } = require("express-validator");
const { PERMISSIONS } = require("../config/constants");

const createRoleValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("description").optional().trim(),
  body("permissions").isArray({ min: 1 }).withMessage("permissions must include at least one permission"),
  body("permissions.*").isIn(Object.values(PERMISSIONS)),
];

const updateRoleValidator = [
  body("description").optional().trim(),
  body("permissions").optional().isArray(),
  body("permissions.*").optional().isIn(Object.values(PERMISSIONS)),
];

module.exports = { createRoleValidator, updateRoleValidator };
