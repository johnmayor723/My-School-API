const { validationResult } = require("express-validator");
const { ValidationAppError } = require("../errors/AppError");

/**
 * Runs an array of express-validator chains, then rejects with a single
 * consistent ValidationAppError if any of them failed.
 */
function validate(chains) {
  return [
    ...chains,
    (req, res, next) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();
      const details = result.array({ onlyFirstError: true }).map((err) => ({
        field: err.path,
        message: err.msg,
      }));
      throw new ValidationAppError("One or more fields are invalid", details);
    },
  ];
}

module.exports = { validate };
