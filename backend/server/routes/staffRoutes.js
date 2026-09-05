import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getStaffProfile, checkStaffProfile, fillStaffData, updateStaffProfile, verifyAdminCode, listVerifiedStaff, promoteStaff } from "../controllers/staff.controller.js";

const router = express.Router();

// Multer for staff photo — memory storage, 5MB limit, images only
const storage = multer.memoryStorage();
const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image/jpeg, image/png, image/webp are allowed"), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// All staff routes require auth
router.use(authMiddleware);

// Check completion gate — useful for frontend redirect decision
router.get("/check", checkStaffProfile);
router.get("/me", getStaffProfile);

// Staff verifies admin code — only verified staff appear on admin dashboard
router.post("/verify-admin-code", verifyAdminCode);

// Admin-only: verified staff list & promote to subadmin
router.get("/verified", roleMiddleware("admin"), listVerifiedStaff);
router.patch("/:id/promote", roleMiddleware("admin"), promoteStaff);

// Complete / update profile — allow any authenticated user, but intended for staff role
router.post("/complete", upload.single("image"), fillStaffData);
router.patch("/me", upload.single("image"), updateStaffProfile);

// Admin can list all staff profiles (unfiltered — for debugging; dashboard uses /verified)
router.get("/", roleMiddleware("admin"), async (req, res, next) => {
  try {
    const { default: Staff } = await import("../models/staff.js");
    const list = await Staff.find({}).populate("user", "name email role").sort("-updatedAt").lean();
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

export default router;
