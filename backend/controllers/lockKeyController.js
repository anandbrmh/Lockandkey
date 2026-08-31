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
// Minimal creation supported: only lockPhoto required; other steps can be added later via PATCH
// Supports per-person photo uploads: personPhoto_0, personPhoto_1, ... and per-person status enum
export const createRecord = async (req, res, next) => {
  try {
    const { keyCount, handoverName, handoverRole, handoverContact, lat, lng, status, handoverPersonId, savedLocationId, handoverPersons: handoverPersonsRaw } = req.body;
    let parsedHandoverPersons = null;
    if (handoverPersonsRaw) {
      try { parsedHandoverPersons = typeof handoverPersonsRaw === 'string' ? JSON.parse(handoverPersonsRaw) : handoverPersonsRaw; } catch(e){ parsedHandoverPersons = null; }
    }

    const uploadField = async (fieldName, folder) => {
      const file = req.files?.[fieldName]?.[0];
      if (!file) return undefined;
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `${fieldName}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url, fileId } = await uploadToImageKit(file.buffer, fileName, folder);
      return { url, fileId, uploadedAt: new Date() };
    };

    // Helper to upload per-person photo if present
    const uploadPersonPhoto = async (idx) => {
      const field = `personPhoto_${idx}`;
      const file = req.files?.[field]?.[0];
      if (!file) return undefined;
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `personPhoto-${idx}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/persons");
      return { url, fileId, uploadedAt: new Date() };
    };

    let reusedHandoverPhoto = null;
    let reusedPlacementPhoto = null;
    let reusedHandoverPersonMeta = null;
    let reusedLocationCoords = null;

    if (handoverPersonId) {
      const saved = await SavedPerson.findById(handoverPersonId);
      if (!saved) return res.status(400).json({ success: false, message: "handoverPersonId not found" });
      if (saved.photo?.url) reusedHandoverPhoto = { url: saved.photo.url, fileId: undefined, uploadedAt: saved.photo.uploadedAt || new Date() };
      reusedHandoverPersonMeta = saved;
      saved.usageCount += 1;
      saved.lastUsedAt = new Date();
      await saved.save();
    }

    if (savedLocationId) {
      const savedLoc = await SavedLocation.findById(savedLocationId);
      if (!savedLoc) return res.status(400).json({ success: false, message: "savedLocationId not found" });
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

    const placementPhoto = placementPhotoUploaded || reusedPlacementPhoto || undefined;
    const handoverPhoto = handoverPhotoUploaded || reusedHandoverPhoto || undefined;

    // Build handoverPersons with per-person photo & status
    const allowedPersonStatus = ["active","inactive","returned","lost"];
    let finalHandoverPersons = [];
    let finalHandoverName = handoverName || reusedHandoverPersonMeta?.name;
    let finalHandoverRole = handoverRole || reusedHandoverPersonMeta?.role;
    let finalHandoverContact = handoverContact || reusedHandoverPersonMeta?.contactNumber;

    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons) && parsedHandoverPersons.length > 0) {
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const p = parsedHandoverPersons[i];
        let personId = p.personId || null;
        let name = p.name, role = p.role, contact = p.contact || p.contactNumber;
        let statusVal = allowedPersonStatus.includes(p.status) ? p.status : "active";
        // handle reuse via personId
        if (personId) {
          try {
            const saved = await SavedPerson.findById(personId);
            if (saved) {
              if (!name) name = saved.name;
              if (!role) role = saved.role;
              if (!contact) contact = saved.contactNumber;
              // if per-person photo not uploaded, reuse saved person's photo
              let existingPhoto = null;
              if (saved.photo?.url) existingPhoto = { url: saved.photo.url, fileId: undefined, uploadedAt: saved.photo.uploadedAt || new Date() };
              // will be overridden below if personPhoto_i exists
              saved.usageCount += 1;
              saved.lastUsedAt = new Date();
              await saved.save();
              // store for later if no upload
              if (!req.files?.[`personPhoto_${i}`]?.[0] && existingPhoto) {
                // keep as fallback
                p._fallbackPhoto = existingPhoto;
              }
            }
          } catch(e){ /* ignore */ }
        }
        // Per-person photo: check uploaded file
        let personPhoto = await uploadPersonPhoto(i);
        if (!personPhoto && p._fallbackPhoto) personPhoto = p._fallbackPhoto;
        // Also allow legacy photo field inside JSON (url reuse)
        if (!personPhoto && p.photo?.url) personPhoto = { url: p.photo.url, fileId: p.photo.fileId, uploadedAt: p.photo.uploadedAt ? new Date(p.photo.uploadedAt) : new Date() };

        // For incremental save, allow empty name/role (draft). Only validate if provided persons have at least marker.
        // We do NOT reject empty persons; store as draft with empty strings.
        const entry = {
          name: name ? String(name).trim() : "",
          role: role ? String(role).trim() : "",
          contactNumber: contact ? String(contact).trim() : undefined,
          personId: personId || undefined,
          status: statusVal,
        };
        if (personPhoto) entry.photo = personPhoto;
        finalHandoverPersons.push(entry);
      }
      if (finalHandoverPersons.length > 0) {
        // find first non-empty for legacy handoverPerson
        const firstFilled = finalHandoverPersons.find(p=>p.name) || finalHandoverPersons[0];
        finalHandoverName = firstFilled.name || finalHandoverName;
        finalHandoverRole = firstFilled.role || finalHandoverRole;
        finalHandoverContact = firstFilled.contactNumber || finalHandoverContact;
      }
    } else if (finalHandoverName) {
      // Legacy single-person flow — still support per-person photo via personPhoto_0
      let personPhoto = await uploadPersonPhoto(0);
      if (!personPhoto && reusedHandoverPhoto) personPhoto = reusedHandoverPhoto;
      finalHandoverPersons = [{
        name: String(finalHandoverName).trim(),
        role: finalHandoverRole ? String(finalHandoverRole).trim() : "",
        contactNumber: finalHandoverContact ? String(finalHandoverContact).trim() : undefined,
        personId: handoverPersonId || undefined,
        status: allowedPersonStatus.includes(req.body.handoverStatus) ? req.body.handoverStatus : "active",
      }];
      if (personPhoto) finalHandoverPersons[0].photo = personPhoto;
      else if (handoverPhoto) finalHandoverPersons[0].photo = handoverPhoto; // fallback to group handoverPhoto
    } else {
      // No handover persons provided → allow draft with empty array (incremental save)
      finalHandoverPersons = [];
    }

    let finalLat = lat !== undefined && lat !== "" ? Number(lat) : undefined;
    let finalLng = lng !== undefined && lng !== "" ? Number(lng) : undefined;
    if ((finalLat == null || isNaN(finalLat)) && reusedLocationCoords) finalLat = reusedLocationCoords.lat;
    if ((finalLng == null || isNaN(finalLng)) && reusedLocationCoords) finalLng = reusedLocationCoords.lng;

    const now = new Date();
    const handoverAt = handoverPhoto ? now : (finalHandoverPersons.some(p=>p.photo) ? now : null);
    const placementAt = placementPhoto ? now : null;

    // keyCount handling: if provided use it, else derive from handoverPersons length or default 1
    let finalKeyCount = keyCount !== undefined && keyCount !== "" ? Number(keyCount) : (finalHandoverPersons.length > 0 ? finalHandoverPersons.length : 1);
    if (isNaN(finalKeyCount) || finalKeyCount < 1) finalKeyCount = 1;

    const doc = await LockKeyRecord.create({
      lockPhoto,
      keyPhoto,
      placementPhoto,
      handoverPhoto,
      handoverAt,
      placementAt,
      keyCount: finalKeyCount,
      handoverPerson: {
        name: finalHandoverName || "",
        role: finalHandoverRole || undefined,
        contactNumber: finalHandoverContact || undefined,
      },
      handoverPersons: finalHandoverPersons,
      location: finalLat != null || finalLng != null ? { lat: finalLat, lng: finalLng } : undefined,
      status: status || "active",
      createdBy: req.user._id,
    });

    try {
      for (const pers of finalHandoverPersons) {
        if (!pers.name) continue;
        if (pers.personId) continue;
        const photoForDirectory = pers.photo || handoverPhoto || null;
        await upsertSavedPerson({
          name: pers.name,
          role: pers.role,
          contactNumber: pers.contactNumber,
          photo: photoForDirectory,
          createdBy: req.user._id,
        });
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

// PATCH /api/lock-key-records/:id — update metadata/status (optional re-upload via same fields + per-person photos/status)
export const updateRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    const { keyCount, handoverName, handoverRole, handoverContact, lat, lng, status, handoverPersons: handoverPersonsRaw } = req.body;
    let parsedHandoverPersons = null;
    if (handoverPersonsRaw) {
      try { parsedHandoverPersons = typeof handoverPersonsRaw === 'string' ? JSON.parse(handoverPersonsRaw) : handoverPersonsRaw; } catch(e){ parsedHandoverPersons = null; }
    }

    if (keyCount !== undefined && keyCount !== "") record.keyCount = Number(keyCount);
    if (handoverName !== undefined) record.handoverPerson.name = handoverName;
    if (handoverRole !== undefined) record.handoverPerson.role = handoverRole;
    if (handoverContact !== undefined) record.handoverPerson.contactNumber = handoverContact;
    if (lat !== undefined) { record.location = record.location || {}; record.location.lat = Number(lat); }
    if (lng !== undefined) { record.location = record.location || {}; record.location.lng = Number(lng); }
    if (status !== undefined) record.status = status;

    // Handle per-person updates if array provided
    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons)) {
      const allowedStatus = ["active","inactive","returned","lost"];
      // Ensure array sized to at least parsed length; if keyCount increased elsewhere, expand
      // Update or append each entry
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const incoming = parsedHandoverPersons[i];
        // ensure record array has index
        if (!record.handoverPersons[i]) {
          record.handoverPersons[i] = { name: "", role: "", contactNumber: "", status: "active" };
        }
        const target = record.handoverPersons[i];
        if (incoming.name !== undefined) target.name = String(incoming.name).trim();
        if (incoming.role !== undefined) target.role = String(incoming.role).trim();
        if (incoming.contact !== undefined || incoming.contactNumber !== undefined) {
          const c = incoming.contact ?? incoming.contactNumber;
          target.contactNumber = c ? String(c).trim() : undefined;
        }
        if (incoming.personId !== undefined) target.personId = incoming.personId || undefined;
        if (incoming.status !== undefined && allowedStatus.includes(incoming.status)) target.status = incoming.status;
        // photo via JSON url reuse if provided
        if (incoming.photo?.url && !req.files?.[`personPhoto_${i}`]?.[0]) {
          target.photo = { url: incoming.photo.url, fileId: incoming.photo.fileId, uploadedAt: incoming.photo.uploadedAt ? new Date(incoming.photo.uploadedAt) : new Date() };
        }
      }
      // If keyCount was updated to smaller, slice array to match (optional: keep data)
      const currentKC = Number(record.keyCount) || record.handoverPersons.length;
      if (record.handoverPersons.length > currentKC) {
        // keep extra but allow; alternatively slice — we keep for data safety unless explicitly trimmed
      }
      // Sync legacy handoverPerson to first entry
      if (record.handoverPersons[0]) {
        record.handoverPerson.name = record.handoverPersons[0].name || record.handoverPerson.name;
        record.handoverPerson.role = record.handoverPersons[0].role || record.handoverPerson.role;
        record.handoverPerson.contactNumber = record.handoverPersons[0].contactNumber || record.handoverPerson.contactNumber;
      }
    }

    // Handle optional image replacements if new files uploaded — returns true if replaced (for auto-date)
    const replacePhoto = async (field, folder) => {
      const file = req.files?.[field]?.[0];
      if (!file) return false;
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

    // Per-person photo replacements
    let anyPersonPhotoChanged = false;
    for (let i=0; i<10; i++) {
      const field = `personPhoto_${i}`;
      const file = req.files?.[field]?.[0];
      if (!file) continue;
      // ensure handoverPersons array has entry
      if (!record.handoverPersons[i]) {
        record.handoverPersons[i] = { name: "", role: "", status: "active" };
      }
      const target = record.handoverPersons[i];
      const oldFileId = target.photo?.fileId;
      if (oldFileId) {
        const { safeDeleteFromImageKit } = await import("../services/storageService.js");
        await safeDeleteFromImageKit(oldFileId, record._id);
      }
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `personPhoto-${i}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/persons");
      target.photo = { url, fileId, uploadedAt: new Date() };
      anyPersonPhotoChanged = true;
    }

    if (placementChanged) record.placementAt = new Date();
    if (handoverChanged) record.handoverAt = new Date();
    if (anyPersonPhotoChanged && !handoverChanged) {
      // also bump handoverAt when any per-person photo changes
      record.handoverAt = new Date();
    }

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
