import cron from "node-cron";
import Webhook from "../../models/Webhook.js";
import WebhookLog from "../../models/Webhooklog.js";
import { generateSignature } from "../utils/signature.js";
import axios from "axios";

/**
 * Retry failed webhook deliveries every 5 minutes
 * - Only retry if attempts < 5 and nextRetryAt is due
 * - Uses per-webhook secret for HMAC
 */
let isRunning = false;

async function retryFailedWebhooks() {
  if (isRunning) return;
  isRunning = true;
  try {
    const now = new Date();
    const failedLogs = await WebhookLog.find({
      status: "failed",
      attempts: { $lt: 5 },
      $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: null }],
    })
      .sort({ nextRetryAt: 1 })
      .limit(50);

    if (failedLogs.length > 0) {
      console.log(`[WebhookRetry] Retrying ${failedLogs.length} failed deliveries`);
    }

    for (const log of failedLogs) {
      const webhook = await Webhook.findById(log.webhookId).select("+secret");
      if (!webhook) {
        log.error = "Webhook not found (deleted)";
        log.attempts += 1;
        await log.save();
        continue;
      }
      if (!webhook.isActive) {
        log.error = "Webhook inactive, skipping retry";
        await log.save();
        continue;
      }

      const signature = generateSignature(log.payload, webhook.secret);

      try {
        const response = await axios.post(webhook.targetUrl, log.payload, {
          headers: {
            "Content-Type": "application/json",
            "X-Signature": signature,
            "X-Webhook-Event": log.event,
            "X-Webhook-Retry": String(log.attempts + 1),
          },
          timeout: 8000,
          validateStatus: () => true,
        });

        if (response.status >= 200 && response.status < 300) {
          log.status = "success";
          log.error = null;
          log.nextRetryAt = null;
        } else {
          log.status = "failed";
          log.error = `HTTP ${response.status} on retry`;
          const backoffMinutes = Math.min(60, 5 * Math.pow(2, log.attempts)); // 5,10,20,40,60
          log.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        }
        log.responseCode = response.status;
        log.responseBody = JSON.stringify(response.data)?.slice(0, 2000);
      } catch (err) {
        log.status = "failed";
        log.responseCode = err.response?.status || 0;
        log.error = err.message?.slice(0, 1000);
        log.responseBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : null;
        const backoffMinutes = Math.min(60, 5 * Math.pow(2, log.attempts));
        log.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      }

      log.attempts += 1;
      log.lastAttemptAt = new Date();
      await log.save();
    }
  } catch (err) {
    console.error("[WebhookRetry] cron error:", err.message);
  } finally {
    isRunning = false;
  }
}

// Run every 5 minutes
cron.schedule("*/5 * * * *", retryFailedWebhooks);

export default retryFailedWebhooks;
export { retryFailedWebhooks };
