// Purpose: CSV export reports controller implementing Module M5 reporting operations
const mongoose = require("mongoose");
const { Asset, License, Ticket, AuditLog } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { toCsv } = require("../services/csv");
const { safeAudit } = require("../middleware/audit");
const { startOfToday, addDays } = require("../utils/dates");

/**
 * Masks a license key showing only the last 4 characters
 * @param {string} key
 * @returns {string}
 */
function maskLicenseKey(key) {
  if (!key) return "****-****-****";
  const str = String(key);
  const last4 = str.length >= 4 ? str.slice(-4) : str;
  return `****-****-${last4}`;
}

/**
 * Returns today's ISO date string formatted as YYYY-MM-DD
 * @returns {string}
 */
function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Sets attachment headers and sends CSV response
 * @param {Object} res - Express response
 * @param {string} filenamePrefix - Base filename prefix (assets, licenses, tickets, audit)
 * @param {string} csvText - Formatted CSV body
 */
function sendCsvResponse(res, filenamePrefix, csvText) {
  const dateStr = getTodayDateString();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filenamePrefix}-${dateStr}.csv"`
  );
  res.status(200).send(csvText);
}

/**
 * @desc    Export Hardware Assets to CSV
 * @route   GET /api/v1/reports/assets
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const exportAssetsReport = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;
  if (req.query.assigned !== undefined && req.query.assigned !== "") {
    const val = String(req.query.assigned).toLowerCase().trim();
    if (val === "yes" || val === "true") query.assignedTo = { $ne: null };
    else if (val === "no" || val === "false") query.assignedTo = null;
  }

  const assets = await Asset.find(query)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate("assignedTo", "name email");

  const columns = [
    { key: "assetTag", header: "Asset Tag" },
    { key: "name", header: "Asset Name" },
    { key: "category", header: "Category" },
    { key: "status", header: "Status" },
    { key: "serialNumber", header: "Serial Number" },
    { key: "assignedTo", header: "Assigned To" },
    { key: "assignedEmail", header: "Assigned Email" },
    { key: "purchaseDate", header: "Purchase Date" },
    { key: "warrantyExpiry", header: "Warranty Expiry" },
    { key: "notes", header: "Notes" }
  ];

  const rows = assets.map((a) => ({
    assetTag: a.assetTag || "",
    name: a.name || "",
    category: a.category || "",
    status: a.status || "",
    serialNumber: a.serialNumber || "",
    assignedTo: a.assignedTo ? a.assignedTo.name : "Unassigned",
    assignedEmail: a.assignedTo ? a.assignedTo.email : "",
    purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().split("T")[0] : "",
    warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.toISOString().split("T")[0] : "",
    notes: a.notes || ""
  }));

  const csv = toCsv(columns, rows);

  await safeAudit({
    req,
    user: req.user,
    action: "REPORT_EXPORT",
    entity: "ASSET",
    entityId: "assets",
    details: `Exported assets report (${rows.length} rows)`
  });

  sendCsvResponse(res, "assets", csv);
});

/**
 * @desc    Export Software Licenses to CSV (licenseKey masked)
 * @route   GET /api/v1/reports/licenses
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const exportLicensesReport = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status && ["ACTIVE", "EXPIRING", "EXPIRED"].includes(req.query.status)) {
    const today = startOfToday();
    const thirtyDaysAhead = addDays(today, 30);
    thirtyDaysAhead.setHours(23, 59, 59, 999);

    if (req.query.status === "EXPIRED") {
      query.expiryDate = { $lt: today };
    } else if (req.query.status === "EXPIRING") {
      query.expiryDate = { $gte: today, $lte: thirtyDaysAhead };
    } else if (req.query.status === "ACTIVE") {
      query.expiryDate = { $gt: thirtyDaysAhead };
    }
  }

  const licenses = await License.find(query)
    .sort({ createdAt: -1 })
    .limit(5000);

  const columns = [
    { key: "softwareName", header: "Software Name" },
    { key: "vendor", header: "Vendor" },
    { key: "licenseKey", header: "License Key" },
    { key: "totalSeats", header: "Total Seats" },
    { key: "usedSeats", header: "Used Seats" },
    { key: "availableSeats", header: "Available Seats" },
    { key: "expiryDate", header: "Expiry Date" },
    { key: "status", header: "Status" },
    { key: "notes", header: "Notes" }
  ];

  const rows = licenses.map((lic) => {
    const plain = lic.toJSON();
    return {
      softwareName: plain.softwareName || "",
      vendor: plain.vendor || "",
      licenseKey: maskLicenseKey(plain.licenseKey),
      totalSeats: plain.totalSeats || 0,
      usedSeats: plain.usedSeats || 0,
      availableSeats: plain.availableSeats !== undefined ? plain.availableSeats : 0,
      expiryDate: plain.expiryDate ? new Date(plain.expiryDate).toISOString().split("T")[0] : "",
      status: plain.status || "",
      notes: plain.notes || ""
    };
  });

  const csv = toCsv(columns, rows);

  await safeAudit({
    req,
    user: req.user,
    action: "REPORT_EXPORT",
    entity: "LICENSE",
    entityId: "licenses",
    details: `Exported licenses report (${rows.length} rows)`
  });

  sendCsvResponse(res, "licenses", csv);
});

/**
 * @desc    Export Support Tickets to CSV
 * @route   GET /api/v1/reports/tickets
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const exportTicketsReport = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.category) query.category = req.query.category;
  if (req.query.priority) query.priority = req.query.priority;

  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("relatedAsset", "assetTag name");

  const columns = [
    { key: "ticketCode", header: "Ticket Code" },
    { key: "title", header: "Title" },
    { key: "category", header: "Category" },
    { key: "priority", header: "Priority" },
    { key: "status", header: "Status" },
    { key: "createdBy", header: "Created By" },
    { key: "createdEmail", header: "Created Email" },
    { key: "assignedTo", header: "Assigned To" },
    { key: "relatedAsset", header: "Related Asset" },
    { key: "dueAt", header: "Due At" },
    { key: "resolvedAt", header: "Resolved At" },
    { key: "closedAt", header: "Closed At" },
    { key: "resolutionNote", header: "Resolution Note" },
    { key: "createdAt", header: "Created At" }
  ];

  const rows = tickets.map((t) => ({
    ticketCode: t.ticketCode || "",
    title: t.title || "",
    category: t.category || "",
    priority: t.priority || "",
    status: t.status || "",
    createdBy: t.createdBy ? t.createdBy.name : "",
    createdEmail: t.createdBy ? t.createdBy.email : "",
    assignedTo: t.assignedTo ? t.assignedTo.name : "Unassigned",
    relatedAsset: t.relatedAsset ? t.relatedAsset.assetTag : "",
    dueAt: t.dueAt ? t.dueAt.toISOString() : "",
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : "",
    closedAt: t.closedAt ? t.closedAt.toISOString() : "",
    resolutionNote: t.resolutionNote || "",
    createdAt: t.createdAt ? t.createdAt.toISOString() : ""
  }));

  const csv = toCsv(columns, rows);

  await safeAudit({
    req,
    user: req.user,
    action: "REPORT_EXPORT",
    entity: "TICKET",
    entityId: "tickets",
    details: `Exported tickets report (${rows.length} rows)`
  });

  sendCsvResponse(res, "tickets", csv);
});

/**
 * @desc    Export Audit Logs to CSV
 * @route   GET /api/v1/reports/audit
 * @access  Private (ADMIN only)
 */
const exportAuditReport = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.action) query.action = req.query.action;
  if (req.query.entity) query.entity = req.query.entity;
  if (req.query.user && mongoose.Types.ObjectId.isValid(req.query.user)) {
    query.user = req.query.user;
  }
  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (!isNaN(fromDate.getTime())) query.createdAt.$gte = fromDate;
    }
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (!isNaN(toDate.getTime())) {
        if (typeof req.query.to === "string" && req.query.to.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = toDate;
      }
    }
  }

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate("user", "name email");

  const columns = [
    { key: "createdAt", header: "Timestamp" },
    { key: "userName", header: "User Name" },
    { key: "action", header: "Action" },
    { key: "entity", header: "Entity" },
    { key: "entityId", header: "Entity ID" },
    { key: "details", header: "Details" },
    { key: "ip", header: "IP Address" }
  ];

  const rows = logs.map((l) => ({
    createdAt: l.createdAt ? l.createdAt.toISOString() : "",
    userName: l.userName || "",
    action: l.action || "",
    entity: l.entity || "",
    entityId: l.entityId || "",
    details: l.details || "",
    ip: l.ip || ""
  }));

  const csv = toCsv(columns, rows);

  await safeAudit({
    req,
    user: req.user,
    action: "REPORT_EXPORT",
    entity: "AUTH",
    entityId: "audit",
    details: `Exported audit logs report (${rows.length} rows)`
  });

  sendCsvResponse(res, "audit", csv);
});

module.exports = {
  exportAssetsReport,
  exportLicensesReport,
  exportTicketsReport,
  exportAuditReport
};
