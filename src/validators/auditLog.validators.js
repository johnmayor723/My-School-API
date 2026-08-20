const { query } = require("express-validator");
const { paginationQuery } = require("./common.validators");
const { RESOURCE_TYPES } = require("../config/constants");

const listAuditLogsQueryValidator = [
  ...paginationQuery(),
  query("resourceType").optional().isIn(Object.values(RESOURCE_TYPES)),
  query("resourceId").optional().isMongoId(),
  query("action").optional().isString().trim(),
  query("user").optional().isMongoId(),
];

module.exports = { listAuditLogsQueryValidator };
