import express from "express";
import { getImageKitAuth, createRecord, listRecords, getRecord, updateRecord, updateHandoverPhoto, updatePlacementPhoto, deleteRecord, getStats ,getlockandkeycounts,specificlockandkey,getlock,getkey,gethandover,getplacement} from "../controllers/lockKeyController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { uploadFields, uploadHandoverPhoto, uploadPlacementPhoto } from "../middleware/uploadMiddleware.js";
import { validateCreateRecord, validateUpdateRecord } from "../validators/lockKeyValidator.js";


const router = express.Router();

// ImageKit auth for client-side direct upload — must be before /:id
router.get("/auth/imagekit", authMiddleware, getImageKitAuth);

// Dashboard stats — must be before /:id
router.get("/stats/summary", authMiddleware, getStats);
router.get("/stats/lockandkeycounts", authMiddleware, getlockandkeycounts);
router.get("/stats/specificlockandkey", authMiddleware, specificlockandkey);
router.get("/stats/lock", authMiddleware, getlock);
router.get("/stats/key", authMiddleware, getkey);
router.get("/stats/handover", authMiddleware, gethandover);
router.get("/stats/placement", authMiddleware, getplacement);
// List & Create
router.get("/", authMiddleware, listRecords);
router.post("/", authMiddleware, uploadFields, validateCreateRecord, createRecord);

// Dedicated photo-change endpoints — system auto-sets handoverAt/placementAt (no client date)
router.patch("/:id/handover-photo", authMiddleware, uploadHandoverPhoto, updateHandoverPhoto);
router.patch("/:id/placement-photo", authMiddleware, uploadPlacementPhoto, updatePlacementPhoto);

// Single record
router.get("/:id", authMiddleware, getRecord);
router.patch("/:id", authMiddleware, uploadFields, validateUpdateRecord, updateRecord);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteRecord);

export default router;
