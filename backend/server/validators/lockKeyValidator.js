import { body, validationResult } from "express-validator";

export const validateCreateRecord = [
  body("keyCount").optional().isInt({ min: 1 }).withMessage("keyCount must be an integer >= 1").toInt(),
  body("handoverName").optional().trim().isLength({ min: 2 }).withMessage("handoverName must be at least 2 chars"),
  body("handoverRole").optional().trim(),
  body("handoverContact").optional().trim(),
  body("handoverPersonId").optional().isMongoId().withMessage("handoverPersonId must be valid id"),
  body("savedLocationId").optional().isMongoId().withMessage("savedLocationId must be valid id"),
  body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("lat must be between -90 and 90").toFloat(),
  body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("lng must be between -180 and 180").toFloat(),
  body("status").optional().isIn(["active", "inactive", "returned", "lost"]).withMessage("status must be active, inactive, returned or lost"),
  // handoverPersons JSON array validation — each entry may be partial for draft saves
  body("handoverPersons").optional().custom((value) => {
    try {
      const arr = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(arr)) throw new Error("handoverPersons must be an array");
      const allowed = ["active","inactive","returned","lost"];
      for (let i=0;i<arr.length;i++) {
        const p = arr[i];
        if (p.status && !allowed.includes(p.status)) throw new Error(`handoverPersons[${i}].status must be one of ${allowed.join(", ")}`);
        if (p.keysGiven !== undefined && (!Number.isInteger(Number(p.keysGiven)) || Number(p.keysGiven) < 1)) throw new Error(`handoverPersons[${i}].keysGiven must be integer >=1`);
        if (p.personId && typeof p.personId === 'string' && p.personId.length!==24) {
          // allow empty but if provided must be 24 hex-ish; defer to isMongoId elsewhere
        }
      }
      return true;
    } catch(e){
      throw new Error(e.message || "Invalid handoverPersons JSON");
    }
  }),
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
  body("status").optional().isIn(["active", "inactive", "returned", "lost"]).withMessage("status must be active, inactive, returned or lost"),
  body("handoverPersons").optional().custom((value) => {
    try {
      const arr = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(arr)) throw new Error("handoverPersons must be an array");
      const allowed = ["active","inactive","returned","lost"];
      for (let i=0;i<arr.length;i++) {
        const p = arr[i];
        if (p.status && !allowed.includes(p.status)) throw new Error(`handoverPersons[${i}].status must be one of ${allowed.join(", ")}`);
      }
      return true;
    } catch(e){
      throw new Error(e.message || "Invalid handoverPersons JSON");
    }
  }),
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
  body("email").trim().isEmail().withMessage("valid email required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("password must be at least 6 chars"),
  body("role").optional().isIn(["admin", "staff", "subadmin"]).withMessage("role must be admin, staff or subadmin"),
  body("adminCode").optional({ values: "null" }).custom((v) => {
    if (v === "" || v === null || v === undefined) return true;
    if (!/^\d{4}$/.test(String(v))) throw new Error("adminCode must be exactly 4 digits");
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];

export const validateLogin = [
  body("email").trim().isEmail().withMessage("valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((e) => e.msg) });
    }
    next();
  },
];
