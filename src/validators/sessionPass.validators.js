const { param, body, query } = require("express-validator");
const { SESSION_PASS_SERVICE_TYPE } = require("../config/constants");

const referenceParamValidator = [param("reference").isString().trim().notEmpty().withMessage("reference is required")];

const initializeValidator = [
  body("serviceType")
    .isIn(Object.values(SESSION_PASS_SERVICE_TYPE))
    .withMessage(`serviceType must be one of: ${Object.values(SESSION_PASS_SERVICE_TYPE).join(", ")}`),
];

const getActiveQueryValidator = [
  query("serviceType").optional().isIn(Object.values(SESSION_PASS_SERVICE_TYPE)),
];

module.exports = { referenceParamValidator, initializeValidator, getActiveQueryValidator };
