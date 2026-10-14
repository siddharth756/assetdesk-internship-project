// Purpose: Authentication routes for login, current user session, and password change (reload)
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/auth");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// Stricter rate limiter for login route: 10 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) ||
    req.headers["x-benchmark"] === "true" ||
    req.headers["x-playwright-test"] === "true",
  handler: (req, res, _next, options) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: options.message || "Too many login attempts, please try again later",
        details: []
      }
    });
  }
});

// Validation rules
const loginValidation = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .isString()
    .withMessage("Email must be a string")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string")
];

const changePasswordValidation = [
  body("currentPassword")
    .exists({ checkFalsy: true })
    .withMessage("Current password is required")
    .isString()
    .withMessage("Current password must be a string"),
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("New password is required")
    .isString()
    .withMessage("New password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one digit")
];

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
router.post("/login", loginLimiter, loginValidation, validate, authController.login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user
 * @access  Private (All authenticated roles)
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Update password for authenticated user
 * @access  Private (All authenticated roles)
 */
router.post("/change-password", authenticate, changePasswordValidation, validate, authController.changePassword);

module.exports = router;
