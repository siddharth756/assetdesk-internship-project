// Purpose: Server entrypoint, database initialization, and HTTP listener
const app = require("./app");
const config = require("./config/env");
const { connectDB } = require("./config/db");
const { startLicenseExpiryJob } = require("./jobs/licenseExpiryJob");

async function startServer() {
  try {
    await connectDB(config.MONGODB_URI);
    const server = app.listen(config.PORT, () => {
      console.log(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
    });

    let cronTask = null;
    if (config.NODE_ENV !== "test") {
      cronTask = startLicenseExpiryJob();
    }

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      if (cronTask && typeof cronTask.stop === "function") {
        cronTask.stop();
      }
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

