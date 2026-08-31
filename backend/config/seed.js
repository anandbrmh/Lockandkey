import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set in .env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    const email = process.env.SEED_ADMIN_EMAIL || "admin@lockkey.local";
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
    const name = process.env.SEED_ADMIN_NAME || "Default Admin";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
    });

    console.log(`Seeded admin user: ${admin.email} / ${password}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
};

seedAdmin();
