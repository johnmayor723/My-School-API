const { body } = require("express-validator");

const compareValidator = [
  body("assessmentId").isMongoId().withMessage("assessmentId must be a valid id"),
  body("institutionIds").isArray({ min: 2, max: 5 }).withMessage("institutionIds must list between 2 and 5 institutions"),
  body("institutionIds.*").isMongoId(),
];

module.exports = { compareValidator };
