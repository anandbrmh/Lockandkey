import LockKeyRecord from "../models/LockKeyRecord.js";
import SavedPerson from "../models/SavedPerson.js";
import SavedLocation from "../models/SavedLocation.js";
import { uploadToImageKit, deleteFilesForRecord, getImageKitAuthParams } from "../services/storageService.js";
import { upsertSavedPerson, upsertSavedLocation } from "./directoryController.js";

// GET /api/lock-key-records/auth/imagekit — ImageKit client-upload auth params
export const getImageKitAuth = async (req, res, next) => {
  try {
    const params = getImageKitAuthParams();
    res.json({ success: true, data: params });
  } catch (err) {
    next(err);
  }
};

// POST /api/lock-key-records — create record (JWT required, multipart/form-data)
// Supports reuse via handoverPersonId and savedLocationId to avoid re-uploading to ImageKit
export const createRecord = async (req, res, next) => {
  try {
    const { keyCount, handoverName, handoverRole, handoverContact, lat, lng, status, handoverPersonId, savedLocationId, handoverPersons: handoverPersonsRaw, handoverPersonIds } = req.body;
    // Parse handoverPersons if sent as JSON string (from FormData)
    let parsedHandoverPersons = null;
    if (handoverPersonsRaw) {
      try { parsedHandoverPersons = typeof handoverPersonsRaw === 'string' ? JSON.parse(handoverPersonsRaw) : handoverPersonsRaw; } catch(e){ parsedHandoverPersons = null; }
    }

    // helper to upload one field if present
    const uploadField = async (fieldName, folder) => {
      const file = req.files?.[fieldName]?.[0];
      if (!file) return undefined;
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `${fieldName}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url, fileId } = await uploadToImageKit(file.buffer, fileName, folder);
      return { url, fileId, uploadedAt: new Date() };
    };

    // Resolve reuse before uploading: if IDs provided, fetch saved photos (no new ImageKit upload)
    let reusedHandoverPhoto = null;
    let reusedPlacementPhoto = null;
    let reusedHandoverPersonMeta = null;
    let reusedLocationCoords = null;

    if (handoverPersonId) {
      const saved = await SavedPerson.findById(handoverPersonId);
      if (!saved) return res.status(400).json({ success: false, message: "handoverPersonId not found" });
      // Reuse: copy URL but NOT fileId to avoid shared-deletion bug (original file stays with SavedPerson)
      if (saved.photo?.url) reusedHandoverPhoto = { url: saved.photo.url, fileId: undefined, uploadedAt: saved.photo.uploadedAt || new Date() };
      // if handoverName not provided, use saved person's details
      reusedHandoverPersonMeta = saved;
      // bump usage
      saved.usageCount += 1;
      saved.lastUsedAt = new Date();
      await saved.save();
    }

    if (savedLocationId) {
      const savedLoc = await SavedLocation.findById(savedLocationId);
      if (!savedLoc) return res.status(400).json({ success: false, message: "savedLocationId not found" });
      // Reuse: copy URL but NOT fileId to avoid shared-deletion bug
      if (savedLoc.photo?.url) reusedPlacementPhoto = { url: savedLoc.photo.url, fileId: undefined, uploadedAt: savedLoc.photo.uploadedAt || new Date() };
      if (savedLoc.lat != null || savedLoc.lng != null) reusedLocationCoords = { lat: savedLoc.lat, lng: savedLoc.lng };
      savedLoc.usageCount += 1;
      savedLoc.lastUsedAt = new Date();
      await savedLoc.save();
    }

    const [lockPhoto, keyPhoto, placementPhotoUploaded, handoverPhotoUploaded] = await Promise.all([
      uploadField("lockPhoto", "/lock-key/locks"),
      uploadField("keyPhoto", "/lock-key/keys"),
      uploadField("placementPhoto", "/lock-key/placements"),
      uploadField("handoverPhoto", "/lock-key/handovers"),
    ]);

    // Prefer uploaded file if present, else reused
    const placementPhoto = placementPhotoUploaded || reusedPlacementPhoto || undefined;
    const handoverPhoto = handoverPhotoUploaded || reusedHandoverPhoto || undefined;

    // Determine handover person details: support both legacy single and new array
    let finalHandoverName, finalHandoverRole, finalHandoverContact;
    let finalHandoverPersons = null;

    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons) && parsedHandoverPersons.length > 0) {
      // New multi-person flow: validate array length matches keyCount
      const kc = Number(keyCount) || parsedHandoverPersons.length;
      // Handle per-person reuse via personId
      finalHandoverPersons = [];
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const p = parsedHandoverPersons[i];
        let personId = p.personId || p.personId === null ? p.personId : null;
        let name = p.name, role = p.role, contact = p.contact || p.contactNumber;
        // If personId provided, fetch saved person to bump usage and fill missing fields
        if (personId) {
          try {
            const saved = await SavedPerson.findById(personId);
            if (saved) {
              if (!name) name = saved.name;
              if (!role) role = saved.role;
              if (!contact) contact = saved.contactNumber;
              saved.usageCount += 1;
              saved.lastUsedAt = new Date();
              await saved.save();
            }
          } catch(e){ /* ignore */ }
        }
        if (!name || !role) {
          return res.status(400).json({ success: false, message: `handoverPersons[${i}].name and role are required` });
        }
        finalHandoverPersons.push({ name: String(name).trim(), role: String(role).trim(), contactNumber: contact ? String(contact).trim() : undefined, personId: personId || undefined });
      }
      finalHandoverName = finalHandoverPersons[0].name;
      finalHandoverRole = finalHandoverPersons[0].role;
      finalHandoverContact = finalHandoverPersons[0].contactNumber;
      // also bump legacy reused meta for compatibility
      if (handoverPersonId && !finalHandoverPersons[0].personId) {
        const saved = reusedHandoverPersonMeta;
        if (saved) finalHandoverPersons[0].personId = saved._id;
      }
    } else {
      // Legacy single-person flow
      finalHandoverName = handoverName || reusedHandoverPersonMeta?.name;
      finalHandoverRole = handoverRole || reusedHandoverPersonMeta?.role;
      finalHandoverContact = handoverContact || reusedHandoverPersonMeta?.contactNumber;
      if (!finalHandoverName) {
        return res.status(400).json({ success: false, message: "handoverName is required (or provide handoverPersonId / handoverPersons)" });
      }
      finalHandoverPersons = [{ name: finalHandoverName, role: finalHandoverRole || undefined, contactNumber: finalHandoverContact || undefined, personId: handoverPersonId || undefined }];
    }

    // Determine location coords: request lat/lng overrides reused (now optional, UI removed but keep backend support)
    let finalLat = lat !== undefined && lat !== "" ? Number(lat) : undefined;
    let finalLng = lng !== undefined && lng !== "" ? Number(lng) : undefined;
    if ((finalLat == null || isNaN(finalLat)) && reusedLocationCoords) finalLat = reusedLocationCoords.lat;
    if ((finalLng == null || isNaN(finalLng)) && reusedLocationCoords) finalLng = reusedLocationCoords.lng;

    // System-auto handoverAt: no client date accepted; server time when handover photo exists
    const now = new Date();
    const handoverAt = handoverPhoto ? now : null;
    const placementAt = placementPhoto ? now : null;

    const doc = await LockKeyRecord.create({
      lockPhoto,
      keyPhoto,
      placementPhoto,
      handoverPhoto,
      handoverAt,
      placementAt,
      keyCount: Number(keyCount) || finalHandoverPersons.length,
      handoverPerson: {
        name: finalHandoverName,
        role: finalHandoverRole || undefined,
        contactNumber: finalHandoverContact || undefined,
      },
      handoverPersons: finalHandoverPersons,
      location: finalLat != null || finalLng != null ? { lat: finalLat, lng: finalLng } : undefined,
      status: status || "active",
      createdBy: req.user._id,
    });

    // Auto-save to directories for future reuse (upsert) — best effort, don't fail creation
    // Now handles multiple persons: upsert each that doesn't have personId
    try {
      for (const pers of finalHandoverPersons) {
        if (pers.personId) continue; // already reused, already counted
        await upsertSavedPerson({
          name: pers.name,
          role: pers.role,
          contactNumber: pers.contactNumber,
          photo: handoverPhoto, // share same verification photo for now
          createdBy: req.user._id,
        });
      }
      // Fallback legacy if array was single and photo missing stub
      if (finalHandoverPersons.length===0 && finalHandoverName && !handoverPersonId) {
        await upsertSavedPerson({ name: finalHandoverName, role: finalHandoverRole, contactNumber: finalHandoverContact, photo: handoverPhoto || null, createdBy: req.user._id });
      }
    } catch (e) { console.warn("[createRecord] upsertSavedPerson failed:", e.message); }

    try {
      if (!savedLocationId && placementPhoto) {
        await upsertSavedLocation({
          label: undefined,
          lat: finalLat,
          lng: finalLng,
          description: undefined,
          photo: placementPhoto,
          createdBy: req.user._id,
        });
      }
    } catch (e) { console.warn("[createRecord] upsertSavedLocation failed:", e.message); }

    res.status(201).json({ success: true, message: "Record created", data: doc });
  } catch (err) {
    next(err);
  }
};

// GET /api/lock-key-records — list with pagination & filters
export const listRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, handoverName, sort = "-createdAt" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (handoverName) filter["handoverPerson.name"] = { $regex: handoverName, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      LockKeyRecord.find(filter).populate("createdBy", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
      LockKeyRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/lock-key-records/:id
export const getRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false }).populate("createdBy", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id — update metadata/status (optional re-upload via same fields)
export const updateRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    const { keyCount, handoverName, handoverRole, handoverContact, lat, lng, status } = req.body;

    if (keyCount !== undefined) record.keyCount = Number(keyCount);
    if (handoverName !== undefined) record.handoverPerson.name = handoverName;
    if (handoverRole !== undefined) record.handoverPerson.role = handoverRole;
    if (handoverContact !== undefined) record.handoverPerson.contactNumber = handoverContact;
    if (lat !== undefined) { record.location = record.location || {}; record.location.lat = Number(lat); }
    if (lng !== undefined) { record.location = record.location || {}; record.location.lng = Number(lng); }
    if (status !== undefined) record.status = status;

    // Handle optional image replacements if new files uploaded — returns true if replaced (for auto-date)
    const replacePhoto = async (field, folder) => {
      const file = req.files?.[field]?.[0];
      if (!file) return false;
      // delete old from ImageKit if exists — use safeDelete to avoid breaking shared/reused photos
      const oldFileId = record[field]?.fileId;
      if (oldFileId) {
        const { safeDeleteFromImageKit } = await import("../services/storageService.js");
        await safeDeleteFromImageKit(oldFileId, record._id);
      }
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `${field}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url, fileId } = await uploadToImageKit(file.buffer, fileName, folder);
      record[field] = { url, fileId, uploadedAt: new Date() };
      return true;
    };

    await replacePhoto("lockPhoto", "/lock-key/locks");
    await replacePhoto("keyPhoto", "/lock-key/keys");
    const placementChanged = await replacePhoto("placementPhoto", "/lock-key/placements");
    const handoverChanged = await replacePhoto("handoverPhoto", "/lock-key/handovers");

    // System-auto dates: never trust client-supplied dates; overwrite server-side on photo change
    if (placementChanged) record.placementAt = new Date();
    if (handoverChanged) record.handoverAt = new Date();

    await record.save();
    res.json({ success: true, message: "Record updated", data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id/handover-photo — change only handover photo, auto-sets handoverAt=now (system date, not client)
export const updateHandoverPhoto = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    const file = req.file || req.files?.handoverPhoto?.[0];
    if (!file) return res.status(400).json({ success: false, message: "handoverPhoto file is required (field: handoverPhoto)" });
    const oldFileId = record.handoverPhoto?.fileId;
    if (oldFileId) {
      const { safeDeleteFromImageKit } = await import("../services/storageService.js");
      await safeDeleteFromImageKit(oldFileId, record._id);
    }
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `handoverPhoto-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/handovers");
    const now = new Date();
    record.handoverPhoto = { url, fileId, uploadedAt: now };
    record.handoverAt = now; // system-auto, no client date
    await record.save();
    res.json({ success: true, message: "Handover photo updated", data: record });
  } catch (err) { next(err); }
};

// PATCH /api/lock-key-records/:id/placement-photo — change only placement photo, auto-sets placementAt=now
export const updatePlacementPhoto = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    const file = req.file || req.files?.placementPhoto?.[0];
    if (!file) return res.status(400).json({ success: false, message: "placementPhoto file is required (field: placementPhoto)" });
    const oldFileId = record.placementPhoto?.fileId;
    if (oldFileId) {
      const { safeDeleteFromImageKit } = await import("../services/storageService.js");
      await safeDeleteFromImageKit(oldFileId, record._id);
    }
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `placementPhoto-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/placements");
    const now = new Date();
    record.placementPhoto = { url, fileId, uploadedAt: now };
    record.placementAt = now;
    await record.save();
    res.json({ success: true, message: "Placement photo updated", data: record });
  } catch (err) { next(err); }
};

// DELETE /api/lock-key-records/:id — admin only, soft delete + ImageKit cleanup
export const deleteRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    record.isDeleted = true;
    await record.save();

    // Best-effort cleanup of ImageKit files (async, don't block response on failure)
    deleteFilesForRecord(record).catch((e) => console.error("[deleteRecord] ImageKit cleanup error:", e.message));

    res.json({ success: true, message: "Record soft-deleted and storage cleanup initiated" });
  } catch (err) {
    next(err);
  }
};

// GET /api/lock-key-records/stats/summary — dashboard stats
export const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalActive, totalReturned, totalLost, totalAll, keysTodayAgg, topRecipients, recentRecords] = await Promise.all([
      LockKeyRecord.countDocuments({ isDeleted: false, status: "active" }),
      LockKeyRecord.countDocuments({ isDeleted: false, status: "returned" }),
      LockKeyRecord.countDocuments({ isDeleted: false, status: "lost" }),
      LockKeyRecord.countDocuments({ isDeleted: false }),
      LockKeyRecord.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, totalKeys: { $sum: "$keyCount" }, count: { $sum: 1 } } },
      ]),
      LockKeyRecord.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$handoverPerson.name", count: { $sum: 1 }, totalKeys: { $sum: "$keyCount" } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: "$_id", count: 1, totalKeys: 1, _id: 0 } },
      ]),
      LockKeyRecord.find({ isDeleted: false }).sort("-createdAt").limit(5).select("handoverPerson keyCount status createdAt").lean(),
    ]);

    const keysToday = keysTodayAgg[0]?.totalKeys || 0;
    const recordsToday = keysTodayAgg[0]?.count || 0;

    res.json({
      success: true,
      data: {
        totalActiveLocks: totalActive,
        totalReturned,
        totalLost,
        totalRecords: totalAll,
        keysHandedOutToday: keysToday,
        recordsCreatedToday: recordsToday,
        topHandoverRecipients: topRecipients,
        recentRecords,
      },
    });
  } catch (err) {
    next(err);
  }
};
