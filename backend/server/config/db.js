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

const fixAssignedUserIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const coll = db.collection("assignedusers");
    // Check current indexes
    const indexes = await coll.indexes().catch(() => []);
    const old = indexes.find((idx) => idx.name === "createdBy_1_phone_1");
    if (old && !old.sparse) {
      console.log("[DB Sanitizer] Dropping old assignedusers index createdBy_1_phone_1 (non-sparse)...");
      await coll.dropIndex("createdBy_1_phone_1").catch(() => {});
    }
    // Ensure new sparse+partial index exists via model sync
    const AssignedUser = mongoose.models.AssignedUser;
    if (AssignedUser?.syncIndexes) {
      await AssignedUser.syncIndexes().catch((e) => console.warn("[DB Sanitizer] syncIndexes warning:", e.message));
    }
  } catch (e) {
    // non-fatal
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    // Run cleanups in background without blocking
    cleanupDuplicateRecordFields().catch(() => {});
    fixAssignedUserIndexes().catch(() => {});
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't crash in dev if DB unavailable — allow health checks and startup
    throw error;
  }
};

export default connectDB;
