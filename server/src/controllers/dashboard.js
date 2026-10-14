// Purpose: Dashboard summary metrics controller implementing role-aware analytics (Module M5)
const { Asset, License, Ticket, AuditLog } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { startOfToday, addDays } = require("../utils/dates");

/**
 * @desc    Get role-aware dashboard summary metrics
 * @route   GET /api/v1/dashboard/summary
 * @access  Private (All authenticated roles)
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const role = req.user.role;

  // EMPLOYEE personal dashboard summary
  if (role === "EMPLOYEE") {
    const [myAssetsCount, myOpenTickets, myRecentTickets] = await Promise.all([
      Asset.countDocuments({ assignedTo: req.user._id }),
      Ticket.countDocuments({
        createdBy: req.user._id,
        status: { $in: ["OPEN", "IN_PROGRESS"] }
      }),
      Ticket.find({ createdBy: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignedTo", "name email")
        .populate("relatedAsset", "assetTag name")
    ]);

    return res.status(200).json({
      success: true,
      data: {
        myAssetsCount,
        myOpenTickets,
        myRecentTickets
      }
    });
  }

  // ADMIN and IT_SUPPORT organizational dashboard summary
  const today = startOfToday();
  const thirtyDaysAhead = addDays(today, 30);
  thirtyDaysAhead.setHours(23, 59, 59, 999);

  const [
    assetsTotal,
    assetStatusAgg,
    assetCatAgg,
    licensesExpired,
    licensesExpiring,
    ticketStatusAgg,
    ticketsOverdue,
    recentTickets,
    recentAudit
  ] = await Promise.all([
    Asset.countDocuments(),
    Asset.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Asset.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    License.countDocuments({ expiryDate: { $lt: today } }),
    License.countDocuments({ expiryDate: { $gte: today, $lte: thirtyDaysAhead } }),
    Ticket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Ticket.countDocuments({
      status: { $nin: ["RESOLVED", "CLOSED"] },
      dueAt: { $lt: new Date() }
    }),
    Ticket.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("relatedAsset", "assetTag name"),
    role === "ADMIN"
      ? AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "name email")
      : Promise.resolve(null)
  ]);

  // Map aggregated counts to complete enum object structures
  const assetsByStatus = {
    AVAILABLE: 0,
    ASSIGNED: 0,
    MAINTENANCE: 0,
    RETIRED: 0
  };
  assetStatusAgg.forEach((item) => {
    if (item._id && assetsByStatus[item._id] !== undefined) {
      assetsByStatus[item._id] = item.count;
    }
  });

  const assetsByCategory = {
    LAPTOP: 0,
    DESKTOP: 0,
    MONITOR: 0,
    PRINTER: 0,
    NETWORK: 0,
    MOBILE: 0,
    OTHER: 0
  };
  assetCatAgg.forEach((item) => {
    if (item._id && assetsByCategory[item._id] !== undefined) {
      assetsByCategory[item._id] = item.count;
    }
  });

  const ticketsByStatus = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0
  };
  ticketStatusAgg.forEach((item) => {
    if (item._id && ticketsByStatus[item._id] !== undefined) {
      ticketsByStatus[item._id] = item.count;
    }
  });

  const responseData = {
    assetsTotal,
    assetsByStatus,
    assetsByCategory,
    licensesExpiring,
    licensesExpired,
    ticketsByStatus,
    ticketsOverdue,
    recentTickets
  };

  // Contract: recentAudit (5, admin only)
  if (role === "ADMIN") {
    responseData.recentAudit = recentAudit || [];
  }

  res.status(200).json({
    success: true,
    data: responseData
  });
});

module.exports = {
  getDashboardSummary
};
