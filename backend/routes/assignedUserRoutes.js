import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { createAssignedUser, listAssignedUsers, getAssignedUser, deleteAssignedUser, getAssignedUserRecords } from "../controllers/assignedUserController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const ok=["image/jpeg","image/png","image/webp","image/jpg"].includes(file.mimetype); cb(ok?null:new Error("Only images allowed"), ok); } });

router.use(authMiddleware, roleMiddleware("admin"));

router.post("/", upload.single("photo"), createAssignedUser);
router.get("/", listAssignedUsers);
router.get("/:id", getAssignedUser);
router.delete("/:id", deleteAssignedUser);
router.get("/:id/records", getAssignedUserRecords);

export default router;
