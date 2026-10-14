// Purpose: Asset model for IT hardware inventory tracking and status life-cycle
const mongoose = require("mongoose");
const Counter = require("./Counter");

const assetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      unique: true,
      trim: true
    },
    serialNumber: {
      type: String,
      required: [true, "Serial number is required"],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"],
        message: "{VALUE} is not a valid category"
      }
    },
    status: {
      type: String,
      enum: {
        values: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"],
        message: "{VALUE} is not a valid status"
      },
      default: "AVAILABLE"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    warrantyExpiry: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: ""
    }
  },
  {
    timestamps: true,
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

// Indexes specified in contract
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ assignedTo: 1 });

// Pre-validate hook for auto-generating assetTag using Counter
assetSchema.pre("validate", async function (next) {
  try {
    if (!this.assetTag) {
      const year = new Date().getFullYear();
      const seq = await Counter.nextSequence(`asset-${year}`);
      this.assetTag = `AST-${year}-${String(seq).padStart(4, "0")}`;
    }
    if (typeof next === "function") next();
  } catch (err) {
    if (typeof next === "function") next(err);
    else throw err;
  }
});

const Asset = mongoose.model("Asset", assetSchema);

module.exports = Asset;
