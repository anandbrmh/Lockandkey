import Staff from "../models/staff.js";
import { uploadToImageKit } from "../services/storageService.js";

/**
 * GET /api/staff/me — get current staff profile (linked to req.user)
 */
export async function getStaffProfile(req, res, next) {
  try {
    const staff = await Staff.findOne({ user: req.user._id }).lean();
    if (!staff) {
      return res.json({ success: true, data: null, completed: false, message: "No staff profile yet" });
    }
    res.json({ success: true, data: staff, completed: !!staff.profileCompleted });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/check — lightweight check for redirect gate
 * Returns { completed: boolean, exists: boolean }
 */
export async function checkStaffProfile(req, res, next) {
  try {
    const staff = await Staff.findOne({ user: req.user._id }).select("profileCompleted").lean();
    res.json({ success: true, exists: !!staff, completed: !!staff?.profileCompleted });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/complete — create or update staff profile
 * Accepts multipart/form-data: name, email, phone, contactNumber, department, designation, roleTitle, address + image (file field: image or photo)
 * Also supports JSON body without image.
 * Sets profileCompleted=true when required fields present.
 */
export async function fillStaffData(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      name,
      email,
      phone,
      contactNumber,
      department,
      designation,
      roleTitle,
      address,
    } = req.body;

    // Resolve file: field can be "image", "photo", "imageUrl"
    const file = req.file || req.files?.image?.[0] || req.files?.photo?.[0] || null;

    let photo = undefined;
    let imageUrl;
    let imageFileId;

    if (file) {
      const ext = file.originalname?.split(".").pop() || "jpg";
      const fileName = `staff-${userId}-${Date.now()}.${ext}`;
      const uploaded = await uploadToImageKit(file.buffer, fileName, "/staff/photos");
      imageUrl = uploaded.url;
      imageFileId = uploaded.fileId;
      photo = { url: uploaded.url, fileId: uploaded.fileId, uploadedAt: new Date() };
    }

    // Find existing or create
    let staff = await Staff.findOne({ user: userId });

    const resolvedName = name?.trim() || staff?.name || req.user.name;
    const resolvedEmail = (email?.trim().toLowerCase()) || staff?.email || req.user.email;

    if (!resolvedName || !resolvedEmail) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const update = {
      user: userId,
      name: resolvedName,
      email: resolvedEmail,
      phone: phone !== undefined ? String(phone).trim() : staff?.phone,
      contactNumber: contactNumber !== undefined ? String(contactNumber).trim() : staff?.contactNumber,
      department: department !== undefined ? String(department).trim() : staff?.department,
      designation: designation !== undefined ? String(designation).trim() : staff?.designation,
      roleTitle: roleTitle !== undefined ? String(roleTitle).trim() : staff?.roleTitle,
      address: address !== undefined ? String(address).trim() : staff?.address,
    };

    if (photo) {
      update.photo = photo;
      update.imageUrl = imageUrl;
      update.imageFileId = imageFileId;
    }

    // Completion rule: name + email + (photo or phone/department) — require at least name/email + one identifier
    const hasPhoto = !!(photo || staff?.photo?.url || staff?.imageUrl);
    const hasContact = !!(update.phone || update.contactNumber);
    // Mark completed if basic fields present; you can tighten this as needed
    const canComplete = !!(resolvedName && resolvedEmail && (hasPhoto || hasContact || update.department || update.designation));

    if (canComplete) {
      update.profileCompleted = true;
      update.completedAt = new Date();
    }

    if (staff) {
      Object.assign(staff, update);
      await staff.save();
    } else {
      staff = await Staff.create(update);
    }

    res.status(staff.profileCompleted ? 200 : 201).json({
      success: true,
      message: staff.profileCompleted ? "Staff profile completed" : "Staff profile saved (incomplete)",
      data: staff,
      completed: !!staff.profileCompleted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/staff/me — update partial fields (same handler as complete but without completion enforcement)
 */
export async function updateStaffProfile(req, res, next) {
  return fillStaffData(req, res, next);
}
