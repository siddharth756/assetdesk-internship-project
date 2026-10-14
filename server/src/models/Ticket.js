// Purpose: Ticket model for IT support requests, priority SLA calculation, and lifecycle tracking
const mongoose = require("mongoose");
const Counter = require("./Counter");
const { computeDueAt, isOverdue } = require("../services/ticketRules");

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"]
    },
    message: {
      type: String,
      required: [true, "Comment message is required"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"]
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"],
        message: "{VALUE} is not a valid category"
      }
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: {
        values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        message: "{VALUE} is not a valid priority"
      },
      default: "MEDIUM"
    },
    status: {
      type: String,
      enum: {
        values: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
        message: "{VALUE} is not a valid status"
      },
      default: "OPEN"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"]
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    relatedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null
    },
    comments: [commentSchema],
    resolutionNote: {
      type: String,
      default: ""
    },
    dueAt: {
      type: Date
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
ticketSchema.index({ status: 1, assignedTo: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ dueAt: 1 });

// Virtual for isOverdue
ticketSchema.virtual("isOverdue").get(function () {
  return isOverdue(this);
});

// Pre-validate hook for auto-generating ticketCode and calculating dueAt
ticketSchema.pre("validate", async function (next) {
  try {
    if (!this.ticketCode) {
      const year = new Date().getFullYear();
      const seq = await Counter.nextSequence(`ticket-${year}`);
      this.ticketCode = `TCK-${year}-${String(seq).padStart(4, "0")}`;
    }

    if (!this.dueAt && this.priority) {
      this.dueAt = computeDueAt(this.priority, this.createdAt || new Date());
    }

    if (typeof next === "function") next();
  } catch (err) {
    if (typeof next === "function") next(err);
    else throw err;
  }
});

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
