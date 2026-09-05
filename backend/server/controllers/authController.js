import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, adminCode } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const normalizedRole = role || "staff";
    let normalizedAdminCode = null;
    if (adminCode !== undefined && adminCode !== null && String(adminCode).trim() !== "") {
      const codeStr = String(adminCode).trim();
      if (!/^\d{4}$/.test(codeStr)) return res.status(400).json({ success: false, message: "adminCode must be exactly 4 digits" });
      if (normalizedRole !== "admin") return res.status(400).json({ success: false, message: "adminCode can only be set for admin role at registration" });
      normalizedAdminCode = codeStr;
    }
    const user = await User.create({ name: name?.trim(), email: normalizedEmail, passwordHash, role: normalizedRole, adminCode: normalizedAdminCode });
    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role, adminCode: user.adminCode || null },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = generateToken(user._id, user.role);
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const fresh = await User.findById(req.user._id).select("-passwordHash");
    res.json({ success: true, data: { user: fresh || req.user } });
  } catch (err) {
    next(err);
  }
};

export const getAdminSettings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Only admin can access settings" });
    const admin = await User.findById(req.user._id).select("-passwordHash");
    res.json({ success: true, data: admin });
  } catch (err) { next(err); }
};

export const updateAdminSettings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Only admin can update settings" });
    const { name, email, adminCode } = req.body;
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    if (name !== undefined) admin.name = String(name).trim();
    if (email !== undefined) {
      const em = String(email).trim().toLowerCase();
      if (!em) return res.status(400).json({ success: false, message: "Email is required" });
      if (em !== admin.email) {
        const exists = await User.findOne({ email: em });
        if (exists) return res.status(409).json({ success: false, message: "Email already taken" });
      }
      admin.email = em;
    }
    if (adminCode !== undefined) {
      const codeStr = String(adminCode).trim();
      if (codeStr === "" || codeStr === "null") {
        admin.adminCode = null;
      } else {
        if (!/^\d{4}$/.test(codeStr)) return res.status(400).json({ success: false, message: "adminCode must be exactly 4 digits" });
        admin.adminCode = codeStr;
      }
    }
    await admin.save();
    const updated = await User.findById(admin._id).select("-passwordHash");
    res.json({ success: true, message: "Admin settings updated", data: updated });
  } catch (err) { next(err); }
};
