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
    phone: { type: String, trim: true, sparse: true },
    photo: { type: photoSubSchema, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Sparse + partial filter ensures many users without phone can coexist.
// Only enforce uniqueness when phone exists and is non-empty.
assignedUserSchema.index(
  { createdBy: 1, phone: 1 },
  { unique: true, sparse: true, partialFilterExpression: { phone: { $exists: true, $type: "string" } } }
);
assignedUserSchema.index({ createdBy: 1, name: 1 });
assignedUserSchema.index({ name: "text", phone: "text" });

const AssignedUser = mongoose.model("AssignedUser", assignedUserSchema);
export default AssignedUser;
