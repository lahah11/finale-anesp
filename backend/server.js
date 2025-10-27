const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const Logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 5000;

// Disable ETag and enforce no-cache for dynamic API responses
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// **UPDATED: Environment-aware rate limiting**
const isDevelopment = process.env.NODE_ENV === "development";

// General rate limiting (more lenient in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 1000, // 10000 in dev, 1000 in prod
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for localhost
  skip: (req) => {
    if (isDevelopment) {
      const isLocalhost =
        req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip === "::ffff:127.0.0.1";
      return isLocalhost;
    }
    return false;
  },
});

app.use("/api", limiter);

// **UPDATED: Much more lenient auth rate limiting**
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 20, // 1000 attempts in dev, 20 in prod
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: Math.round(15 * 60), // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip auth rate limiting in development for localhost
  skip: (req) => {
    if (isDevelopment) {
      const isLocalhost =
        req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip === "::ffff:127.0.0.1";
      Logger.info(
        `Auth request from ${req.ip}, localhost: ${isLocalhost}, skipping rate limit: ${isLocalhost}`
      );
      return isLocalhost;
    }
    return false;
  },
  // Custom handler for better error responses
  handler: (req, res) => {
    Logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
      retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000) || 900, // seconds
      resetTime: new Date(Date.now() + req.rateLimit.msBeforeNext),
    });
  },
});

// Apply auth limiter only if not skipped
app.use("/api/auth/login", authLimiter);

// **UPDATED: Simplified CORS configuration for development**
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      'https://som.uat.anetat.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      Logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Cache-Control",
    "Pragma",
    "Expires"
  ],
  exposedHeaders: ["*"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// **NEW: Handle preflight OPTIONS requests explicitly**
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files (PDFs, images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/pdf/orders', express.static(path.join(__dirname, 'uploads', 'orders')));

// Static files serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// **UPDATED: Request logging middleware with better info**
app.use((req, res, next) => {
  const start = Date.now();

  // Log request details in development
  if (isDevelopment && req.path.includes("/auth/")) {
    Logger.info(`🔐 Auth request: ${req.method} ${req.path}`, {
      ip: req.ip,
      origin: req.get("Origin"),
      userAgent: req.get("User-Agent")?.substring(0, 50),
    });
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warn" : "info";

    Logger[logLevel](`${req.method} ${req.url}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent")?.substring(0, 100),
    });
  });

  next();
});

// API routes
app.use("/api", routes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Mission Order System API",
    status: "Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    rateLimiting: {
      development: isDevelopment,
      authLimit: isDevelopment ? "1000/15min" : "20/15min",
      generalLimit: isDevelopment ? "10000/15min" : "1000/15min",
    },
  });
});

// **NEW: Debug endpoint for development**
if (isDevelopment) {
  app.get("/api/debug", (req, res) => {
    res.json({
      ip: req.ip,
      ips: req.ips,
      headers: req.headers,
      environment: process.env.NODE_ENV,
      rateLimitSkipped:
        req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip === "::ffff:127.0.0.1",
    });
  });
}

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(() => {
    Logger.info("Process terminated gracefully");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    Logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  Logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  Logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// En local (NODE_ENV=development) => 0 pour éviter l'erreur express-rate-limit
app.set("trust proxy", isDevelopment ? 0 : 1);


// Start server
const server = app.listen(PORT, () => {
  Logger.info(`🚀 Mission Order System API running on port ${PORT}`);
  Logger.info(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  Logger.info(`🔗 Health check: http://localhost:${PORT}/`);
  Logger.info(`📊 API docs: http://localhost:${PORT}/api/health`);

  if (isDevelopment) {
    Logger.info(`🛠️  Development mode: Rate limiting relaxed for localhost`);
    Logger.info(`🔍 Debug endpoint: http://localhost:${PORT}/api/debug`);
  }
});

module.exports = app;
