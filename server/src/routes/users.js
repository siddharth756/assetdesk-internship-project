// Purpose: User management routes with role authorization and request validation
const express = require("express");
const { body, param, query } = require("express-validator");

const usersController = require("../controllers/users");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

// Validation chains
const listUsersValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("role")
    .optional()
    .isIn(["ADMIN", "IT_SUPPORT", "EMPLOYEE"])
    .withMessage("Invalid role filter")
];

const createUserValidation = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
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
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one digit"),
  body("role")
    .optional()
    .isIn(["ADMIN", "IT_SUPPORT", "EMPLOYEE"])
    .withMessage("Role must be ADMIN, IT_SUPPORT, or EMPLOYEE"),
  body("department")
    .optional()
    .isString()
    .withMessage("Department must be a string")
    .trim(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
];

const mongoIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid user ID format")
];

const updateUserValidation = [
  param("id").isMongoId().withMessage("Invalid user ID format"),
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("department")
    .optional()
    .isString()
    .withMessage("Department must be a string")
    .trim(),
  body("role")
    .optional()
    .isIn(["ADMIN", "IT_SUPPORT", "EMPLOYEE"])
    .withMessage("Role must be ADMIN, IT_SUPPORT, or EMPLOYEE")
];

const updateStatusValidation = [
  param("id").isMongoId().withMessage("Invalid user ID format"),
  body("isActive")
    .exists()
    .withMessage("isActive field is required")
    .isBoolean()
    .withMessage("isActive must be a boolean")
];

/**
 * @route   GET /api/v1/users/lookup
 * @desc    Lookup active users list for dropdown selectors
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/lookup",
  authenticate,
  requireRole("ADMIN", "IT_SUPPORT"),
  usersController.lookupUsers
);

/**
 * @route   GET /api/v1/users
 * @desc    Get paginated user list
 * @access  Private (ADMIN)
 */
router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  listUsersValidation,
  validate,
  usersController.getUsers
);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private (ADMIN)
 */
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createUserValidation,
  validate,
  usersController.createUser
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user details
 * @access  Private (ADMIN)
 */
router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  mongoIdParamValidation,
  validate,
  usersController.getUserById
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user details
 * @access  Private (ADMIN)
 */
router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateUserValidation,
  validate,
  usersController.updateUser
);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Toggle user active/inactive status
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("ADMIN"),
  updateStatusValidation,
  validate,
  usersController.updateUserStatus
);

module.exports = router;
