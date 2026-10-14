// Purpose: API v1 root router aggregator mounting module route handlers
const express = require("express");

const authRoutes = require("./auth");
const userRoutes = require("./users");
const assetRoutes = require("./assets");
const licenseRoutes = require("./licenses");
const ticketRoutes = require("./tickets");
const dashboardRoutes = require("./dashboard");
const reportsRoutes = require("./reports");
const auditLogRoutes = require("./auditLogs");

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString()
    }
  });
});

// Module M1: Authentication and User Management
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Module M2: Hardware Assets
router.use("/assets", assetRoutes);

// Module M3: Software Licenses & Expiry Alerts
router.use("/licenses", licenseRoutes);

// Module M4: Support Tickets
router.use("/tickets", ticketRoutes);

// Module M5: Audit Log, Dashboard & Reports
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportsRoutes);
router.use("/audit-logs", auditLogRoutes);

module.exports = router;
