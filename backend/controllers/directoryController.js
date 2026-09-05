import SavedLocation from "../models/SavedLocation.js";
import LockKeyRecord from "../models/LockKeyRecord.js";
import Staff from "../models/staff.js";
import { deleteFromImageKit } from "../services/storageService.js";

// Helper: map Staff doc to standardized person shape for directory & handover
export const mapStaffToPerson = (s) => {
  if (!s) return null;
  const photo = s.photo?.url ? s.photo : null;
  const userObj = s.user && typeof s.user === 'object' ? s.user : null;
  const userRole = userObj?.role || s.userRole || null;
  const isSubAdmin = userRole === 'subadmin';
  return {
    _id: s._id,
    name: s.name,
    role: s.designation || s.roleTitle || s.department || "Staff",
    contactNumber: s.phone || s.contactNumber || "",
    email: s.email,
    department: s.department,
    designation: s.designation,
    roleTitle: s.roleTitle,
    phone: s.phone,
    photo,
    isStaff: true,
    isSubAdmin,
    userRole,
    staffId: s._id,
    userId: userObj?._id || s.user,
    user: userObj || s.user,
    profileCompleted: s.profileCompleted,
    adminCodeVerified: !!s.adminCodeVerified,
    verifiedAdminCode: s.verifiedAdminCode || null,
    usageCount: 1,
    lastUsedAt: s.updatedAt || s.createdAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
};

// Sync routine: harvest locations from LockKeyRecords into directory (scoped per user if userId provided)
export const syncDirectoryFromRecords = async (userId = null) => {
  try {
    const filter = { isDeleted: false };
    if (userId) {
      filter.$or = [{ ownerId: userId }, { createdBy: userId }];
    }
    const records = await LockKeyRecord.find(filter).lean();
    for (const rec of records) {
      const recOwner = rec.ownerId || rec.createdBy;
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
            lastUsedAt: rec.placementPhoto?.uploadedAt || rec.createdAt || new Date(),
          });
        }
      }
    }
  } catch (err) {
    console.error("[syncDirectoryFromRecords] error:", err.message);
  }
};

// ============ STAFF PERSONS DIRECTORY ============

export const listSavedPersons = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 20, verified, adminCodeVerified } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    // Verified-only filter for admin handover: ?verified=true or ?adminCodeVerified=true
    const verifiedOnly = String(verified).toLowerCase() === 'true' || String(adminCodeVerified).toLowerCase() === 'true';
    if (verifiedOnly) filter.adminCodeVerified = true;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { name: regex },
        { email: regex },
        { department: regex },
        { designation: regex },
        { roleTitle: regex },
        { phone: regex },
        { contactNumber: regex },
      ];
    }

    const [records, total] = await Promise.all([
      Staff.find(filter).populate("user", "name email role adminCode").sort("-updatedAt").skip(skip).limit(limitNum).lean(),
      Staff.countDocuments(filter),
    ]);

    const persons = records.map(mapStaffToPerson);

    res.json({
      success: true,
      data: {
        persons,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) { next(err); }
};

export const getSavedPerson = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate("user", "name email role adminCode").lean();
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    res.json({ success: true, data: mapStaffToPerson(staff) });
  } catch (err) { next(err); }
};

export const deleteSavedPerson = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can remove staff members" });
    }
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    await Staff.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Staff member deleted" });
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

// No-op compatibility helper
export const upsertSavedPerson = async () => null;

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
