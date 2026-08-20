const env = require("../config/env");
const logger = require("../config/logger");
const { AppError } = require("../errors/AppError");

function formatMongooseValidationError(err) {
  const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  return { statusCode: 400, code: "VALIDATION_ERROR", message: "One or more fields are invalid", details };
}

function formatDuplicateKeyError(err) {
  const field = Object.keys(err.keyPattern || {})[0] || "field";
  return {
    statusCode: 409,
    code: "CONFLICT",
    message: `A record with this ${field} already exists`,
    details: undefined,
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected error occurred";
  let details;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === "ValidationError" && err.errors) {
    ({ statusCode, code, message, details } = formatMongooseValidationError(err));
  } else if (err.code === 11000) {
    ({ statusCode, code, message, details } = formatDuplicateKeyError(err));
  } else if (err.name === "CastError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = `Invalid value for ${err.path}`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Invalid or expired token";
  }

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(message, { code, path: req.originalUrl, method: req.method });
  }

  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  if (!env.isProduction && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
