import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
  {
    targetUrl: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: "targetUrl must be a valid http(s) URL",
      },
    },
    event: {
      type: String,
      required: true,
      enum: [
        "record.created",
        "record.updated",
        "record.deleted",
        "record.status_changed",
        "staff.created",
        "staff.updated",
        "*",
      ],
      default: "*",
    },
    secret: { type: String, required: true, select: false }, // hidden by default
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

webhookSchema.index({ event: 1, isActive: 1 });
webhookSchema.index({ targetUrl: 1, event: 1 }, { unique: true });

// Hide secret when converting to JSON unless explicitly selected
webhookSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  if (obj.secret) {
    // show only last 4 chars for display: ****abcd
    obj.secretPreview = `****${obj.secret.slice(-4)}`;
    delete obj.secret;
  }
  return obj;
};

export default mongoose.model("Webhook", webhookSchema);

