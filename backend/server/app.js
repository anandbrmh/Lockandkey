import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import lockKeyRoutes from "./routes/lockKeyRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import webhookRoutes from "./routes/webhookroutes.js";
import incomingWebhookRoutes from "./routes/incomingWebhook.js";
// Start webhook retry cron (import for side-effect)
import "./jobs/retryjob.js";

dotenv.config();

const app = express();

// ── Security & logging middleware — MUST be before routes ──
app.use(helmet());
// CORS: allow VITE origin + credentials. If CORS_ORIGIN=* we disable credentials for wildcard.
const corsOrigin = process.env.CORS_ORIGIN || "*";
const corsOptions =
  corsOrigin === "*"
    ? { origin: "*", credentials: false }
    : { origin: corsOrigin.split(",").map((s) => s.trim()), credentials: true };
app.use(cors(corsOptions));
app.use(morgan("dev"));

// Capture rawBody for webhook HMAC verification (used by incoming-webhooks)
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      // Store raw bytes for HMAC verification
      req.rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health check — includes DB status
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: true,
    message: "Lock & Key API running",
    timestamp: new Date().toISOString(),
    db: states[dbState] || dbState,
  });
});

// Webhook info (no DB required)
app.get("/api/webhooks-info", (req, res) => {
  res.json({
    success: true,
    outbound: {
      manage: "CRUD /api/webhooks (admin, JWT required)",
      events: ["record.created", "record.updated", "record.deleted", "record.status_changed", "staff.created", "staff.updated", "*"],
      headers: "X-Signature: <hmac-sha256 hex of JSON body using per-webhook secret>, X-Webhook-Event, X-Webhook-Id",
      triggers: "record.created triggered automatically in lockKeyController.createRecord via services/dispatcher.js",
    },
    inbound: {
      generic: "POST /api/incoming-webhooks/receive/:source",
      createRecord: [
        "POST /api/incoming-webhooks/record",
        "POST /api/incoming-webhooks/records",
        "POST /api/incoming-webhooks/record/:source",
        "POST /api/lock-key-records/webhook",
        "POST /api/lock-key-records/webhook/:source",
      ],
      headers: {
        signature: "X-Signature: <hmac-sha256 hex of raw JSON body using WEBHOOK_SECRET from .env>",
        owner: "X-Webhook-Owner: <email> (optional owner mapping)",
        contentType: "application/json",
      },
      envVar: "WEBHOOK_SECRET (stored in backend/.env)",
      secretConfigured: !!process.env.WEBHOOK_SECRET,
      bodyExample: {
        keyCount: 1,
        status: "active",
        location: { lat: 12.9716, lng: 77.5946 },
        handoverPersons: [{ name: "John Doe", role: "Staff", contactNumber: "9876543210", status: "active", keysGiven: 1 }],
        lockPhoto: { url: "https://ik.imagekit.io/demo/lock.jpg" },
      },
    },
  });
});

// Middleware to fail fast if DB is disconnected (allow connecting/connected states)
// Keep before DB-dependent routes but after health
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/webhooks-info" || req.path.startsWith("/incoming-webhooks") || req.path.startsWith("/lock-key-records/webhook")) {
    // Allow incoming webhooks even if DB down (they just log)
    // But for manage routes (/webhooks) we still need DB check below via specific middleware
    if (req.path.startsWith("/incoming-webhooks") || req.path.startsWith("/lock-key-records/webhook")) return next();
  }
  if (req.path === "/health") return next();
  const dbState = mongoose.connection.readyState;
  if (dbState === 0 || dbState === 3) {
    return res.status(503).json({ success: false, message: "Database not ready, please retry" });
  }
  next();
});

// Routes — AFTER all middleware
app.use("/api/auth", authRoutes);
app.use("/api/lock-key-records", lockKeyRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/incoming-webhooks", incomingWebhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Centralized error handler — MUST be last
app.use(errorHandler);

export default app;
