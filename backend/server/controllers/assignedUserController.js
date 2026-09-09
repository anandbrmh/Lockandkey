import AssignedUser from "../models/AssignedUser.js";
import LockKeyRecord from "../models/LockKeyRecord.js";

export const createAssignedUser = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const trimmedName = String(name || "").trim();
    const trimmedPhone = String(phone || "").trim();
    if (!trimmedName || trimmedName.length < 2) return res.status(400).json({ success: false, message: "Name is required (min 2 chars)" });
    if (!trimmedPhone) return res.status(400).json({ success: false, message: "Phone number is required" });
    const exists = await AssignedUser.findOne({ createdBy: req.user._id, phone: trimmedPhone });
    if (exists) return res.status(409).json({ success: false, message: "Phone already exists for your assigned users" });
    let photo = undefined;
    const file = req.file || req.files?.photo?.[0] || req.files?.image?.[0];
    if (file) {
      const { uploadToImageKit } = await import("../services/storageService.js");
      const ext = file.originalname?.split(".").pop() || "jpg";
      const fileName = `assigned-${Date.now()}-${Math.round(Math.random()*1e9)}.${ext}`;
      const uploaded = await uploadToImageKit(file.buffer, fileName, "/assigned-users");
      photo = { url: uploaded.url, fileId: uploaded.fileId, uploadedAt: new Date() };
    } else if (req.body.photoUrl) {
      photo = { url: String(req.body.photoUrl), uploadedAt: new Date() };
    }
    const doc = await AssignedUser.create({ name: trimmedName, phone: trimmedPhone, photo, createdBy: req.user._id });
    res.status(201).json({ success: true, message: "Assigned user created", data: doc });
  } catch (err) { next(err); }
};

export const listAssignedUsers = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const filter = { createdBy: req.user._id };
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { phone: regex }];
    }
    const [records, total] = await Promise.all([
      AssignedUser.find(filter).sort("-updatedAt").skip(skip).limit(limitNum).lean(),
      AssignedUser.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users: records, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } } });
  } catch (err) { next(err); }
};

export const getAssignedUser = async (req, res, next) => {
  try {
    const doc = await AssignedUser.findOne({ _id: req.params.id, createdBy: req.user._id }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Assigned user not found" });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

export const deleteAssignedUser = async (req, res, next) => {
  try {
    const doc = await AssignedUser.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Assigned user not found" });
    await AssignedUser.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Assigned user deleted" });
  } catch (err) { next(err); }
};

export const getAssignedUserRecords = async (req, res, next) => {
  try {
    const assignedUser = await AssignedUser.findOne({ _id: req.params.id, createdBy: req.user._id }).lean();
    if (!assignedUser) return res.status(404).json({ success: false, message: "Assigned user not found" });
    const { page = 1, limit = 20, sort = "-createdAt" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const escapedName = (assignedUser.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rawPhone = assignedUser.phone ? String(assignedUser.phone).trim() : "";
    const handoverOr = [{ "handoverPersons.personId": assignedUser._id }];
    // Only add phone clause if phone is real (not empty, not auto- placeholder)
    if (rawPhone && !rawPhone.startsWith("auto-")) {
      const escPhone = rawPhone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      handoverOr.push({ "handoverPersons.contactNumber": { $regex: escPhone, $options: "i" } });
      handoverOr.push({ "handoverPersons.contact": { $regex: escPhone, $options: "i" } });
    }
    // Lenient name match — substring, case-insensitive (fixes vijay no-locks bug)
    if (escapedName) {
      handoverOr.push({ "handoverPersons.name": { $regex: escapedName, $options: "i" } });
    }

    const combined = {
      isDeleted: false,
      ownerId: req.user._id,
      $or: handoverOr,
    };

    const [recordsRaw, total] = await Promise.all([
      LockKeyRecord.find(combined).populate("ownerId", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
      LockKeyRecord.countDocuments(combined),
    ]);
    // Fallback: if strict ownerId yields 0, also try without owner filter (for legacy records where ownerId stored differently)
    let finalRecords = recordsRaw;
    let finalTotal = total;
    if (finalTotal === 0) {
      const fallbackFilter = { isDeleted: false, $or: handoverOr };
      const [fbRecords, fbTotal] = await Promise.all([
        LockKeyRecord.find(fallbackFilter).populate("ownerId", "name email role").sort(sort).skip(skip).limit(limitNum).lean(),
        LockKeyRecord.countDocuments(fallbackFilter),
      ]);
      if (fbTotal > 0) { finalRecords = fbRecords; finalTotal = fbTotal; }
    }
    const records = finalRecords.map(r => ({ ...r, ownerId: r.ownerId || r.createdBy, createdBy: r.ownerId || r.createdBy }));
    res.json({ success: true, data: { assignedUser, records, pagination: { total: finalTotal, page: pageNum, limit: limitNum, pages: Math.ceil(finalTotal / limitNum) } } });
  } catch (err) { next(err); }
};
