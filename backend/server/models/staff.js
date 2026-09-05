import mongoose from "mongoose";

const photoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: false },
    fileId: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    // Link to User document (owner). Unique per user — one staff profile per account
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    photo: { type: photoSubSchema, required: false },
    passwordHash: { type: String, required: false },
    // Extended profile fields — covers "remaining schema" data for staff onboarding
    phone: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    roleTitle: { type: String, trim: true },
    address: { type: String, trim: true },
    adminCodeVerified: { type: Boolean, default: false },
    verifiedAdminCode: { type: String, trim: true, default: null },
    linkedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    profileCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

staffSchema.index({ email: 1 });

const Staff = mongoose.model("Staff", staffSchema);
export default Staff;










