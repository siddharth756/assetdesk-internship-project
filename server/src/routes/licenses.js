// Purpose: Software license inventory routes with authentication, validation, and role authorization
const express = require("express");
const { body, param, query } = require("express-validator");

const licensesController = require("../controllers/licenses");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

// Validation chains
const listLicensesValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["ACTIVE", "EXPIRING", "EXPIRED"])
    .withMessage("Status filter must be ACTIVE, EXPIRING, or EXPIRED"),
  query("sort")
    .optional()
    .isIn([
      "expiryDate",
      "-expiryDate",
      "softwareName",
      "-softwareName",
      "createdAt",
      "-createdAt"
    ])
    .withMessage("Invalid sort field")
];

const expiringLicensesValidation = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days parameter must be an integer between 1 and 365")
];

const createLicenseValidation = [
  body("softwareName")
    .exists({ checkFalsy: true })
    .withMessage("Software name is required")
    .isString()
    .withMessage("Software name must be a string")
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Software name must be between 1 and 150 characters"),
  body("licenseKey")
    .exists({ checkFalsy: true })
    .withMessage("License key is required")
    .isString()
    .withMessage("License key must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("License key must be between 1 and 200 characters"),
  body("totalSeats")
    .exists({ checkFalsy: true })
    .withMessage("Total seats is required")
    .isInt({ min: 1 })
    .withMessage("Total seats must be an integer greater than or equal to 1"),
  body("expiryDate")
    .exists({ checkFalsy: true })
    .withMessage("Expiry date is required")
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO 8601 date"),
  body("vendor")
    .optional()
    .isString()
    .withMessage("Vendor must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Vendor cannot exceed 150 characters"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters")
];

const updateLicenseValidation = [
  param("id").isMongoId().withMessage("Invalid license ID format"),
  body("softwareName")
    .optional()
    .isString()
    .withMessage("Software name must be a string")
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Software name must be between 1 and 150 characters"),
  body("licenseKey")
    .optional()
    .isString()
    .withMessage("License key must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("License key must be between 1 and 200 characters"),
  body("totalSeats")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Total seats must be an integer greater than or equal to 1"),
  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO 8601 date"),
  body("vendor")
    .optional()
    .isString()
    .withMessage("Vendor must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Vendor cannot exceed 150 characters"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters")
];

const allocateSeatValidation = [
  param("id").isMongoId().withMessage("Invalid license ID format"),
  body("userId")
    .exists({ checkFalsy: true })
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format")
];

const releaseSeatValidation = [
  param("id").isMongoId().withMessage("Invalid license ID format"),
  param("userId").isMongoId().withMessage("Invalid user ID format")
];

const mongoIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid license ID format")
];

// All license routes require authentication and ADMIN or IT_SUPPORT role
router.use(authenticate);
router.use(requireRole("ADMIN", "IT_SUPPORT"));

/**
 * @route   GET /api/v1/licenses/expiring
 * @desc    Get licenses expiring within N days or already expired
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/expiring",
  expiringLicensesValidation,
  validate,
  licensesController.getExpiringLicenses
);

/**
 * @route   GET /api/v1/licenses
 * @desc    Get paginated software licenses with search and filters
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/",
  listLicensesValidation,
  validate,
  licensesController.getLicenses
);

/**
 * @route   POST /api/v1/licenses
 * @desc    Create a new software license
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.post(
  "/",
  createLicenseValidation,
  validate,
  licensesController.createLicense
);

/**
 * @route   GET /api/v1/licenses/:id
 * @desc    Get single license details (full key for ADMIN, masked for IT_SUPPORT)
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/:id",
  mongoIdParamValidation,
  validate,
  licensesController.getLicenseById
);

/**
 * @route   PUT /api/v1/licenses/:id
 * @desc    Update editable license fields
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.put(
  "/:id",
  updateLicenseValidation,
  validate,
  licensesController.updateLicense
);

/**
 * @route   POST /api/v1/licenses/:id/allocate
 * @desc    Allocate a license seat to an active user
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.post(
  "/:id/allocate",
  allocateSeatValidation,
  validate,
  licensesController.allocateSeat
);

/**
 * @route   DELETE /api/v1/licenses/:id/allocate/:userId
 * @desc    Release an allocated license seat from a user
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.delete(
  "/:id/allocate/:userId",
  releaseSeatValidation,
  validate,
  licensesController.releaseSeat
);

module.exports = router;
