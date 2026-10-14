// Purpose: Dashboard routes with authentication
const express = require("express");
const dashboardController = require("../controllers/dashboard");
const authenticate = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/v1/dashboard/summary
 * @desc    Get dashboard metrics (role-aware: full summary for ADMIN/IT_SUPPORT, personal for EMPLOYEE)
 * @access  Private (All authenticated roles)
 */
router.get("/summary", authenticate, dashboardController.getDashboardSummary);

module.exports = router;
