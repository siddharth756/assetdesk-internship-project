// Purpose: MongoDB connection configuration using Mongoose
const mongoose = require("mongoose");

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri) {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected successfully");
  } catch (err) {
    console.error(`MongoDB disconnect error: ${err.message}`);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
