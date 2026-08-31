import mongoose from "mongoose";

const photoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: false },
    fileId: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const savedPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    photo: { type: photoSubSchema, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usageCount: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique per user by lowercased name - prevents duplicate entries for same person
savedPersonSchema.index({ createdBy: 1, nameLower: 1 }, { unique: true });
savedPersonSchema.index({ name: "text", role: "text" });
savedPersonSchema.index({ createdBy: 1, updatedAt: -1 });

const SavedPerson = mongoose.model("SavedPerson", savedPersonSchema);
export default SavedPerson;
