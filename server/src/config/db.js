const dns = require("dns");
const mongoose = require("mongoose");

// Ensure DNS SRV resolution for MongoDB Atlas (+srv://) works smoothly on Windows
if (dns && typeof dns.setServers === "function") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (err) {
    // Fall back to system DNS
  }
}

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
