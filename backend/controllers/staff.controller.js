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

    // Resolve file: field can be "image" or "photo"
    const file = req.file || req.files?.image?.[0] || req.files?.photo?.[0] || null;

    let photo = undefined;

    if (file) {
      const ext = file.originalname?.split(".").pop() || "jpg";
      const fileName = `staff-${userId}-${Date.now()}.${ext}`;
      const uploaded = await uploadToImageKit(file.buffer, fileName, "/staff/photos");
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
    }

    // Completion rule: name + email + (photo or phone/department) — require at least name/email + one identifier
    const hasPhoto = !!(photo || staff?.photo?.url);
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

/**
 * POST /api/staff/verify-admin-code — staff submits 4-digit admin code to get listed on admin dashboard
 */
export async function verifyAdminCode(req, res, next) {
  try {
    const { adminCode } = req.body;
    const codeStr = String(adminCode || "").trim();
    if (!/^\d{4}$/.test(codeStr)) return res.status(400).json({ success: false, message: "adminCode must be exactly 4 digits" });
    const { default: User } = await import("../models/User.js");
    const adminUser = await User.findOne({ role: "admin", adminCode: codeStr });
    if (!adminUser) return res.status(400).json({ success: false, message: "Invalid admin code" });
    let staff = await Staff.findOne({ user: req.user._id });
    if (!staff) {
      // create minimal staff profile for verification
      staff = await Staff.create({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        adminCodeVerified: true,
        verifiedAdminCode: codeStr,
        linkedAdmin: adminUser._id,
        profileCompleted: false,
      });
    } else {
      staff.adminCodeVerified = true;
      staff.verifiedAdminCode = codeStr;
      staff.linkedAdmin = adminUser._id;
      await staff.save();
    }
    res.json({ success: true, message: "Admin code verified — you will now appear on admin dashboard", data: staff });
  } catch (err) { next(err); }
}

/**
 * GET /api/staff/verified — admin: list staff who submitted correct code
 */
export async function listVerifiedStaff(req, res, next) {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Only admin can view verified staff" });
    // If admin has a code, show only staff linked to him; otherwise show all verified
    const filter = { adminCodeVerified: true };
    // Filter by linkedAdmin if admin has a code set — otherwise show all verified
    if (req.user.adminCode) {
      // prefer linkedAdmin match, but also include if verified code equals admin's code (fallback for older records)
      filter.$or = [{ linkedAdmin: req.user._id }, { verifiedAdminCode: req.user.adminCode }];
    }
    const list = await Staff.find(filter).populate("user", "name email role adminCode").populate("linkedAdmin", "name email").sort("-updatedAt").lean();
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/staff/:id/promote — admin makes staff a subadmin
 * body: { role: "subadmin" | "staff" }
 */
export async function promoteStaff(req, res, next) {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Only admin can promote staff" });
    const { id } = req.params;
    const { role } = req.body;
    const targetRole = role === "subadmin" ? "subadmin" : role === "staff" ? "staff" : null;
    if (!targetRole) return res.status(400).json({ success: false, message: "role must be 'subadmin' or 'staff'" });
    const staff = await Staff.findById(id).populate("user");
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
    const { default: User } = await import("../models/User.js");
    const user = await User.findById(staff.user._id || staff.user);
    if (!user) return res.status(404).json({ success: false, message: "Linked user not found" });
    if (user.role === "admin") return res.status(400).json({ success: false, message: "Cannot change admin role" });
    user.role = targetRole;
    await user.save();
    res.json({ success: true, message: `Staff ${targetRole === "subadmin" ? "promoted to subadmin" : "demoted to staff"}`, data: { staffId: staff._id, userId: user._id, role: user.role } });
  } catch (err) { next(err); }
}
