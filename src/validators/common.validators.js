const { param, query } = require("express-validator");

const mongoIdParam = (name = "id") => param(name).isMongoId().withMessage(`${name} must be a valid id`);

const paginationQuery = () => [
  query("page").optional().isInt({ min: 1 }).toInt().withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt().withMessage("limit must be between 1 and 100"),
];

module.exports = { mongoIdParam, paginationQuery };
