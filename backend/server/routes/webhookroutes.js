import express from "express";
import crypto from "crypto";
import axios from "axios";
import Webhook from "../../models/Webhook.js";
import WebhookLog from "../../models/Webhooklog.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { generateSignature } from "../utils/signature.js";

const router = express.Router();

// All webhook management routes require auth + admin role
router.use(authMiddleware, roleMiddleware("admin"));

// POST /api/webhooks — Create subscription
// Body: { targetUrl, event, description? }
// Returns: webhook without secret (secret shown only once)
router.post("/", async (req, res, next) => {
  try {
    const { targetUrl, event = "*", description = "" } = req.body;

    if (!targetUrl || !/^https?:\/\/.+/.test(targetUrl)) {
      return res.status(400).json({ success: false, message: "targetUrl is required and must be http(s) URL" });
    }

    // Validate event enum
    const allowed = ["record.created", "record.updated", "record.deleted", "record.status_changed", "staff.created", "staff.updated", "*"];
    if (!allowed.includes(event)) {
      return res.status(400).json({ success: false, message: `Invalid event. Allowed: ${allowed.join(", ")}` });
    }

    const secret = crypto.randomBytes(32).toString("hex"); // 64 hex chars

    const webhook = await Webhook.create({
      targetUrl,
      event,
      secret,
      description,
      createdBy: req.user._id,
    });

    // Return safe JSON + expose secret ONCE (client must store it)
    const safe = webhook.toSafeJSON();
    return res.status(201).json({
      success: true,
      message: "Webhook created. Store secret securely — it will not be shown again.",
      data: { ...safe, secret }, // secret exposed only on creation
      warning: "Copy the secret now. Future GETs will only show secretPreview.",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Webhook already exists for this targetUrl + event" });
    }
    next(err);
  }
});

// GET /api/webhooks — List all (admin only, secrets hidden)
router.get("/", async (req, res, next) => {
  try {
    const webhooks = await Webhook.find().sort("-createdAt");
    const safe = webhooks.map((w) => w.toSafeJSON());
    res.json({ success: true, data: safe });
  } catch (err) {
    next(err);
  }
});

// GET /api/webhooks/:id — Single
router.get("/:id", async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    res.json({ success: true, data: webhook.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/webhooks/:id — Update (toggle isActive, targetUrl, event, description)
router.patch("/:id", async (req, res, next) => {
  try {
    const allowedFields = ["isActive", "targetUrl", "event", "description"];
    const updates = {};
    for (const k of allowedFields) if (req.body[k] !== undefined) updates[k] = req.body[k];

    if (updates.targetUrl && !/^https?:\/\/.+/.test(updates.targetUrl)) {
      return res.status(400).json({ success: false, message: "targetUrl must be http(s) URL" });
    }
    if (updates.event) {
      const allowed = ["record.created", "record.updated", "record.deleted", "record.status_changed", "staff.created", "staff.updated", "*"];
      if (!allowed.includes(updates.event)) {
        return res.status(400).json({ success: false, message: `Invalid event: ${updates.event}` });
      }
    }

    const webhook = await Webhook.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    res.json({ success: true, data: webhook.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/:id/rotate-secret — Generate new secret (shown once)
router.post("/:id/rotate-secret", async (req, res, next) => {
  try {
    const newSecret = crypto.randomBytes(32).toString("hex");
    const webhook = await Webhook.findByIdAndUpdate(req.params.id, { secret: newSecret }, { new: true });
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    res.json({
      success: true,
      message: "Secret rotated. Store it now — will not be shown again.",
      data: { id: webhook._id, secret: newSecret, secretPreview: `****${newSecret.slice(-4)}` },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/:id/test — Send test payload to targetUrl
router.post("/:id/test", async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id).select("+secret");
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    if (!webhook.isActive) return res.status(400).json({ success: false, message: "Webhook is inactive" });

    const payload = {
      event: webhook.event,
      test: true,
      timestamp: Date.now(),
      data: { message: "Test webhook from Lock & Key", webhookId: webhook._id },
    };
    const signature = generateSignature(payload, webhook.secret);

    const log = await WebhookLog.create({
      webhookId: webhook._id,
      event: payload.event,
      payload,
      status: "pending",
    });

    try {
      const response = await axios.post(webhook.targetUrl, payload, {
        headers: { "Content-Type": "application/json", "X-Signature": signature, "X-Webhook-Event": payload.event },
        timeout: 8000,
      });
      log.status = "success";
      log.responseCode = response.status;
      log.responseBody = JSON.stringify(response.data)?.slice(0, 2000);
      await log.save();
      return res.json({ success: true, message: "Test webhook sent", data: { status: response.status, log } });
    } catch (err) {
      log.status = "failed";
      log.responseCode = err.response?.status || 0;
      log.error = err.message?.slice(0, 1000);
      log.responseBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : null;
      log.attempts = 1;
      log.lastAttemptAt = new Date();
      log.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
      await log.save();
      return res.status(502).json({ success: false, message: "Test webhook failed", error: err.message, data: log });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/webhooks/:id/logs — Delivery logs for a webhook
router.get("/:id/logs", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    const [logs, total] = await Promise.all([
      WebhookLog.find({ webhookId: webhook._id }).sort("-createdAt").skip((pageNum - 1) * limitNum).limit(limitNum),
      WebhookLog.countDocuments({ webhookId: webhook._id }),
    ]);
    res.json({ success: true, data: { logs, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/webhooks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found" });
    // optionally keep logs or delete: keep for audit
    res.json({ success: true, message: "Webhook deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
