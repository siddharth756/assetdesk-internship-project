// Purpose: Counter model for atomic sequential ID generation (AST-YYYY-0001, TCK-YYYY-0001)
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

/**
 * Atomically increments and returns the next sequence number for a given key
 * @param {string} key - Counter identifier (e.g. "asset-2026", "ticket-2026")
 * @returns {Promise<number>}
 */
counterSchema.statics.nextSequence = async function (key) {
  const counter = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
