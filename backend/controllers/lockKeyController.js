import LockKeyRecord from "../models/LockKeyRecord.js";
import SavedLocation from "../models/SavedLocation.js";
import Staff from "../models/staff.js";
import { uploadToImageKit, deleteFilesForRecord, getImageKitAuthParams } from "../services/storageService.js";
import { upsertSavedLocation } from "./directoryController.js";
import triggerEvent from "../../services/dispatcher.js";

// Helper: resolve staff person for handover (returns normalized data)
const resolveStaffForHandover = async (staffId) => {
  try {
    const staff = await Staff.findById(staffId).lean();
    if (!staff) return null;
    const photo = staff.photo?.url
      ? { url: staff.photo.url, fileId: staff.photo.fileId, uploadedAt: staff.photo.uploadedAt || new Date() }
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

    let reusedHandoverPhoto = null;
    let reusedPlacementPhoto = null;
    let reusedHandoverPersonMeta = null;
    let reusedLocationCoords = null;

    if (handoverPersonId) {
      const staffMeta = await resolveStaffForHandover(handoverPersonId);
      if (staffMeta) {
        if (staffMeta.photo?.url) reusedHandoverPhoto = { url: staffMeta.photo.url, fileId: staffMeta.photo.fileId, uploadedAt: staffMeta.photo.uploadedAt || new Date() };
        reusedHandoverPersonMeta = { name: staffMeta.name, role: staffMeta.role, contactNumber: staffMeta.contactNumber, photo: staffMeta.photo };
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
    let finalHandoverName = handoverName || reusedHandoverPersonMeta?.name;
    let finalHandoverRole = handoverRole || reusedHandoverPersonMeta?.role;
    let finalHandoverContact = handoverContact || reusedHandoverPersonMeta?.contactNumber;

    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons) && parsedHandoverPersons.length > 0) {
      for (let i=0; i< parsedHandoverPersons.length; i++) {
        const p = parsedHandoverPersons[i];
        let personId = p.personId || null;
        let name = p.name, role = p.role, contact = p.contact || p.contactNumber;
        let statusVal = allowedPersonStatus.includes(p.status) ? p.status : "active";
        let keysGiven = p.keysGiven !== undefined && p.keysGiven !== "" ? parseInt(p.keysGiven, 10) : 1;
        if (isNaN(keysGiven) || keysGiven < 1) keysGiven = 1;
        // handle reuse via personId (refers to Staff)
        if (personId) {
          try {
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
            }
          } catch(e){ /* ignore */ }
        }
        // Per-person photo: check uploaded file
        let personPhoto = await uploadPersonPhoto(i);
        if (!personPhoto && p._fallbackPhoto) personPhoto = p._fallbackPhoto;
        // Also allow legacy photo field inside JSON (url reuse)
        if (!personPhoto && p.photo?.url) personPhoto = { url: p.photo.url, fileId: p.photo.fileId, uploadedAt: p.photo.uploadedAt ? new Date(p.photo.uploadedAt) : new Date() };

        const trimmedName = name ? String(name).trim() : "";
        const trimmedRole = role ? String(role).trim() : "";
        const trimmedContact = contact ? String(contact).trim() : undefined;

        // Only store valid/non-empty persons (do not push empty dummy slots)
        if (trimmedName || personId || personPhoto) {
          const entry = {
            name: trimmedName,
            role: trimmedRole,
            contactNumber: trimmedContact,
            personId: personId || undefined,
            status: statusVal,
            keysGiven,
          };
          if (personPhoto) entry.photo = personPhoto;
          finalHandoverPersons.push(entry);
        }
      }
    } else if (finalHandoverName) {
      // Legacy single-person flow — still support per-person photo via personPhoto_0
      let personPhoto = await uploadPersonPhoto(0);
      if (!personPhoto && reusedHandoverPhoto) personPhoto = reusedHandoverPhoto;
      const legacyKeysGiven = req.body.keysGiven !== undefined ? parseInt(req.body.keysGiven, 10) : (req.body.handoverKeysGiven !== undefined ? parseInt(req.body.handoverKeysGiven, 10) : 1);
      finalHandoverPersons = [{
        name: String(finalHandoverName).trim(),
        role: finalHandoverRole ? String(finalHandoverRole).trim() : "",
        contactNumber: finalHandoverContact ? String(finalHandoverContact).trim() : undefined,
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

    // keyCount handling: independent of keysGiven — one person can take multiple keys
    let finalKeyCount = keyCount !== undefined && keyCount !== "" ? Number(keyCount) : 1;
    if (isNaN(finalKeyCount) || finalKeyCount < 1) finalKeyCount = 1;
    // No sum validation: keysGiven per person is independent (e.g. 1 person can take 5 keys)

    // Admin browse-only + verified-only enforcement: admin must select verified staff (photo + name from verified staff record)
    if (req.user.role === "admin" && finalHandoverPersons.length > 0) {
      // Block direct person photo uploads for admin (browse only)
      for (let i = 0; i < 10; i++) {
        if (req.files?.[`personPhoto_${i}`]?.[0]) {
          return res.status(400).json({ success: false, message: `Admin cannot upload handover person photo for person ${i + 1} — browse existing verified staff only.` });
        }
      }
      for (let i = 0; i < finalHandoverPersons.length; i++) {
        const p = finalHandoverPersons[i];
        if (p.name && !p.personId) {
          return res.status(400).json({ success: false, message: `Admin must browse verified staff for handover person ${i + 1} — upload/camera disabled. Select verified staff with image + name via Browse staff.` });
        }
        if (p.name && !p.photo?.url) {
          return res.status(400).json({ success: false, message: `Staff photo required for handover person ${i + 1}. Staff must have image from staff onboarding.` });
        }
        // Verified-only check: admin can only handover to staff with adminCodeVerified === true
        if (p.personId) {
          const staffDoc = await Staff.findById(p.personId).select("adminCodeVerified name").lean();
          if (!staffDoc) {
            return res.status(400).json({ success: false, message: `Verified staff not found for handover person ${i + 1}.` });
          }
          if (!staffDoc.adminCodeVerified) {
            return res.status(400).json({ success: false, message: `Admin can only handover to verified staff. ${staffDoc.name || `Person ${i + 1}`} is not verified (must submit admin code).` });
          }
        }
      }
    }

    const doc = await LockKeyRecord.create({
      lockPhoto,
      keyPhoto,
      placementPhoto,
      keyCount: finalKeyCount,
      handoverPersons: finalHandoverPersons,
      location: finalLat != null || finalLng != null ? { lat: finalLat, lng: finalLng } : undefined,
      status: status || "active",
      ownerId: req.user._id,
    });



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

    // Outbound webhook — fire and forget (don't block response). Enriched payload for consumers.
    triggerEvent("record.created", {
      recordId: doc._id,
      ownerId: req.user._id,
      status: doc.status,
      keyCount: doc.keyCount,
      handoverPersons: doc.handoverPersons,
      location: doc.location,
      lockPhoto: doc.lockPhoto,
      keyPhoto: doc.keyPhoto,
      placementPhoto: doc.placementPhoto,
      createdAt: doc.createdAt,
    }).catch((e) => console.warn("[Webhook] dispatch failed:", e.message));

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

    const filter = { isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] };
    if (status) filter.status = status;
    if (handoverName) filter["handoverPersons.name"] = { $regex: handoverName, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [recordsRaw, total] = await Promise.all([
      LockKeyRecord.find(filter).populate("ownerId", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
      LockKeyRecord.countDocuments(filter),
    ]);
    // Normalize: expose both ownerId and createdBy for backward compat (lean doesn't include virtuals)
    const records = recordsRaw.map((r) => ({
      ...r,
      ownerId: r.ownerId || r.createdBy,
      createdBy: r.ownerId || r.createdBy,
    }));

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
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id — update metadata/status (owner only)
export const updateRecord = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    const { keyCount, handoverName, handoverRole, handoverContact, lat, lng, status, handoverPersons: handoverPersonsRaw } = req.body;
    let parsedHandoverPersons = null;
    if (handoverPersonsRaw) {
      try { parsedHandoverPersons = typeof handoverPersonsRaw === 'string' ? JSON.parse(handoverPersonsRaw) : handoverPersonsRaw; } catch(e){ parsedHandoverPersons = null; }
    }

    if (keyCount !== undefined && keyCount !== "") record.keyCount = Number(keyCount);
    if (lat !== undefined) { record.location = record.location || {}; record.location.lat = Number(lat); }
    if (lng !== undefined) { record.location = record.location || {}; record.location.lng = Number(lng); }
    if (status !== undefined) record.status = status;

    // Handle per-person updates if array provided — filter out blank entries
    if (parsedHandoverPersons && Array.isArray(parsedHandoverPersons)) {
      const allowedStatus = ["active","inactive","returned","lost"];
      const updatedList = [];

      for (let i = 0; i < parsedHandoverPersons.length; i++) {
        const incoming = parsedHandoverPersons[i];
        if (!incoming) continue;
        const name = incoming.name !== undefined ? String(incoming.name).trim() : "";
        const role = incoming.role !== undefined ? String(incoming.role).trim() : "";
        const contactNumber = incoming.contact !== undefined || incoming.contactNumber !== undefined ? String(incoming.contact ?? incoming.contactNumber).trim() : undefined;
        const personId = incoming.personId || undefined;
        const statusVal = allowedStatus.includes(incoming.status) ? incoming.status : "active";
        let keysGiven = parseInt(incoming.keysGiven, 10);
        if (isNaN(keysGiven) || keysGiven < 1) keysGiven = 1;

        let photo = undefined;
        if (incoming.photo?.url) {
          photo = { url: incoming.photo.url, fileId: incoming.photo.fileId, uploadedAt: incoming.photo.uploadedAt ? new Date(incoming.photo.uploadedAt) : new Date() };
        } else if (record.handoverPersons?.[i]?.photo?.url) {
          photo = record.handoverPersons[i].photo;
        }

        // Only keep non-empty entries
        if (name || personId || photo?.url) {
          const entry = {
            name,
            role,
            contactNumber: contactNumber || undefined,
            personId,
            status: statusVal,
            keysGiven,
          };
          if (photo) entry.photo = photo;
          updatedList.push(entry);
        }
      }
      record.handoverPersons = updatedList;

      // Admin browse-only + verified-only enforcement on update
      if (req.user.role === "admin" && record.handoverPersons.length > 0) {
        for (let i = 0; i < record.handoverPersons.length; i++) {
          const p = record.handoverPersons[i];
          if (p.name && !p.personId) {
            return res.status(400).json({ success: false, message: `Admin must browse verified staff for handover person ${i + 1} — upload/camera disabled.` });
          }
          if (p.personId) {
            const staffDoc = await Staff.findById(p.personId).select("adminCodeVerified name").lean();
            if (!staffDoc) {
              return res.status(400).json({ success: false, message: `Verified staff not found for handover person ${i + 1}.` });
            }
            if (!staffDoc.adminCodeVerified) {
              return res.status(400).json({ success: false, message: `Admin can only handover to verified staff. ${staffDoc.name || `Person ${i + 1}`} is not verified.` });
            }
          }
        }
      }
      // Block admin per-person photo uploads (browse only)
      if (req.user.role === "admin") {
        for (let i = 0; i < 10; i++) {
          if (req.files?.[`personPhoto_${i}`]?.[0]) {
            return res.status(400).json({ success: false, message: `Admin cannot upload handover person photo for person ${i + 1} — browse existing verified staff only.` });
          }
        }
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
    await replacePhoto("placementPhoto", "/lock-key/placements");

    // Per-person photo replacements
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
    }

    await record.save();

    // Webhook: detect status change vs generic update — send enriched payload
    const wasStatusChanged = req.body.status && req.body.status !== record.status;
    const eventName = wasStatusChanged ? "record.status_changed" : "record.updated";
    triggerEvent(eventName, {
      recordId: record._id,
      ownerId: req.user._id,
      status: record.status,
      keyCount: record.keyCount,
      handoverPersons: record.handoverPersons,
      location: record.location,
    }).catch((e) => console.warn("[Webhook] dispatch failed:", e.message));

    res.json({ success: true, message: "Record updated", data: record });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lock-key-records/:id/person-photo/:personIndex — update per-person photo
export const updatePersonPhoto = async (req, res, next) => {
  try {
    const { id, personIndex } = req.params;
    const personIdx = parseInt(personIndex, 10);
    if (isNaN(personIdx) || personIdx < 0) return res.status(400).json({ success: false, message: "Invalid person index" });
    
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    
    const file = req.file || req.files?.personPhoto?.[0];
    if (!file) return res.status(400).json({ success: false, message: "personPhoto file is required (field: personPhoto)" });
    
    // Ensure handoverPersons array has entry
    if (!record.handoverPersons[personIdx]) {
      record.handoverPersons[personIdx] = { name: "", role: "", status: "active" };
    }
    
    const target = record.handoverPersons[personIdx];
    const oldFileId = target.photo?.fileId;
    if (oldFileId) {
      const { safeDeleteFromImageKit } = await import("../services/storageService.js");
      await safeDeleteFromImageKit(oldFileId, record._id);
    }
    
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `personPhoto-${personIdx}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { url, fileId } = await uploadToImageKit(file.buffer, fileName, "/lock-key/persons");
    target.photo = { url, fileId, uploadedAt: new Date() };
    
    await record.save();
    res.json({ success: true, message: "Person photo updated", data: record });
  } catch (err) { next(err); }
};

// PATCH /api/lock-key-records/:id/placement-photo — owner only
export const updatePlacementPhoto = async (req, res, next) => {
  try {
    const record = await LockKeyRecord.findOne({ _id: req.params.id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] });
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
    await record.save();
    res.json({ success: true, message: "Placement photo updated", data: record });
  } catch (err) { next(err); }
};

// DELETE /api/lock-key-records/:id — owner or admin, soft delete
export const deleteRecord = async (req, res, next) => {
  try {
    // Allow owner or admin to delete; admin can delete any record, otherwise must own it
    const baseFilter = { _id: req.params.id, isDeleted: false };
    if (req.user.role !== "admin") baseFilter.$or = [{ ownerId: req.user._id }, { createdBy: req.user._id }];
    const record = await LockKeyRecord.findOne(baseFilter);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    record.isDeleted = true;
    await record.save();

    // Best-effort cleanup of ImageKit files (async, don't block response on failure)
    deleteFilesForRecord(record).catch((e) => console.error("[deleteRecord] ImageKit cleanup error:", e.message));

    triggerEvent("record.deleted", {
      recordId: record._id,
      ownerId: req.user?._id,
      status: record.status,
      deletedAt: new Date().toISOString(),
    }).catch((e) => console.warn("[Webhook] dispatch failed:", e.message));

    res.json({ success: true, message: "Record soft-deleted and storage cleanup initiated" });
  } catch (err) {
    next(err);
  }
};

// GET /api/lock-key-records/my-assignments — keys assigned to current staff/subadmin user
export const getMyAssignedRecords = async (req, res, next) => {
  try {
    if (!['staff','subadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only staff/subadmin can view assigned keys' });
    }
    const staff = await Staff.findOne({ user: req.user._id }).lean();
    if (!staff) {
      return res.json({ success: true, data: { records: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } } });
    }
    const { page = 1, limit = 10, status, sort = "-createdAt" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const baseFilter = {
      isDeleted: false,
      $or: [
        { "handoverPersons.personId": staff._id },
        { "handoverPersons.name": { $regex: `^${staff.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    };
    if (status) baseFilter.status = status;

    const [records, total] = await Promise.all([
      LockKeyRecord.find(baseFilter).populate("ownerId", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
      LockKeyRecord.countDocuments(baseFilter),
    ]);

    // Filter to only persons matching this staff for keysGiven sum helper on frontend, but keep full record
    res.json({
      success: true,
      data: {
        records,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/lock-key-records/my-assignments/stats — stats for staff/subadmin assigned keys
export const getMyAssignedStats = async (req, res, next) => {
  try {
    if (!['staff','subadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only staff/subadmin can view assigned stats' });
    }
    const staff = await Staff.findOne({ user: req.user._id }).lean();
    if (!staff) {
      return res.json({ success: true, data: { totalAssignedKeys: 0, totalAssignedLocks: 0, active: 0, returned: 0, lost: 0 } });
    }
    const matchAssigned = {
      isDeleted: false,
      $or: [
        { "handoverPersons.personId": staff._id },
        { "handoverPersons.name": { $regex: `^${staff.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    };
    const [totalAssignedLocks, active, returned, lost, assignedKeysAgg] = await Promise.all([
      LockKeyRecord.countDocuments(matchAssigned),
      LockKeyRecord.countDocuments({ ...matchAssigned, status: "active" }),
      LockKeyRecord.countDocuments({ ...matchAssigned, status: "returned" }),
      LockKeyRecord.countDocuments({ ...matchAssigned, status: "lost" }),
      LockKeyRecord.aggregate([
        { $match: matchAssigned },
        { $unwind: "$handoverPersons" },
        { $match: { $or: [{ "handoverPersons.personId": staff._id }, { "handoverPersons.name": { $regex: `^${staff.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] } },
        { $group: { _id: null, totalKeys: { $sum: "$handoverPersons.keysGiven" } } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        totalAssignedLocks,
        totalAssignedKeys: assignedKeysAgg[0]?.totalKeys || 0,
        active,
        returned,
        lost,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/lock-key-records/stats/summary — dashboard stats (isolated per user)
export const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const ownerFilter = { isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] };

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
        { $unwind: "$handoverPersons" },
        { $group: { _id: "$handoverPersons.name", count: { $sum: 1 }, totalKeys: { $sum: "$keyCount" } } },
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

export async function getlockandkeycounts(req, res, next) {
  try {
    const ownerFilter = { isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] };  


    const [totalActive, totalReturned, totalLost, totalAll] = await Promise.all([
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "active" }),
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "returned" }),
      LockKeyRecord.countDocuments({ ...ownerFilter, status: "lost" }),
      LockKeyRecord.countDocuments(ownerFilter),
    ]);
    res.status(200).json({
      success: true,
      data: { 
        totalActiveLocks: totalActive,
        totalReturned,
        totalLost,
        totalRecords: totalAll
      }
    });

  } catch (err) {
    next(err);
  }   

}

export async function specificlockandkey(req, res, next) {
  try {
    const { id } = req.params;
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
} 

export async function getlock(req, res, next) {
  try {
    const { id } = req.params;
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({
      success: true,
      data: record.lockPhoto
    });
  } catch (err) {
    next(err);
  }
}

export async function getkey(req, res, next) {
  try {
    const { id } = req.params;
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({
      success: true,
      data: record.keyPhoto
    });
  } catch (err) {
    next(err);
  }
}

export async function gethandover(req, res, next) {
  try {
    const { id } = req.params;
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    const firstPersonPhoto = record.handoverPersons?.[0]?.photo || null;
    res.status(200).json({
      success: true,
      data: firstPersonPhoto
    });
  } catch (err) {
    next(err);
  }
}

export async function getplacement(req, res, next) {
  try {
    const { id } = req.params;
    const record = await LockKeyRecord.findOne({ _id: id, isDeleted: false, $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] }).populate("ownerId", "name email role");
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({
      success: true,
      data: record.placementPhoto
    });
  } catch (err) {
    next(err);
  }
} 

