import mongoose from "mongoose";

export const cleanupDuplicateRecordFields = async () => {
  try {
    const LockKeyRecord = mongoose.models.LockKeyRecord || mongoose.model("LockKeyRecord");
    if (!LockKeyRecord) return;

    // 1. Unset legacy duplicate / obsolete fields
    await LockKeyRecord.updateMany(
      {},
      {
        $unset: {
          handoverPerson: "",
          handoverAt: "",
          placementAt: "",
          handoverPhoto: "",
          handoverName: "",
          handoverRole: "",
          handoverContact: "",
          savedLocationLabel: "",
        },
      }
    );

    // 2. Remove empty dummy handoverPersons entries (no name, no personId, no photo)
    await LockKeyRecord.updateMany(
      {},
      {
        $pull: {
          handoverPersons: {
            $and: [
              { $or: [{ name: "" }, { name: null }, { name: { $exists: false } }] },
              { $or: [{ personId: null }, { personId: { $exists: false } }] },
              { $or: [{ photo: null }, { "photo.url": null }, { "photo.url": "" }, { photo: { $exists: false } }] },
            ],
          },
        },
      }
    );
    console.log("[DB Sanitizer] Successfully cleaned up duplicate fields and empty handover person slots.");
  } catch (err) {
    // Non-fatal if model not loaded yet or DB in background
    // console.debug("[DB Sanitizer] Info:", err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    // Run cleanup in background without blocking
    cleanupDuplicateRecordFields().catch(() => {});
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't crash in dev if DB unavailable — allow health checks and startup
    throw error;
  }
};

export default connectDB;
