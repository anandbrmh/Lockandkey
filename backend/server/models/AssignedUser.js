import mongoose from "mongoose";

const photoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: false },
    fileId: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const assignedUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: null },
    photo: { type: photoSubSchema, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

assignedUserSchema.index({ createdBy: 1, phone: 1 }, { unique: true, sparse: true });
assignedUserSchema.index({ createdBy: 1, name: 1 });
assignedUserSchema.index({ name: "text", phone: "text" });

const AssignedUser = mongoose.model("AssignedUser", assignedUserSchema);
export default AssignedUser;
