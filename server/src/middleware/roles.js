// Purpose: Role-based authorization middleware
const ApiError = require("../utils/ApiError");

/**
 * Authorize only users with specified roles
 * @param  {...string} allowedRoles - Allowed role names (ADMIN, IT_SUPPORT, EMPLOYEE)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: requires one of [${allowedRoles.join(", ")}] roles. Your role is ${req.user.role}.`
        )
      );
    }

    next();
  };
}

module.exports = requireRole;
