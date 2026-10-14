// Purpose: Centralized error handling middleware formatting all errors to the contract envelope
const ApiError = require("../utils/ApiError");

/**
 * Global error handler middleware
 * Formats errors to: { success: false, error: { code, message, details } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || "SERVER_ERROR";
  let message = err.message || "Internal server error";
  let details = err.details || [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message
    }));
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = "CONFLICT";
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    message = `Duplicate value '${value}' for field '${field}'. Must be unique.`;
    details = [{ field, message: `Field '${field}' must be unique` }];
  } else if (err.name === "CastError") {
    // Mongoose cast error (invalid ObjectId, date, etc.)
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = `Invalid ${err.path}: ${err.value}`;
    details = [{ field: err.path, message: "Invalid identifier or format" }];
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Invalid token";
    details = [];
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Token has expired";
    details = [];
  } else {
    // Generic or unexpected error
    if (process.env.NODE_ENV === "production" && statusCode === 500) {
      message = "Internal server error";
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}

module.exports = errorHandler;
