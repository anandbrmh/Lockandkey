import SavedPerson from "../models/SavedPerson.js";
import SavedLocation from "../models/SavedLocation.js";
import LockKeyRecord from "../models/LockKeyRecord.js";
import { deleteFromImageKit } from "../services/storageService.js";

// Sync routine: harvest persons/locations from LockKeyRecords into directory (scoped per user if userId provided)
export const syncDirectoryFromRecords = async (userId = null) => {
  try {
    const filter = { isDeleted: false };
    if (userId) {
      // support both new ownerId and old createdBy during migration
      filter.$or = [{ ownerId: userId }, { createdBy: userId }];
    }
    const records = await LockKeyRecord.find(filter).lean();
    for (const rec of records) {
      const recOwner = rec.ownerId || rec.createdBy;
      if (rec.handoverPerson?.name && recOwner) {
        const nameTrim = rec.handoverPerson.name.trim();
        const nameLower = nameTrim.toLowerCase();
        const existing = await SavedPerson.findOne({ createdBy: recOwner, nameLower });
        if (!existing) {
          await SavedPerson.create({
            name: nameTrim,
            nameLower,
            role: rec.handoverPerson.role || undefined,
            contactNumber: rec.handoverPerson.contactNumber || undefined,
            photo: rec.handoverPhoto?.url ? rec.handoverPhoto : undefined,
            createdBy: recOwner,
            usageCount: 1,
            lastUsedAt: rec.handoverAt || rec.createdAt || new Date(),
          });
        } else if (!existing.photo?.url && rec.handoverPhoto?.url) {
          existing.photo = rec.handoverPhoto;
          await existing.save();
        }
      }

      if (recOwner && (rec.placementPhoto?.url || rec.location?.lat != null)) {
        let existingLoc = null;
        if (rec.placementPhoto?.url) {
          existingLoc = await SavedLocation.findOne({ createdBy: recOwner, "photo.url": rec.placementPhoto.url });
        }
        if (!existingLoc && rec.location?.lat != null && rec.location?.lng != null) {
          existingLoc = await SavedLocation.findOne({
            createdBy: recOwner,
            lat: { $gte: Number(rec.location.lat) - 0.001, $lte: Number(rec.location.lat) + 0.001 },
            lng: { $gte: Number(rec.location.lng) - 0.001, $lte: Number(rec.location.lng) + 0.001 },
          });
        }
        if (!existingLoc) {
          await SavedLocation.create({
            label: rec.location?.lat != null ? `Location (${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : "Placement Location",
            lat: rec.location?.lat != null ? Number(rec.location.lat) : undefined,
            lng: rec.location?.lng != null ? Number(rec.location.lng) : undefined,
            photo: rec.placementPhoto?.url ? rec.placementPhoto : undefined,
            createdBy: recOwner,
            usageCount: 1,
            lastUsedAt: rec.placementAt || rec.createdAt || new Date(),
          });
        }
      }
    }
  } catch (err) {
    console.error("[syncDirectoryFromRecords] error:", err.message);
  }
};

// ============ SAVED PERSONS ============

export const listSavedPersons = async (req, res, next) => {
  try {
    await syncDirectoryFromRecords(req.user._id);

    const { search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { createdBy: req.user._id };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [records, total] = await Promise.all([
      SavedPerson.find(filter).sort("-lastUsedAt").skip(skip).limit(limitNum).lean(),
      SavedPerson.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        persons: records,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) { next(err); }
};

export const getSavedPerson = async (req, res, next) => {
  try {
    const person = await SavedPerson.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!person) return res.status(404).json({ success: false, message: "Person not found" });
    res.json({ success: true, data: person });
  } catch (err) { next(err); }
};

export const deleteSavedPerson = async (req, res, next) => {
  try {
    const person = await SavedPerson.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!person) return res.status(404).json({ success: false, message: "Person not found" });
    await SavedPerson.deleteOne({ _id: req.params.id, createdBy: req.user._id });
    res.json({ success: true, message: "Saved person deleted" });
  } catch (err) { next(err); }
};

// ============ SAVED LOCATIONS ============

export const listSavedLocations = async (req, res, next) => {
  try {
    await syncDirectoryFromRecords(req.user._id);

    const { search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { createdBy: req.user._id };
    if (search) {
      filter.$or = [
        { label: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [records, total] = await Promise.all([
      SavedLocation.find(filter).sort("-lastUsedAt").skip(skip).limit(limitNum).lean(),
      SavedLocation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        locations: records,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) { next(err); }
};

export const getSavedLocation = async (req, res, next) => {
  try {
    const loc = await SavedLocation.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!loc) return res.status(404).json({ success: false, message: "Location not found" });
    res.json({ success: true, data: loc });
  } catch (err) { next(err); }
};

export const deleteSavedLocation = async (req, res, next) => {
  try {
    const loc = await SavedLocation.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!loc) return res.status(404).json({ success: false, message: "Location not found" });
    await SavedLocation.deleteOne({ _id: req.params.id, createdBy: req.user._id });
    res.json({ success: true, message: "Saved location deleted" });
  } catch (err) { next(err); }
};

// Helpers used by lockKeyController to upsert
export const upsertSavedPerson = async ({ name, role, contactNumber, photo, createdBy }) => {
  if (!name || !createdBy) return null;
  const nameLower = name.trim().toLowerCase();
  const doc = await SavedPerson.findOneAndUpdate(
    { createdBy, nameLower },
    { $set: { name: name.trim(), role: role || undefined, contactNumber: contactNumber || undefined, lastUsedAt: new Date(), ...(photo?.url ? { photo } : {}) }, $inc: { usageCount: 1 }, $setOnInsert: { createdBy } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

export const upsertSavedLocation = async ({ label, lat, lng, description, photo, createdBy }) => {
  if (!photo?.url && lat == null && lng == null) return null;
  if (lat != null && lng != null) {
    const nearby = await SavedLocation.findOne({
      createdBy,
      lat: { $gte: Number(lat) - 0.001, $lte: Number(lat) + 0.001 },
      lng: { $gte: Number(lng) - 0.001, $lte: Number(lng) + 0.001 },
    });
    if (nearby) {
      nearby.usageCount += 1;
      nearby.lastUsedAt = new Date();
      if (photo?.url) nearby.photo = photo;
      if (label) nearby.label = label;
      await nearby.save();
      return nearby;
    }
  }
  const doc = await SavedLocation.create({
    label: label || undefined,
    lat: lat != null ? Number(lat) : undefined,
    lng: lng != null ? Number(lng) : undefined,
    description: description || undefined,
    photo,
    createdBy,
    usageCount: 1,
    lastUsedAt: new Date(),
  });
  return doc;
};

