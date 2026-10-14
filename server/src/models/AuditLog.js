// Purpose: AuditLog model for immutable compliance logging and activity tracking
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    userName: {
      type: String,
      required: [true, "User name snapshot is required"],
      trim: true
    },
    action: {
      type: String,
      required: [true, "Audit action is required"],
      enum: {
        values: [
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
        ],
        message: "{VALUE} is not a valid audit action"
      }
    },
    entity: {
      type: String,
      required: [true, "Audit entity is required"],
      enum: {
        values: ["AUTH", "USER", "ASSET", "LICENSE", "TICKET"],
        message: "{VALUE} is not a valid audit entity"
      }
    },
    entityId: {
      type: String,
      default: "",
      trim: true
    },
    details: {
      type: String,
      maxlength: [300, "Details cannot exceed 300 characters"],
      default: "",
      trim: true
    },
    ip: {
      type: String,
      default: "",
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
auditLogSchema.index({ createdAt: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

// Append-only enforcement: block any update or delete operations
const blockMutation = function (next) {
  if (this && typeof this.getOptions === "function" && this.getOptions().bypassAuditLock) {
    if (typeof next === "function") return next();
    return;
  }
  const err = new Error("AuditLog is append-only: modifications and deletions are prohibited.");
  if (typeof next === "function") return next(err);
  throw err;
};

[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndRemove"
].forEach((method) => {
  auditLogSchema.pre(method, blockMutation);
});

auditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    const err = new Error("AuditLog is append-only: modifications are prohibited.");
    if (typeof next === "function") return next(err);
    throw err;
  }
  if (typeof next === "function") next();
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
