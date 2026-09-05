import express from "express";
import { getImageKitAuth, createRecord, listRecords, getRecord, updateRecord, updatePersonPhoto, updatePlacementPhoto, deleteRecord, getStats, getMyAssignedRecords, getMyAssignedStats } from "../controllers/lockKeyController.js";
import { createRecordViaWebhook } from "../controllers/webhookRecordController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import webhookAuth from "../middleware/webhookAuth.js";
import { uploadFields, uploadPlacementPhoto, uploadPersonPhoto } from "../middleware/uploadMiddleware.js";
import { validateCreateRecord, validateUpdateRecord } from "../validators/lockKeyValidator.js";

const router = express.Router();

// ImageKit auth for client-side direct upload — must be before /:id
router.get("/auth/imagekit", authMiddleware, getImageKitAuth);

// Staff/subadmin assigned locks & keys — must be before /:id
router.get("/my-assignments/stats", authMiddleware, getMyAssignedStats);
router.get("/my-assignments", authMiddleware, getMyAssignedRecords);

// Dashboard stats — must be before /:id
router.get("/stats/summary", authMiddleware, getStats);

// Webhook API for createRecord — uses WEBHOOK_SECRET (env) instead of JWT. Must be before /:id
// POST /api/lock-key-records/webhook  (also /webhook/:source)
router.post("/webhook", webhookAuth, createRecordViaWebhook);
router.post("/webhook/:source", webhookAuth, createRecordViaWebhook);

// List & Create (JWT) — only admin/subadmin can submit
router.get("/", authMiddleware, listRecords);
router.post("/", authMiddleware, roleMiddleware("admin", "subadmin"), uploadFields, validateCreateRecord, createRecord);

// Dedicated photo-change endpoints
router.patch("/:id/person-photo/:personIndex", authMiddleware, uploadPersonPhoto, updatePersonPhoto);
router.patch("/:id/placement-photo", authMiddleware, uploadPlacementPhoto, updatePlacementPhoto);

// Single record
router.get("/:id", authMiddleware, getRecord);
router.patch("/:id", authMiddleware, uploadFields, validateUpdateRecord, updateRecord);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteRecord);

export default router;
