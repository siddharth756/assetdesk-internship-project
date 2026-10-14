// Purpose: Support ticket management controller implementing Module M4 operations
const mongoose = require("mongoose");
const { Ticket, User, Asset } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { safeAudit } = require("../middleware/audit");
const { canTransition } = require("../services/ticketRules");

/**
 * @desc    Create a new support ticket
 * @route   POST /api/v1/tickets
 * @access  Private (All authenticated roles)
 */
const createTicket = asyncHandler(async (req, res) => {
  const { title, description, category, priority, relatedAsset } = req.body;

  // Validate relatedAsset if provided
  let validAssetId = null;
  if (relatedAsset) {
    if (!mongoose.Types.ObjectId.isValid(relatedAsset)) {
      throw ApiError.badRequest("Invalid related asset ID");
    }
    const assetExists = await Asset.findById(relatedAsset);
    if (!assetExists) {
      throw ApiError.badRequest("Related asset not found");
    }
    validAssetId = assetExists._id;
  }

  const ticket = await Ticket.create({
    title: String(title).trim(),
    description: String(description).trim(),
    category,
    priority: priority || "MEDIUM",
    relatedAsset: validAssetId,
    createdBy: req.user._id,
    status: "OPEN"
  });

  // Audit log creation
  await safeAudit({
    req,
    user: req.user,
    action: "TICKET_CREATE",
    entity: "TICKET",
    entityId: ticket._id.toString(),
    details: `Created ticket ${ticket.ticketCode} (${ticket.title})`
  });

  await ticket.populate([
    { path: "createdBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
    { path: "relatedAsset", select: "assetTag name" }
  ]);

  res.status(201).json({
    success: true,
    data: ticket
  });
});

/**
 * @desc    Get paginated support tickets with filters, search, and role isolation
 * @route   GET /api/v1/tickets
 * @access  Private (All authenticated roles)
 */
const getTickets = asyncHandler(async (req, res) => {
  const query = {};

  // Rule 6: Employees are automatically restricted to createdBy = self
  if (req.user.role === "EMPLOYEE") {
    query.createdBy = req.user._id;
  } else if (req.query.createdBy && mongoose.Types.ObjectId.isValid(req.query.createdBy)) {
    query.createdBy = req.query.createdBy;
  }

  // Status filter
  if (
    req.query.status &&
    ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(req.query.status)
  ) {
    query.status = req.query.status;
  }

  // Priority filter
  if (
    req.query.priority &&
    ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(req.query.priority)
  ) {
    query.priority = req.query.priority;
  }

  // Category filter
  if (
    req.query.category &&
    ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"].includes(req.query.category)
  ) {
    query.category = req.query.category;
  }

  // AssignedTo filter (userId or 'me' or 'none'/'unassigned')
  if (req.query.assignedTo) {
    if (req.query.assignedTo === "me") {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo === "none" || req.query.assignedTo === "unassigned") {
      query.assignedTo = null;
    } else if (mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
      query.assignedTo = req.query.assignedTo;
    }
  }

  // Overdue filter: not RESOLVED/CLOSED and now > dueAt
  if (req.query.overdue === "true" || req.query.overdue === true) {
    if (query.status) {
      if (["RESOLVED", "CLOSED"].includes(query.status)) {
        query.status = "__NEVER_MATCH__";
      }
    } else {
      query.status = { $nin: ["RESOLVED", "CLOSED"] };
    }
    query.dueAt = { $lt: new Date() };
  }

  // Search filter across title or ticketCode
  const searchTerm = req.query.q || req.query.search;
  if (searchTerm && typeof searchTerm === "string" && searchTerm.trim() !== "") {
    const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { ticketCode: { $regex: escaped, $options: "i" } }
    ];
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const allowedSorts = {
    createdAt: { createdAt: 1 },
    "-createdAt": { createdAt: -1 },
    dueAt: { dueAt: 1 },
    "-dueAt": { dueAt: -1 },
    priority: { priority: 1 },
    "-priority": { priority: -1 },
    status: { status: 1 },
    "-status": { status: -1 },
    title: { title: 1 },
    "-title": { title: -1 }
  };

  const sortOption = allowedSorts[req.query.sort] || { createdAt: -1 };

  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(query),
    Ticket.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("relatedAsset", "assetTag name")
  ]);

  res.status(200).json({
    success: true,
    data: tickets,
    meta: {
      page,
      limit,
      total
    }
  });
});

/**
 * @desc    Get single ticket by ID with comments and author details
 * @route   GET /api/v1/tickets/:id
 * @access  Private (Owner employee or ADMIN/IT_SUPPORT)
 */
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("relatedAsset", "assetTag name category status")
    .populate("comments.author", "name email role");

  if (!ticket) {
    throw ApiError.notFound("Ticket not found");
  }

  // Employee can only access own ticket; otherwise 404 to avoid leaking existence
  if (req.user.role === "EMPLOYEE") {
    const ownerId = ticket.createdBy?._id
      ? ticket.createdBy._id.toString()
      : ticket.createdBy.toString();
    if (ownerId !== req.user._id.toString()) {
      throw ApiError.notFound("Ticket not found");
    }
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});

/**
 * @desc    Assign ticket to staff member (auto transitions OPEN -> IN_PROGRESS)
 * @route   PATCH /api/v1/tickets/:id/assign
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound("Ticket not found");
  }

  if (ticket.status === "CLOSED") {
    throw ApiError.badRequest("Ticket is closed");
  }

  const assignedUser = await User.findById(req.body.assignedTo);
  if (!assignedUser) {
    throw ApiError.badRequest("Assigned user not found");
  }

  if (!assignedUser.isActive) {
    throw ApiError.badRequest("Assigned user is inactive");
  }

  if (assignedUser.role === "EMPLOYEE" || !["ADMIN", "IT_SUPPORT"].includes(assignedUser.role)) {
    throw ApiError.badRequest(
      "Assigned user must be an active administrator or IT support staff"
    );
  }

  ticket.assignedTo = assignedUser._id;

  // Auto transition OPEN -> IN_PROGRESS on assignment
  if (ticket.status === "OPEN") {
    ticket.status = "IN_PROGRESS";
  }

  await ticket.save();

  await safeAudit({
    req,
    user: req.user,
    action: "TICKET_ASSIGN",
    entity: "TICKET",
    entityId: ticket._id.toString(),
    details: `Assigned ticket ${ticket.ticketCode} to ${assignedUser.name}`
  });

  await ticket.populate([
    { path: "createdBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
    { path: "relatedAsset", select: "assetTag name" },
    { path: "comments.author", select: "name email role" }
  ]);

  res.status(200).json({
    success: true,
    data: ticket
  });
});

/**
 * @desc    Update ticket lifecycle status with strict transition rules
 * @route   PATCH /api/v1/tickets/:id/status
 * @access  Private (ADMIN, IT_SUPPORT, or EMPLOYEE reopening own resolved ticket)
 */
const updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound("Ticket not found");
  }

  const newStatus = req.body.status;

  // Employee can never access someone else's ticket (404 to avoid leaking existence)
  if (req.user.role === "EMPLOYEE") {
    const ownerId = ticket.createdBy?._id
      ? ticket.createdBy._id.toString()
      : ticket.createdBy.toString();
    if (ownerId !== req.user._id.toString()) {
      throw ApiError.notFound("Ticket not found");
    }
  }

  // CLOSED tickets cannot be altered under any circumstance (returns 400)
  if (ticket.status === "CLOSED") {
    throw ApiError.badRequest("Ticket is closed");
  }

  // Employee can only reopen their own RESOLVED ticket (RESOLVED -> IN_PROGRESS)
  if (req.user.role === "EMPLOYEE") {
    if (!(ticket.status === "RESOLVED" && newStatus === "IN_PROGRESS")) {
      throw ApiError.forbidden("Employees can only reopen their resolved tickets");
    }
  }

  // Validate state machine transition
  if (!canTransition(ticket.status, newStatus)) {
    throw ApiError.badRequest(
      `Invalid status transition from ${ticket.status} to ${newStatus}`
    );
  }

  // Status-specific transition validations and side effects
  if (newStatus === "IN_PROGRESS") {
    if (!ticket.assignedTo) {
      throw ApiError.badRequest("Assigned user is required to set status to IN_PROGRESS");
    }
    // Reopening clears resolvedAt
    if (ticket.status === "RESOLVED") {
      ticket.resolvedAt = null;
    }
  } else if (newStatus === "RESOLVED") {
    const note = req.body.resolutionNote;
    if (!note || typeof note !== "string" || note.trim().length < 5) {
      throw ApiError.badRequest(
        "Resolution note of at least 5 characters is required to resolve ticket"
      );
    }
    ticket.resolutionNote = note.trim();
    ticket.resolvedAt = new Date();
  } else if (newStatus === "CLOSED") {
    ticket.closedAt = new Date();
  }

  const oldStatus = ticket.status;
  ticket.status = newStatus;
  await ticket.save();

  // Audit log with exact message "from X to Y"
  await safeAudit({
    req,
    user: req.user,
    action: "TICKET_STATUS",
    entity: "TICKET",
    entityId: ticket._id.toString(),
    details: `Status changed from ${oldStatus} to ${newStatus}`
  });

  await ticket.populate([
    { path: "createdBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
    { path: "relatedAsset", select: "assetTag name" },
    { path: "comments.author", select: "name email role" }
  ]);

  res.status(200).json({
    success: true,
    data: ticket
  });
});

/**
 * @desc    Add comment to an open ticket
 * @route   POST /api/v1/tickets/:id/comments
 * @access  Private (ADMIN, IT_SUPPORT, or Owner employee)
 */
const addTicketComment = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound("Ticket not found");
  }

  // CLOSED tickets cannot accept comments
  if (ticket.status === "CLOSED") {
    throw ApiError.badRequest("Ticket is closed");
  }

  // Employee can only comment on own ticket
  if (req.user.role === "EMPLOYEE") {
    const ownerId = ticket.createdBy?._id
      ? ticket.createdBy._id.toString()
      : ticket.createdBy.toString();
    if (ownerId !== req.user._id.toString()) {
      throw ApiError.forbidden("Employees can only comment on their own tickets");
    }
  }

  const comment = {
    author: req.user._id,
    message: String(req.body.message).trim(),
    createdAt: new Date()
  };

  ticket.comments.push(comment);
  await ticket.save();

  await safeAudit({
    req,
    user: req.user,
    action: "TICKET_COMMENT",
    entity: "TICKET",
    entityId: ticket._id.toString(),
    details: `Added comment to ticket ${ticket.ticketCode}`
  });

  await ticket.populate([
    { path: "createdBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
    { path: "relatedAsset", select: "assetTag name" },
    { path: "comments.author", select: "name email role" }
  ]);

  res.status(201).json({
    success: true,
    data: ticket
  });
});

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  addTicketComment
};
