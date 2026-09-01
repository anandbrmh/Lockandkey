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

dotenv.config();

const app = express();

// Security & logging middleware — ORDER MATTERS
app.use(helmet());
// CORS: allow VITE origin + credentials. If CORS_ORIGIN=* we disable credentials for wildcard.
const corsOrigin = process.env.CORS_ORIGIN || "*";
const corsOptions = corsOrigin === "*"
  ? { origin: "*", credentials: false }
  : { origin: corsOrigin.split(",").map((s) => s.trim()), credentials: true };
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
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

// Middleware to fail fast if DB is disconnected (allow connecting/connected states)
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  const dbState = mongoose.connection.readyState;
  // Allow if connected (1) or connecting (2)
  if (dbState === 0 || dbState === 3) {
    return res.status(503).json({ success: false, message: "Database not ready, please retry" });
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lock-key-records", lockKeyRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/staff", staffRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Centralized error handler — MUST be last
app.use(errorHandler);

export default app;  
