import mongoose from "mongoose";

const photoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: false },
    fileId: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const savedLocationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true }, // e.g. "Main Gate", "Warehouse A" - optional
    lat: { type: Number, required: false },
    lng: { type: Number, required: false },
    // optional text description derived from handover or manual
    description: { type: String, trim: true },
    photo: { type: photoSubSchema, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usageCount: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }  
);

savedLocationSchema.index({ createdBy: 1, updatedAt: -1 });
savedLocationSchema.index({ label: "text" });  
savedLocationSchema.index({ lat: 1, lng: 1 });

const SavedLocation = mongoose.model("SavedLocation", savedLocationSchema);
export default SavedLocation;
