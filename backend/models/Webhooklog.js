import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    webhookId: { type: mongoose.Schema.Types.ObjectId, ref: "Webhook", required: true, index: true },
    event: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    responseCode: { type: Number, default: null },
    responseBody: { type: String, default: null },
    error: { type: String, default: null },
    lastAttemptAt: { type: Date, default: null },
    nextRetryAt: { type: Date, default: null },
  },
  { timestamps: true }
);

logSchema.index({ status: 1, attempts: 1, nextRetryAt: 1 });
logSchema.index({ createdAt: -1 });

export default mongoose.model("WebhookLog", logSchema);
