import { verifySignature } from "../utils/signature.js";

/**
 * Webhook HMAC verification middleware — uses WEBHOOK_SECRET stored in env (.env)
 * Verifies X-Signature header against rawBody (or JSON body fallback).
 * Attach req.webhookVerified = true on success, also sets req.webhookSource if present.
 */
const webhookAuth = (req, res, next) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[WebhookAuth] WEBHOOK_SECRET not set in .env");
    return res.status(500).json({ success: false, message: "Server misconfigured: WEBHOOK_SECRET missing. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"" });
  }

  const signature = req.headers["x-signature"] || req.headers["x-hub-signature-256"] || req.headers["x-webhook-signature"];
  if (!signature) {
    return res.status(401).json({ success: false, message: "Missing X-Signature header. Expected HMAC-SHA256 hex of raw JSON body using WEBHOOK_SECRET" });
  }

  const cleanSig = String(signature).replace(/^sha256=/, "").trim();
  const payloadToVerify = req.rawBody !== undefined ? req.rawBody : req.body;

  let isValid = verifySignature(payloadToVerify, cleanSig, secret);
  // Fallback: client may have signed JSON.stringify(req.body) instead of raw bytes
  if (!isValid && req.rawBody !== undefined) {
    isValid = verifySignature(req.body, cleanSig, secret);
  }

  if (!isValid) {
    return res.status(401).json({ success: false, message: "Invalid X-Signature. HMAC mismatch" });
  }

  req.webhookVerified = true;
  req.webhookSignature = cleanSig;
  next();
};

export default webhookAuth;
