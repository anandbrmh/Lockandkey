import mongoose from "mongoose";

const photoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: false },
    fileId: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const lockKeyRecordSchema = new mongoose.Schema(
  {
    lockPhoto: { type: photoSubSchema, required: false },
    keyPhoto: { type: photoSubSchema, required: false },
    keyCount: { type: Number, required: false, default: 1, min: 1 },
    placementPhoto: { type: photoSubSchema, required: false },
    handoverPhoto: { type: photoSubSchema, required: false },
    // System-auto date: set server-side when handoverPhoto is uploaded/changed; never accepted from client
    handoverAt: { type: Date, default: null, index: true },
    placementAt: { type: Date, default: null },
    handoverPerson: {
      name: { type: String, required: false, trim: true },
      role: { type: String, trim: true },
      contactNumber: { type: String, trim: true },
    },
    handoverPersons: [
      {
        name: { type: String, required: false, trim: true },
        role: { type: String, trim: true },
        contactNumber: { type: String, trim: true },
        personId: { type: mongoose.Schema.Types.ObjectId, ref: "SavedPerson", required: false },
        photo: { type: photoSubSchema, required: false },
        status: {
          type: String,
          enum: ["active", "inactive", "returned", "lost"],
          default: "active",
        },
      }
    ],
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "returned", "lost"],
      default: "active",
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for filtering performance — include ownerId for per-user isolation
lockKeyRecordSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
lockKeyRecordSchema.index({ ownerId: 1, isDeleted: 1, createdAt: -1 });

lockKeyRecordSchema.index({ "handoverPerson.name": 1 });

// Backward compat: expose `createdBy` as alias to `ownerId` for old clients/docs
lockKeyRecordSchema.virtual("createdBy")
  .get(function () {
    return this.ownerId || this._doc?.createdBy;
  })
  .set(function (v) {
    this.ownerId = v;
  });
lockKeyRecordSchema.set("toJSON", { virtuals: true });
lockKeyRecordSchema.set("toObject", { virtuals: true });

const LockKeyRecord = mongoose.model("LockKeyRecord", lockKeyRecordSchema);
export default LockKeyRecord;
