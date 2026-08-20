class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationAppError extends AppError {
  constructor(message = "Validation failed", details = undefined) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

class ConflictError extends AppError {
  constructor(message = "Request conflicts with current state", details = undefined) {
    super(message, 409, "CONFLICT", details);
  }
}

class PaymentRequiredError extends AppError {
  constructor(message = "Payment is required to access this resource", details = undefined) {
    super(message, 402, "PAYMENT_REQUIRED", details);
  }
}

class BusinessRuleError extends AppError {
  constructor(message = "This request could not be processed", details = undefined) {
    super(message, 422, "BUSINESS_RULE_ERROR", details);
  }
}

module.exports = {
  AppError,
  ValidationAppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentRequiredError,
  BusinessRuleError,
};
