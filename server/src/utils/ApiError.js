// Purpose: Centralized operational API error class matching the contract envelope
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Contract error code (e.g. VALIDATION_ERROR, NOT_FOUND)
   * @param {string} message - Human readable error message
   * @param {Array} details - Additional field-level or contextual details
   */
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [details];
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details = [], code = "VALIDATION_ERROR") {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = "Unauthorized", details = [], code = "UNAUTHORIZED") {
    return new ApiError(401, code, message, details);
  }

  static forbidden(message = "Forbidden", details = [], code = "FORBIDDEN") {
    return new ApiError(403, code, message, details);
  }

  static notFound(message = "Resource not found", details = [], code = "NOT_FOUND") {
    return new ApiError(404, code, message, details);
  }

  static conflict(message = "Resource conflict", details = [], code = "CONFLICT") {
    return new ApiError(409, code, message, details);
  }

  static tooManyRequests(message = "Too many requests", details = [], code = "RATE_LIMITED") {
    return new ApiError(429, code, message, details);
  }

  static internal(message = "Internal server error", details = [], code = "SERVER_ERROR") {
    return new ApiError(500, code, message, details);
  }
}

module.exports = ApiError;
