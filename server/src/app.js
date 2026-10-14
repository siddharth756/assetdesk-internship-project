// Purpose: Express application setup with middleware, security, routes, and error handling
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config/env");
const routes = require("./routes");
const ApiError = require("./utils/ApiError");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration restricted to client origin
app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true
  })
);

// HTTP request logger (skip in test environment)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// JSON body parser with 100kb payload limit
app.use(express.json({ limit: "100kb" }));

// URL encoded body parser
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// General API rate limiter (300 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res, _next, options) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: options.message || "Too many requests from this IP, please try again later",
        details: []
      }
    });
  }
});

app.use("/api/v1", apiLimiter);

// Mount API routes
app.use("/api/v1", routes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new ApiError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
