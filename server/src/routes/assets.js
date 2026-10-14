// Purpose: Hardware asset inventory routes with authentication, validation, and role authorization
const express = require("express");
const { body, param, query } = require("express-validator");

const assetsController = require("../controllers/assets");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

// Validation chains
const listAssetsValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("category")
    .optional()
    .isIn(["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"])
    .withMessage("Invalid category filter"),
  query("status")
    .optional()
    .isIn(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"])
    .withMessage("Invalid status filter"),
  query("assigned")
    .optional()
    .isIn(["yes", "no", "true", "false"])
    .withMessage("Assigned filter must be 'yes' or 'no'"),
  query("sort")
    .optional()
    .isIn(["createdAt", "-createdAt", "name", "-name", "assetTag", "-assetTag"])
    .withMessage("Invalid sort field")
];

const createAssetValidation = [
  body("serialNumber")
    .exists({ checkFalsy: true })
    .withMessage("Serial number is required")
    .isString()
    .withMessage("Serial number must be a string")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Serial number must be between 1 and 100 characters"),
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("category")
    .exists({ checkFalsy: true })
    .withMessage("Category is required")
    .isIn(["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"])
    .withMessage("Invalid category"),
  body("purchaseDate")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Purchase date must be a valid ISO 8601 date"),
  body("warrantyExpiry")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Warranty expiry must be a valid ISO 8601 date"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters")
];

const updateAssetValidation = [
  param("id").isMongoId().withMessage("Invalid asset ID format"),
  body("serialNumber")
    .optional()
    .isString()
    .withMessage("Serial number must be a string")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Serial number must be between 1 and 100 characters"),
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("category")
    .optional()
    .isIn(["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"])
    .withMessage("Invalid category"),
  body("purchaseDate")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Purchase date must be a valid ISO 8601 date"),
  body("warrantyExpiry")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Warranty expiry must be a valid ISO 8601 date"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters")
];

const assignAssetValidation = [
  param("id").isMongoId().withMessage("Invalid asset ID format"),
  body("userId")
    .exists({ checkFalsy: true })
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format")
];

const statusAssetValidation = [
  param("id").isMongoId().withMessage("Invalid asset ID format"),
  body("status")
    .exists({ checkFalsy: true })
    .withMessage("Status is required")
    .isIn(["AVAILABLE", "MAINTENANCE", "RETIRED"])
    .withMessage("Status must be AVAILABLE, MAINTENANCE, or RETIRED")
];

const mongoIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid asset ID format")
];

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/assets/mine
 * @desc    Get assets assigned to current user (any authenticated role)
 * @access  Private (All roles)
 */
router.get("/mine", assetsController.getMyAssets);

/**
 * @route   GET /api/v1/assets
 * @desc    Get paginated assets with search and filters
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/",
  requireRole("ADMIN", "IT_SUPPORT"),
  listAssetsValidation,
  validate,
  assetsController.getAssets
);

/**
 * @route   POST /api/v1/assets
 * @desc    Create a new hardware asset
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.post(
  "/",
  requireRole("ADMIN", "IT_SUPPORT"),
  createAssetValidation,
  validate,
  assetsController.createAsset
);

/**
 * @route   GET /api/v1/assets/:id
 * @desc    Get single asset details
 * @access  Private (ADMIN, IT_SUPPORT, or EMPLOYEE if assigned to them)
 */
router.get(
  "/:id",
  mongoIdParamValidation,
  validate,
  assetsController.getAssetById
);

/**
 * @route   PUT /api/v1/assets/:id
 * @desc    Update editable asset fields
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.put(
  "/:id",
  requireRole("ADMIN", "IT_SUPPORT"),
  updateAssetValidation,
  validate,
  assetsController.updateAsset
);

/**
 * @route   PATCH /api/v1/assets/:id/assign
 * @desc    Assign asset to user
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.patch(
  "/:id/assign",
  requireRole("ADMIN", "IT_SUPPORT"),
  assignAssetValidation,
  validate,
  assetsController.assignAsset
);

/**
 * @route   PATCH /api/v1/assets/:id/unassign
 * @desc    Unassign asset
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.patch(
  "/:id/unassign",
  requireRole("ADMIN", "IT_SUPPORT"),
  mongoIdParamValidation,
  validate,
  assetsController.unassignAsset
);

/**
 * @route   PATCH /api/v1/assets/:id/status
 * @desc    Update asset status
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.patch(
  "/:id/status",
  requireRole("ADMIN", "IT_SUPPORT"),
  statusAssetValidation,
  validate,
  assetsController.updateAssetStatus
);

module.exports = router;
