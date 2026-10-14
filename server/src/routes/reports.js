// Purpose: CSV reports routes with role authorization and validation
const express = require("express");
const { query } = require("express-validator");

const reportsController = require("../controllers/reports");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

const assetsReportValidation = [
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
    .withMessage("Assigned filter must be 'yes' or 'no'")
];

const licensesReportValidation = [
  query("status")
    .optional()
    .isIn(["ACTIVE", "EXPIRING", "EXPIRED"])
    .withMessage("Invalid status filter")
];

const ticketsReportValidation = [
  query("status")
    .optional()
    .isIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
    .withMessage("Invalid status filter"),
  query("category")
    .optional()
    .isIn(["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"])
    .withMessage("Invalid category filter"),
  query("priority")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .withMessage("Invalid priority filter")
];

const auditReportValidation = [
  query("action")
    .optional()
    .isIn([
      "LOGIN",
      "LOGIN_FAILED",
      "USER_CREATE",
      "USER_UPDATE",
      "USER_STATUS",
      "PASSWORD_CHANGE",
      "ASSET_CREATE",
      "ASSET_UPDATE",
      "ASSET_ASSIGN",
      "ASSET_UNASSIGN",
      "ASSET_STATUS",
      "LICENSE_CREATE",
      "LICENSE_UPDATE",
      "LICENSE_ALLOCATE",
      "LICENSE_RELEASE",
      "LICENSE_EXPIRY_ALERT",
      "TICKET_CREATE",
      "TICKET_ASSIGN",
      "TICKET_STATUS",
      "TICKET_COMMENT",
      "REPORT_EXPORT"
    ])
    .withMessage("Invalid action filter"),
  query("entity")
    .optional()
    .isIn(["AUTH", "USER", "ASSET", "LICENSE", "TICKET"])
    .withMessage("Invalid entity filter"),
  query("user").optional().isMongoId().withMessage("Invalid user ID"),
  query("from").optional().isISO8601().withMessage("From date must be a valid ISO8601 date"),
  query("to").optional().isISO8601().withMessage("To date must be a valid ISO8601 date")
];

/**
 * @route   GET /api/v1/reports/assets
 * @desc    Export Hardware Assets report as CSV
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/assets",
  authenticate,
  requireRole("ADMIN", "IT_SUPPORT"),
  assetsReportValidation,
  validate,
  reportsController.exportAssetsReport
);

/**
 * @route   GET /api/v1/reports/licenses
 * @desc    Export Software Licenses report as CSV (licenseKey masked)
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/licenses",
  authenticate,
  requireRole("ADMIN", "IT_SUPPORT"),
  licensesReportValidation,
  validate,
  reportsController.exportLicensesReport
);

/**
 * @route   GET /api/v1/reports/tickets
 * @desc    Export Support Tickets report as CSV
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.get(
  "/tickets",
  authenticate,
  requireRole("ADMIN", "IT_SUPPORT"),
  ticketsReportValidation,
  validate,
  reportsController.exportTicketsReport
);

/**
 * @route   GET /api/v1/reports/audit
 * @desc    Export Audit Log report as CSV (ADMIN only)
 * @access  Private (ADMIN)
 */
router.get(
  "/audit",
  authenticate,
  requireRole("ADMIN"),
  auditReportValidation,
  validate,
  reportsController.exportAuditReport
);

module.exports = router;
