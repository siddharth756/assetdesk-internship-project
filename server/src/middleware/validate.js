// Purpose: Middleware to run express-validator chains and format validation errors
const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Validates request data against express-validator rules
 * Returns 400 VALIDATION_ERROR with details [{ field, message }]
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const details = result.array().map((err) => ({
      field: err.path || err.param || "unknown",
      message: err.msg
    }));
    return next(new ApiError(400, "VALIDATION_ERROR", "Validation failed", details));
  }
  next();
}

module.exports = validate;
