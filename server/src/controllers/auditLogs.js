// Purpose: Audit log query controller implementing compliance and activity trail viewing (Module M5)
const mongoose = require("mongoose");
const { AuditLog } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get paginated audit logs with search, action, entity, user, and date range filters
 * @route   GET /api/v1/audit-logs
 * @access  Private (ADMIN only)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.action) {
    query.action = req.query.action;
  }

  if (req.query.entity) {
    query.entity = req.query.entity;
  }

  if (req.query.user && mongoose.Types.ObjectId.isValid(req.query.user)) {
    query.user = req.query.user;
  }

  if (req.query.from || req.query.to) {
    query.createdAt = {};

    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (!isNaN(fromDate.getTime())) {
        query.createdAt.$gte = fromDate;
      }
    }

    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (!isNaN(toDate.getTime())) {
        // If YYYY-MM-DD format (length 10), make inclusive until end of day
        if (typeof req.query.to === "string" && req.query.to.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = toDate;
      }
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, auditLogs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
  ]);

  res.status(200).json({
    success: true,
    data: auditLogs,
    meta: {
      page,
      limit,
      total
    }
  });
});

module.exports = {
  getAuditLogs
};
