import LockKeyRecord from "../models/LockKeyRecord.js";
import SavedPerson from "../models/SavedPerson.js";
import SavedLocation from "../models/SavedLocation.js";
import Staff from "../models/staff.js";
import { uploadToImageKit, deleteFilesForRecord, getImageKitAuthParams } from "../services/storageService.js";
import { upsertSavedPerson, upsertSavedLocation } from "./directoryController.js";

// Helper: resolve staff person for admin handover (returns normalized data)
const resolveStaffForHandover = async (staffId) => {
  try {
    const staff = await Staff.findById(staffId).lean();
    if (!staff) return null;
    const photo = staff.photo?.url
      ? { url: staff.photo.url, fileId: staff.photo.fileId, uploadedAt: staff.photo.uploadedAt || new Date() }
      : staff.imageUrl
        ? { url: staff.imageUrl, fileId: staff.imageFileId || undefined, uploadedAt: staff.updatedAt || new Date() }
        : null;
    return {
      name: staff.name,
      role: staff.designation || staff.roleTitle || staff.department || "Staff",
      contactNumber: staff.phone || staff.contactNumber || "",
      photo,
      _id: staff._id,
    };
  } catch { return null; }
};

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

    let reusedHandoverPersonMeta = null;
    let reusedPlacementPhoto = null;
    let reusedLocationCoords = null;

    if (handoverPersonId) {
      // Admin flow: handoverPersonId may refer to a Staff (_id) — try Staff first for admin
      let staffMeta = null;
      if (req.user.role === "admin") {
        staffMeta = await resolveStaffForHandover(handoverPersonId);
        if (staffMeta) {
          reusedHandoverPersonMeta = { name: staffMeta.name, role: staffMeta.role, contactNumber: staffMeta.contactNumber, photo: staffMeta.photo };
        }
      }
      if (!staffMeta) {
        const saved = await SavedPerson.findOne({ _id: handoverPersonId, createdBy: req.user._id });
        if (!saved) return res.status(400).json({ success: false, message: "handoverPersonId not found or not owned by you" });
        reusedHandoverPersonMeta = saved;
        saved.usageCount += 1;
        saved.lastUsedAt = new Date();
        await saved.save();
      }
    }

    if (savedLocationId) {
      const savedLoc = await SavedLocation.findOne({ _id: savedLocationId, createdBy: req.user._id });
      if (!savedLoc) return res.status(400).json({ success: false, message: "savedLocationId not found or not owned by you" });
      if (savedLoc.photo?.url) reusedPlacementPhoto = { url: savedLoc.photo.url, fileId: undefined, uploadedAt: savedLoc.photo.uploadedAt || new Date() };
      if (savedLoc.lat != null || savedLoc.lng != null) reusedLocationCoords = { lat: savedLoc.lat, lng: savedLoc.lng };
      savedLoc.usageCount += 1;
      savedLoc.lastUsedAt = new Date();
      await savedLoc.save();
    }

    const [lockPhoto, keyPhoto, placementPhotoUploaded] = await Promise.all([
      uploadField("lockPhoto", "/lock-key/locks"),
      uploadField("keyPhoto", "/lock-key/keys"),
      uploadField("placementPhoto", "/lock-key/placements"),
    ]);

    const placementPhoto = placementPhotoUploaded || reusedPlacementPhoto || undefined;

    // Build handoverPersons with per-person photo & status
    const allowedPersonStatus = ["active","inactive","returned","lost"];
    let finalHandoverPersons = [];
    const fallbackName = handoverName || reusedHandoverPersonMeta?.name;
    const fallbackRole = handoverRole || reusedHandoverPersonMeta?.role;
    const fallbackContact = handoverContact || reusedHandoverPersonMeta?.contactNumber;

    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons) && parsedHandoverPersons.length > 0) {
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const p = parsedHandoverPersons[i];
        let personId = p.personId || null;
        let name = p.name, role = p.role, contact = p.contact || p.contactNumber;
        let statusVal = allowedPersonStatus.includes(p.status) ? p.status : "active";
        let keysGiven = p.keysGiven !== undefined && p.keysGiven !== "" ? parseInt(p.keysGiven, 10) : 1;
        if (isNaN(keysGiven) || keysGiven < 1) keysGiven = 1;
        // handle reuse via personId (must be owned by requester) — admin can reuse Staff
        if (personId) {
          try {
            // Try Staff first when admin (handover browse now returns Staff ids)
            if (req.user.role === "admin") {
              const staffData = await resolveStaffForHandover(personId);
              if (staffData) {
                if (!name) name = staffData.name;
                if (!role) role = staffData.role;
                if (!contact) contact = staffData.contactNumber;
                let existingPhoto = null;
                if (staffData.photo?.url) existingPhoto = { url: staffData.photo.url, fileId: staffData.photo.fileId, uploadedAt: staffData.photo.uploadedAt || new Date() };
                if (!req.files?.[`personPhoto_${i}`]?.[0] && existingPhoto) {
                  p._fallbackPhoto = existingPhoto;
                }
                // skip SavedPerson lookup when staff matched
              } else {
                const saved = await SavedPerson.findOne({ _id: personId, createdBy: req.user._id });
                if (saved) {
                  if (!name) name = saved.name;
                  if (!role) role = saved.role;
                  if (!contact) contact = saved.contactNumber;
                  let existingPhoto = null;
                  if (saved.photo?.url) existingPhoto = { url: saved.photo.url, fileId: undefined, uploadedAt: saved.photo.uploadedAt || new Date() };
                  saved.usageCount += 1;
                  saved.lastUsedAt = new Date();
                  await saved.save();
                  if (!req.files?.[`personPhoto_${i}`]?.[0] && existingPhoto) {
                    p._fallbackPhoto = existingPhoto;
                  }
                }
              }
            } else {
              const saved = await SavedPerson.findOne({ _id: personId, createdBy: req.user._id });
              if (saved) {
                if (!name) name = saved.name;
                if (!role) role = saved.role;
                if (!contact) contact = saved.contactNumber;
                let existingPhoto = null;
                if (saved.photo?.url) existingPhoto = { url: saved.photo.url, fileId: undefined, uploadedAt: saved.photo.uploadedAt || new Date() };
                saved.usageCount += 1;
                saved.lastUsedAt = new Date();
                await saved.save();
                if (!req.files?.[`personPhoto_${i}`]?.[0] && existingPhoto) {
                  p._fallbackPhoto = existingPhoto;
                }
              }
            }
          } catch(e){ /* ignore */ }
        }
        // Per-person photo: check uploaded file
        let personPhoto = await uploadPersonPhoto(i);
        if (!personPhoto && p._fallbackPhoto) personPhoto = p._fallbackPhoto;
        // Also allow legacy photo field inside JSON (url reuse)
        if (!personPhoto && p.photo?.url) personPhoto = { url: p.photo.url, fileId: p.photo.fileId, uploadedAt: p.photo.uploadedAt ? new Date(p.photo.uploadedAt) : new Date() };

        const entry = {
          name: name ? String(name).trim() : "",
          role: role ? String(role).trim() : "",
          contactNumber: contact ? String(contact).trim() : undefined,
          personId: personId || undefined,
          status: statusVal,
          keysGiven,
        };
        if (personPhoto) entry.photo = personPhoto;
        finalHandoverPersons.push(entry);
      }
    } else if (fallbackName) {
      // Legacy single-person flow — still support per-person photo via personPhoto_0
      let personPhoto = await uploadPersonPhoto(0);
      if (!personPhoto && reusedHandoverPersonMeta?.photo?.url) {
        const pm = reusedHandoverPersonMeta.photo;
        personPhoto = { url: pm.url, fileId: pm.fileId, uploadedAt: pm.uploadedAt || new Date() };
      }
      const legacyKeysGiven = req.body.keysGiven !== undefined ? parseInt(req.body.keysGiven, 10) : (req.body.handoverKeysGiven !== undefined ? parseInt(req.body.handoverKeysGiven, 10) : 1);
      finalHandoverPersons = [{
        name: String(fallbackName).trim(),
        role: fallbackRole ? String(fallbackRole).trim() : "",
        contactNumber: fallbackContact ? String(fallbackContact).trim() : undefined,
        personId: handoverPersonId || undefined,
        status: allowedPersonStatus.includes(req.body.handoverStatus) ? req.body.handoverStatus : "active",
        keysGiven: isNaN(legacyKeysGiven) || legacyKeysGiven < 1 ? 1 : legacyKeysGiven,
      }];
      if (personPhoto) finalHandoverPersons[0].photo = personPhoto;
    } else {
      // No handover persons provided → allow draft with empty array (incremental save)
      finalHandoverPersons = [];
    }

    let finalLat = lat !== undefined && lat !== "" ? Number(lat) : undefined;
    let finalLng = lng !== undefined && lng !== "" ? Number(lng) : undefined;
    if ((finalLat == null || isNaN(finalLat)) && reusedLocationCoords) finalLat = reusedLocationCoords.lat;
    if ((finalLng == null || isNaN(finalLng)) && reusedLocationCoords) finalLng = reusedLocationCoords.lng;

    const now = new Date();
    const handoverAt = finalHandoverPersons.some(p => p.photo) ? now : null;
    const placementAt = placementPhoto ? now : null;

    // keyCount handling: independent of keysGiven — one person can take multiple keys
    let finalKeyCount = keyCount !== undefined && keyCount !== "" ? Number(keyCount) : 1;
    if (isNaN(finalKeyCount) || finalKeyCount < 1) finalKeyCount = 1;

    // Admin browse-only enforcement: admin must select from existing staff (photo + name from staff record)
    if (req.user.role === "admin" && finalHandoverPersons.length > 0) {
      // Block direct person photo uploads for admin (browse only)
      for (let i = 0; i < 10; i++) {
        if (req.files?.[`personPhoto_${i}`]?.[0]) {
          return res.status(400).json({ success: false, message: `Admin cannot upload handover person photo for person ${i + 1} — browse existing staff only.` });
        }
      }
      for (let i = 0; i < finalHandoverPersons.length; i++) {
        const p = finalHandoverPersons[i];
        if (p.name && !p.personId) {
          return res.status(400).json({ success: false, message: `Admin must browse existing staff for handover person ${i + 1} — upload/camera disabled. Select staff with image + name via Browse staff.` });
        }
        if (p.name && !p.photo?.url) {
          return res.status(400).json({ success: false, message: `Staff photo required for handover person ${i + 1}. Staff must have image from staff onboarding.` });
        }
      }
    }

    const doc = await LockKeyRecord.create({
      lockPhoto,
      keyPhoto,
      placementPhoto,
      handoverAt,
      placementAt,
      keyCount: finalKeyCount,
      handoverPersons: finalHandoverPersons,
      location: finalLat != null || finalLng != null ? { lat: finalLat, lng: finalLng } : undefined,
      status: status || "active",
      ownerId: req.user._id,
    });

    try {
      for (const pers of finalHandoverPersons) {
        if (!pers.name) continue;
        if (pers.personId) continue;
        await upsertSavedPerson({
          name: pers.name,
          role: pers.role,
          contactNumber: pers.contactNumber,
          photo: pers.photo || null,
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

// GET /api/lock-key-records — list with pagination & filters (isolated per user)
export const listRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, handoverName, sort = "-createdAt" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isDeleted: false, ownerId: req.user._id };
    if (status) filter.status = status;
    if (handoverName) filter["handoverPersons.name"] = { $regex: handoverName, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      LockKeyRecord.find(filter).populate("ownerId", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
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

// GET /api/lock-key-records/:id (owner only)
export const getRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, ownerId: req.user._id }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id — update metadata/status (owner only)
export const updateRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, ownerId: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    const { keyCount, lat, lng, status, handoverPersons: handoverPersonsRaw } = req.body;
    let parsedHandoverPersons = null;
    if (handoverPersonsRaw) {
      try { parsedHandoverPersons = typeof handoverPersonsRaw === 'string' ? JSON.parse(handoverPersonsRaw) : handoverPersonsRaw; } catch(e){ parsedHandoverPersons = null; }
    }

    if (keyCount !== undefined && keyCount !== "") record.keyCount = Number(keyCount);
    if (lat !== undefined) { record.location = record.location || {}; record.location.lat = Number(lat); }
    if (lng !== undefined) { record.location = record.location || {}; record.location.lng = Number(lng); }
    if (status !== undefined) record.status = status;

    // Handle per-person updates if array provided
    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons)) {
      const allowedStatus = ["active","inactive","returned","lost"];
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const incoming = parsedHandoverPersons[i];
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
        if (incoming.keysGiven !== undefined) {
          let kg = parseInt(incoming.keysGiven, 10);
          if (!isNaN(kg) && kg >= 1) target.keysGiven = kg;
        }
        // photo via JSON url reuse if provided
        if (incoming.photo?.url && !req.files?.[`personPhoto_${i}`]?.[0]) {
          target.photo = { url: incoming.photo.url, fileId: incoming.photo.fileId, uploadedAt: incoming.photo.uploadedAt ? new Date(incoming.photo.uploadedAt) : new Date() };
        }
      }
      // Ensure keysGiven defaults
      record.handoverPersons.forEach(p => { if (!p.keysGiven || p.keysGiven < 1) p.keysGiven = 1; });
      // Admin browse-only enforcement on update
      if (req.user.role === "admin" && record.handoverPersons.length > 0) {
        for (let i = 0; i < record.handoverPersons.length; i++) {
          const p = record.handoverPersons[i];
          if (p.name && !p.personId) {
            return res.status(400).json({ success: false, message: `Admin must browse existing staff for handover person ${i + 1} — upload/camera disabled.` });
          }
        }
      }
      // Block admin per-person photo uploads (browse only)
      if (req.user.role === "admin") {
        for (let i = 0; i < 10; i++) {
          if (req.files?.[`personPhoto_${i}`]?.[0]) {
            return res.status(400).json({ success: false, message: `Admin cannot upload handover person photo for person ${i + 1} — browse existing staff only.` });
          }
        }
      }
    }

    // Handle optional image replacements if new files uploaded
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

    // Per-person photo replacements
    let anyPersonPhotoChanged = false;
    for (let i=0; i<10; i++) {
      const field = `personPhoto_${i}`;
      const file = req.files?.[field]?.[0];
      if (!file) continue;
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
    if (anyPersonPhotoChanged) record.handoverAt = new Date();

    await record.save();
    res.json({ success: true, message: "Record updated", data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id/handover-photo — owner only (legacy endpoint; updates person 0 photo)
export const updateHandoverPhoto = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, ownerId: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    const file = req.file || req.files?.handoverPhoto?.[0];
    if (!file) return res.status(400).json({ success: false, message: "handoverPhoto file is required (field: handoverPhoto)" });
    // Ensure at least one person entry exists
    if (!record.handoverPersons[0]) {
      record.handoverPersons.push({ name: "", role: "", status: "active" });
    }
    const target = record.handoverPersons[0];
    const oldFileId = target.photo?.fileId;
    if (oldFileId) {
      const { safeDeleteFromImageKit } = await import("../services/storageService.js");
      await safeDeleteFromImageKit(oldFileId, record._id);
    }
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `handoverPhoto-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/persons");
    const now = new Date();
    target.photo = { url, fileId, uploadedAt: now };
    record.handoverAt = now;
    await record.save();
    res.json({ success: true, message: "Handover photo updated", data: record });
  } catch (err) { next(err); }
};

// PATCH /api/lock-key-records/:id/placement-photo — owner only
export const updatePlacementPhoto = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, ownerId: req.user._id });
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

// DELETE /api/lock-key-records/:id — owner or admin, soft delete
export const deleteRecord = async (req, res, next) => {
  try {
    // Allow owner or admin to delete; admin can delete any record, otherwise must own it
    const baseFilter = { _id: req.params.id, isDeleted: false };
    if (req.user.role !== "admin") baseFilter.ownerId = req.user._id;
    const record = await LockKeyRecord.findOne(baseFilter);
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

// GET /api/lock-key-records/stats/summary — dashboard stats (isolated per user)
export const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const ownerFilter = { isDeleted: false, ownerId: req.user._id };

    const [totalActive, totalReturned, totalLost, totalAll, keysTodayAgg, topRecipients, recentRecords] = await Promise.all([
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "active" }),
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "returned" }),
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "lost" }),
      LockKeyRecord.countDocuments(ownerFilter),
      LockKeyRecord.aggregate([
        { $match: { ...ownerFilter, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, totalKeys: { $sum: "$keyCount" }, count: { $sum: 1 } } },
      ]),
      LockKeyRecord.aggregate([
        { $match: ownerFilter },
        { $unwind: { path: "$handoverPersons", preserveNullAndEmpty: true } },
        { $group: { _id: "$handoverPersons.name", count: { $sum: 1 }, totalKeys: { $sum: "$handoverPersons.keysGiven" } } },
        { $match: { _id: { $ne: null, $ne: "" } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: "$_id", count: 1, totalKeys: 1, _id: 0 } },
      ]),
      LockKeyRecord.find(ownerFilter).sort("-createdAt").limit(5).select("handoverPersons keyCount status createdAt").lean(),
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
