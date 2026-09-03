import express from "express";
import { verifySignature } from "../utils/signature.js";
import webhookAuth from "../middleware/webhookAuth.js";
import { createRecordViaWebhook } from "../controllers/webhookRecordController.js";

const router = express.Router();

/**
 * POST /api/incoming-webhooks/receive/:source
 * Headers: X-Signature: <hmac sha256 hex of raw JSON body using WEBHOOK_SECRET from .env>
 * Body: JSON payload
 *
 * Security: Uses env-stored WEBHOOK_SECRET (set via .env). Verify with timingSafeEqual.
 * Use rawBody for verification to avoid JSON.stringify ordering issues.
 * Note: global express.json with verify already populated req.rawBody in app.js
 */
router.post("/receive/:source", async (req, res) => {
    const signature = req.headers["x-signature"] || req.headers["x-hub-signature-256"];
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.error("[IncomingWebhook] WEBHOOK_SECRET not set in .env — rejecting");
      return res.status(500).json({ success: false, error: "Server misconfigured: WEBHOOK_SECRET missing" });
    }

    if (!signature) {
      return res.status(401).json({ success: false, error: "Missing X-Signature header" });
    }

    // Prefer rawBody for verification (exact bytes sender signed). Fallback to JSON stringify.
    const payloadToVerify = req.rawBody !== undefined ? req.rawBody : req.body;
    const cleanSig = String(signature).replace(/^sha256=/, "").trim();

    if (!verifySignature(payloadToVerify, cleanSig, secret)) {
      // Fallback: try verifying parsed body JSON stringify (for clients that sign object)
      const fallbackOk = req.rawBody !== undefined ? verifySignature(req.body, cleanSig, secret) : false;
      if (!fallbackOk) {
        return res.status(401).json({ success: false, error: "Invalid signature" });
      }
    }

    const source = req.params.source;
    console.log(`[IncomingWebhook] ✅ verified from source="${source}" payload=`, JSON.stringify(req.body).slice(0, 1000));

    // --- Business logic hook: handle known sources ---
    try {
      // Example: you can route by source or event field
      // if (source === "imagekit" && req.body.event) { ... }
      // if (req.body.event === "record.status_changed") { ... }
      // For now just acknowledge. Extend as needed.

      // Optional: persist incoming webhook for audit (uncomment if you want DB logging)
      // const IncomingLog = (await import("../../models/IncomingWebhookLog.js")).default;
      // await IncomingLog.create({ source, payload: req.body, signature: cleanSig, receivedAt: new Date() });
    } catch (err) {
      console.error("[IncomingWebhook] handler error:", err.message);
      // Still return 200 to avoid sender retries on handler failure, unless you want retry
    }

    return res.status(200).json({
      success: true,
      received: true,
      source,
      timestamp: new Date().toISOString(),
    });
  }
);

// ============ Webhook API for createRecord (uses WEBHOOK_SECRET from .env, not JWT) ============
// POST /api/incoming-webhooks/record — alias without :source param (source=webhook)
router.post("/record", webhookAuth, createRecordViaWebhook);
router.post("/records", webhookAuth, createRecordViaWebhook);

// POST /api/incoming-webhooks/record/:source — with source param for tracking
router.post("/record/:source", webhookAuth, createRecordViaWebhook);
router.post("/records/:source", webhookAuth, createRecordViaWebhook);

// Health/info for incoming webhooks
router.get("/info", (req, res) => {
  const secretSet = !!process.env.WEBHOOK_SECRET;
  res.json({
    success: true,
    endpoints: {
      generic: "POST /api/incoming-webhooks/receive/:source",
      createRecord: "POST /api/incoming-webhooks/record  (or /records, /record/:source)",
    },
    headers: {
      signature: "X-Signature: <hex hmac-sha256 of raw JSON body using WEBHOOK_SECRET>",
      owner: "X-Webhook-Owner: <email> (optional, maps to ownerId)",
    },
    envVar: "WEBHOOK_SECRET (stored in backend/.env)",
    secretConfigured: secretSet,
    example: {
      createRecord: {
        curl: `curl -X POST http://localhost:${
          process.env.PORT || 5000
        }/api/incoming-webhooks/record -H "Content-Type: application/json" -H "X-Signature: <hmac>" -d '{"keyCount":1,"status":"active","handoverPersons":[{"name":"John","role":"Staff"}]}'`,
        signatureGen: "node -e \"console.log(require('crypto').createHmac('sha256', process.env.WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex'))\"",
      },
    },
  });
});

export default router;
