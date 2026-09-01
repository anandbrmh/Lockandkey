import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
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
    const user = await User.create({ name: name?.trim(), email: normalizedEmail, passwordHash, role: role || "staff" });
    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
    res.json({ success: true, data: { user: req.user } });
  } catch (err) {
    next(err);
  }
};
