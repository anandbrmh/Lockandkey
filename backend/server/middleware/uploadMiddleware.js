import multer from "multer";

const allowedMimes = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image/jpeg, image/png, image/webp are allowed"), false);
};

// Memory storage — no local disk writes, buffers go straight to ImageKit
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
});

export const uploadFields = upload.fields([
  { name: "lockPhoto", maxCount: 1 },
  { name: "keyPhoto", maxCount: 1 },
  { name: "placementPhoto", maxCount: 1 },
  { name: "personPhoto_0", maxCount: 1 },
  { name: "personPhoto_1", maxCount: 1 },
  { name: "personPhoto_2", maxCount: 1 },
  { name: "personPhoto_3", maxCount: 1 },
  { name: "personPhoto_4", maxCount: 1 },
  { name: "personPhoto_5", maxCount: 1 },
  { name: "personPhoto_6", maxCount: 1 },
  { name: "personPhoto_7", maxCount: 1 },
  { name: "personPhoto_8", maxCount: 1 },
  { name: "personPhoto_9", maxCount: 1 },
  // also support alternative naming with bracket style
  { name: "handoverPersons[0][photo]", maxCount: 1 },
  { name: "handoverPersons[1][photo]", maxCount: 1 },
]);

// Single-field uploaders for dedicated photo-change endpoints (person / placement)
export const uploadPersonPhoto = upload.single("personPhoto");
export const uploadPlacementPhoto = upload.single("placementPhoto");

export default upload;
