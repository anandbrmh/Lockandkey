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

  if (!process.env.WEBHOOK_SECRET) {
    console.warn("[WARN] WEBHOOK_SECRET not set — incoming webhooks will be rejected. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and add to .env");
  } else {
    console.log(`[Webhook] WEBHOOK_SECRET configured (****${process.env.WEBHOOK_SECRET.slice(-4)})`);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Webhooks inbound: http://localhost:${PORT}/api/incoming-webhooks/receive/:source`);
    console.log(`Webhooks manage: http://localhost:${PORT}/api/webhooks (admin)`);
  });
};

start();
