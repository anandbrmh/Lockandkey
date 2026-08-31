import { body, validationResult } from "express-validator";

export const validateCreateRecord = [
  body("keyCount")
    .notEmpty().withMessage("keyCount is required")
    .isInt({ min: 1 }).withMessage("keyCount must be an integer >= 1")
    .toInt(),
  body("handoverName").optional().trim().isLength({ min: 2 }).withMessage("handoverName must be at least 2 chars"),
  body("handoverRole").optional().trim(),
  body("handoverContact").optional().trim(),
  body("handoverPersonId").optional().isMongoId().withMessage("handoverPersonId must be valid id"),
  body("savedLocationId").optional().isMongoId().withMessage("savedLocationId must be valid id"),
  body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("lat must be between -90 and 90").toFloat(),
  body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("lng must be between -180 and 180").toFloat(),
  body("status").optional().isIn(["active", "returned", "lost"]).withMessage("status must be active, returned or lost"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];

export const validateUpdateRecord = [
  body("keyCount").optional().isInt({ min: 1 }).withMessage("keyCount must be >=1").toInt(),
  body("handoverName").optional().trim().isLength({ min: 2 }).withMessage("handoverName must be at least 2 chars"),
  body("handoverRole").optional().trim(),
  body("handoverContact").optional().trim(),
  body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("lat must be between -90 and 90").toFloat(),
  body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("lng must be between -180 and 180").toFloat(),
  body("status").optional().isIn(["active", "returned", "lost"]).withMessage("status must be active, returned or lost"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];

export const validateRegister = [
  body("name").notEmpty().withMessage("name is required").trim(),
  body("email").isEmail().withMessage("valid email required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("password must be at least 6 chars"),
  body("role").optional().isIn(["admin", "staff"]).withMessage("role must be admin or staff"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];

export const validateLogin = [
  body("email").isEmail().withMessage("valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];
