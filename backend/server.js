import dotenv from "dotenv";
dotenv.config();

import app from "./server/app.js";
import connectDB from "./server/config/db.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("[WARN] MONGO_URI not set — some routes will fail. Set it in .env");
  } else {
    try {
      await connectDB();
    } catch (err) {
      console.warn(`[WARN] DB initial connect failed: ${err.message} — will retry in background`);
      // retry in background without blocking health checks
      connectDB().catch((e) => console.warn(`[WARN] DB retry failed: ${e.message}`));
    }
  }

  if (!process.env.JWT_SECRET) {
    console.warn("[WARN] JWT_SECRET not set — auth routes will fail");
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
};

start();
