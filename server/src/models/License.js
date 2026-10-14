// Purpose: License model for software seat management and expiry tracking
const mongoose = require("mongoose");
const { startOfToday, addDays } = require("../utils/dates");

const allocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required for license allocation"]
    },
    allocatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const licenseSchema = new mongoose.Schema(
  {
    softwareName: {
      type: String,
      required: [true, "Software name is required"],
      trim: true
    },
    vendor: {
      type: String,
      trim: true,
      default: ""
    },
    licenseKey: {
      type: String,
      required: [true, "License key is required"],
      trim: true
    },
    totalSeats: {
      type: Number,
      required: [true, "Total seats is required"],
      min: [1, "Total seats must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Total seats must be an integer"
      }
    },
    allocations: [allocationSchema],
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"]
    },
    notes: {
      type: String,
      default: ""
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

// Index on expiryDate for fast queries and scheduled expiry jobs
licenseSchema.index({ expiryDate: 1 });

// Virtual: usedSeats
licenseSchema.virtual("usedSeats").get(function () {
  return Array.isArray(this.allocations) ? this.allocations.length : 0;
});

// Virtual: availableSeats
licenseSchema.virtual("availableSeats").get(function () {
  const used = Array.isArray(this.allocations) ? this.allocations.length : 0;
  return Math.max(0, (this.totalSeats || 0) - used);
});

// Virtual: status (EXPIRED if expiryDate < today; EXPIRING if within next 30 days; else ACTIVE)
licenseSchema.virtual("status").get(function () {
  if (!this.expiryDate) return "ACTIVE";
  const today = startOfToday();
  const expiry = new Date(this.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry.getTime() < today.getTime()) {
    return "EXPIRED";
  }
  const thirtyDaysAhead = addDays(today, 30);
  if (expiry.getTime() <= thirtyDaysAhead.getTime()) {
    return "EXPIRING";
  }
  return "ACTIVE";
});

const License = mongoose.model("License", licenseSchema);

module.exports = License;
