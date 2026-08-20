const { body, param, query } = require("express-validator");
const { paginationQuery } = require("./common.validators");
const { PAYMENT_STATUS } = require("../config/constants");

const referenceParamValidator = [param("reference").isString().trim().notEmpty().withMessage("reference is required")];

const initializePaymentValidator = [body("assessmentId").isMongoId().withMessage("assessmentId must be a valid id")];

const listPaymentsQueryValidator = [
  ...paginationQuery(),
  query("status").optional().isIn(Object.values(PAYMENT_STATUS)),
  query("user").optional().isMongoId(),
];

module.exports = { referenceParamValidator, initializePaymentValidator, listPaymentsQueryValidator };
