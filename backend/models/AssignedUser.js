import mongoose from "mongoose";

const assignedUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: null },
    photo: { type: { url: String, fileId: String, uploadedAt: Date }, required: false },
   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

assignedUserSchema.index({ createdBy: 1, phone: 1 }, { unique: true });
assignedUserSchema.index({ createdBy: 1, name: 1 });
assignedUserSchema.index({ name: "text", phone: "text" });

const AssignedUser = mongoose.model("AssignedUser", assignedUserSchema);
export default AssignedUser;
