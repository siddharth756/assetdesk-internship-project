// Purpose: API v1 root router aggregator mounting module route handlers
const express = require("express");

const authRoutes = require("./auth");
const userRoutes = require("./users");

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
const assetRoutes = require("./assets");
const licenseRoutes = require("./licenses");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Module M2: Hardware Assets
router.use("/assets", assetRoutes);

// Module M3: Software Licenses & Expiry Alerts
router.use("/licenses", licenseRoutes);

module.exports = router;

