import axios from "axios";
import Webhook from "../models/Webhook.js";
import WebhookLog from "../models/Webhooklog.js";
import { generateSignature } from "../server/utils/signature.js";

/**
 * Trigger outbound webhooks for an event
 * @param {string} eventName - e.g. "record.created"
 * @param {object} data - payload data
 * @returns {Promise<number>} number of webhooks triggered
 */
async function triggerEvent(eventName, data) {
  // Find active webhooks matching this event or wildcard "*"
  const webhooks = await Webhook.find({
    isActive: true,
    $or: [{ event: eventName }, { event: "*" }],
  }).select("+secret");

  if (webhooks.length === 0) return 0;

  for (const webhook of webhooks) {
    const payload = {
      event: eventName,
      data,
      timestamp: Date.now(),
      id: webhook._id.toString(),
    };

    const signature = generateSignature(payload, webhook.secret);

    const log = await WebhookLog.create({
      webhookId: webhook._id,
      event: eventName,
      payload,
      status: "pending",
      attempts: 0,
    });

    try {
      const response = await axios.post(webhook.targetUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Webhook-Event": eventName,
          "X-Webhook-Id": webhook._id.toString(),
        },
        timeout: 8000,
        validateStatus: () => true, // handle status manually
      });

      if (response.status >= 200 && response.status < 300) {
        log.status = "success";
      } else {
        log.status = "failed";
        log.error = `HTTP ${response.status}`;
        log.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
      }
      log.responseCode = response.status;
      log.responseBody = JSON.stringify(response.data)?.slice(0, 2000);
    } catch (err) {
      log.status = "failed";
      log.responseCode = err.response?.status || 0;
      log.error = err.message?.slice(0, 1000);
      log.responseBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : null;
      log.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
    }

    log.attempts = 1;
    log.lastAttemptAt = new Date();
    await log.save();
  }

  return webhooks.length;
}

export default triggerEvent;
export { triggerEvent };
