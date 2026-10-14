// Purpose: JWT authentication verification middleware
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Authenticates incoming request using Bearer JWT
 * Verifies token signature, loads active user, and attaches to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Authentication token required"));
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(ApiError.unauthorized("Authentication token required"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(ApiError.unauthorized("Token has expired"));
      }
      return next(ApiError.unauthorized("Invalid or tampered token"));
    }

    if (!decoded || !decoded.id) {
      return next(ApiError.unauthorized("Invalid token payload"));
    }

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return next(ApiError.unauthorized("User not found or session invalid"));
    }

    if (!user.isActive) {
      return next(ApiError.unauthorized("User account is inactive"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
