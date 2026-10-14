// Purpose: Audit log routes with strict ADMIN role protection and query validation
const express = require("express");
const { query } = require("express-validator");

const auditLogsController = require("../controllers/auditLogs");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

const listAuditLogsValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
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
  query("user").optional().isMongoId().withMessage("Invalid user ID filter"),
  query("from").optional().isISO8601().withMessage("From date must be a valid ISO8601 date"),
  query("to").optional().isISO8601().withMessage("To date must be a valid ISO8601 date")
];

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Query immutable audit trail with filters (ADMIN only)
 * @access  Private (ADMIN)
 */
router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  listAuditLogsValidation,
  validate,
  auditLogsController.getAuditLogs
);

module.exports = router;
