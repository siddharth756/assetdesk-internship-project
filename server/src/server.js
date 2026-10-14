// Purpose: Server entrypoint, database initialization, and HTTP listener
const app = require("./app");
const config = require("./config/env");
const { connectDB } = require("./config/db");

async function startServer() {
  try {
    await connectDB(config.MONGODB_URI);
    const server = app.listen(config.PORT, () => {
      console.log(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
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
