// Purpose: Support ticket routes with authentication, role authorization, and request validation
const express = require("express");
const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

const ticketsController = require("../controllers/tickets");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const validate = require("../middleware/validate");

const router = express.Router();

// Validation chains
const ticketIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID")
];

const listTicketsValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
    .withMessage("Invalid status filter"),
  query("priority")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .withMessage("Invalid priority filter"),
  query("category")
    .optional()
    .isIn(["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"])
    .withMessage("Invalid category filter"),
  query("assignedTo")
    .optional()
    .custom((val) => {
      if (val === "me" || val === "none" || val === "unassigned") return true;
      if (mongoose.Types.ObjectId.isValid(val)) return true;
      throw new Error("Invalid assignedTo filter");
    }),
  query("overdue")
    .optional()
    .isIn(["true", "false"])
    .withMessage("Overdue filter must be 'true' or 'false'"),
  query("sort")
    .optional()
    .isIn([
      "createdAt",
      "-createdAt",
      "dueAt",
      "-dueAt",
      "priority",
      "-priority",
      "status",
      "-status",
      "title",
      "-title"
    ])
    .withMessage("Invalid sort field")
];

const createTicketValidation = [
  body("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),
  body("description")
    .exists({ checkFalsy: true })
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("category")
    .exists({ checkFalsy: true })
    .withMessage("Category is required")
    .isIn(["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"])
    .withMessage("Invalid category"),
  body("priority")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .withMessage("Invalid priority"),
  body("relatedAsset")
    .optional({ values: "null" })
    .custom((val) => {
      if (!val) return true;
      if (mongoose.Types.ObjectId.isValid(val)) return true;
      throw new Error("Invalid related asset ID");
    })
];

const assignTicketValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("assignedTo")
    .exists({ checkFalsy: true })
    .withMessage("Assigned user ID is required")
    .isMongoId()
    .withMessage("Invalid assigned user ID")
];

const updateStatusValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("status")
    .exists({ checkFalsy: true })
    .withMessage("Status is required")
    .isIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
    .withMessage("Invalid status"),
  body("resolutionNote")
    .optional()
    .isString()
    .withMessage("Resolution note must be a string")
];

const addCommentValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("message")
    .exists({ checkFalsy: true })
    .withMessage("Comment message is required")
    .isString()
    .withMessage("Comment message must be a string")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment message must be between 1 and 1000 characters")
];

/**
 * @route   GET /api/v1/tickets
 * @desc    List tickets with filters (employees automatically restricted to own tickets)
 * @access  Private
 */
router.get("/", authenticate, listTicketsValidation, validate, ticketsController.getTickets);

/**
 * @route   POST /api/v1/tickets
 * @desc    Create a new support ticket
 * @access  Private
 */
router.post("/", authenticate, createTicketValidation, validate, ticketsController.createTicket);

/**
 * @route   GET /api/v1/tickets/:id
 * @desc    Get ticket by ID (employees only if owner)
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  ticketIdParamValidation,
  validate,
  ticketsController.getTicketById
);

/**
 * @route   PATCH /api/v1/tickets/:id/assign
 * @desc    Assign ticket to staff (auto moves OPEN -> IN_PROGRESS)
 * @access  Private (ADMIN, IT_SUPPORT)
 */
router.patch(
  "/:id/assign",
  authenticate,
  requireRole("ADMIN", "IT_SUPPORT"),
  assignTicketValidation,
  validate,
  ticketsController.assignTicket
);

/**
 * @route   PATCH /api/v1/tickets/:id/status
 * @desc    Update ticket status following lifecycle rules
 * @access  Private
 */
router.patch(
  "/:id/status",
  authenticate,
  updateStatusValidation,
  validate,
  ticketsController.updateTicketStatus
);

/**
 * @route   POST /api/v1/tickets/:id/comments
 * @desc    Add comment to ticket
 * @access  Private
 */
router.post(
  "/:id/comments",
  authenticate,
  addCommentValidation,
  validate,
  ticketsController.addTicketComment
);

module.exports = router;
