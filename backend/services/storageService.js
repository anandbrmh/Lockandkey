import imagekit from "../config/imagekitConfig.js";

/**
 * Upload a file buffer to ImageKit
 * @param {Buffer} fileBuffer - multer memoryStorage buffer
 * @param {string} fileName - filename with extension
 * @param {string} folder - ImageKit folder path e.g. /lock-key/locks
 * @returns {Promise<{url: string, fileId: string}>}
 *
 * Usage:
 *   const { url, fileId } = await uploadToImageKit(req.files.lockPhoto[0].buffer, "lock-123.jpg", "/lock-key/locks")
 *
 * Alternative: Frontend direct upload — GET /api/lock-key-records/auth/imagekit
 * returns imagekit.getAuthenticationParameters() so browser can upload directly to ImageKit.
 * That avoids proxying large bytes through backend. Default here is backend-proxied for simplicity.
 */
export const uploadToImageKit = async (fileBuffer, fileName, folder = "/lock-key") => {
  if (!fileBuffer || !fileName) throw new Error("fileBuffer and fileName are required for ImageKit upload");
  const result = await imagekit.upload({
    file: fileBuffer.toString("base64"),
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId };
};

/**
 * Delete a file from ImageKit by fileId
 * @param {string} fileId
 */
export const deleteFromImageKit = async (fileId) => {
  if (!fileId) return;
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    // Log but don't throw for missing files — cleanup should be best-effort
    console.error(`[ImageKit] deleteFile failed for ${fileId}: ${err.message}`);
  }
};

/**
 * Safely delete a fileId only if no other non-deleted record/person/location still references it
 */
export const safeDeleteFromImageKit = async (fileId, excludeRecordId = null) => {
  if (!fileId) return;
  try {
    const { default: LockKeyRecord } = await import("../models/LockKeyRecord.js");
    const { default: SavedPerson } = await import("../models/SavedPerson.js");
    const { default: SavedLocation } = await import("../models/SavedLocation.js");
    const fileIdQuery = { $or: [
      { "lockPhoto.fileId": fileId },
      { "keyPhoto.fileId": fileId },
      { "placementPhoto.fileId": fileId },
      { "handoverPhoto.fileId": fileId },
    ]};
    if (excludeRecordId) fileIdQuery._id = { $ne: excludeRecordId };
    const [recordRef, personRef, locationRef] = await Promise.all([
      LockKeyRecord.countDocuments({ ...fileIdQuery, isDeleted: false }),
      SavedPerson.countDocuments({ "photo.fileId": fileId }),
      SavedLocation.countDocuments({ "photo.fileId": fileId }),
    ]);
    if (recordRef > 0 || personRef > 0 || locationRef > 0) {
      console.log(`[ImageKit] safeDelete skipped for ${fileId}: still referenced (records:${recordRef} persons:${personRef} locs:${locationRef})`);
      return;
    }
    await deleteFromImageKit(fileId);
  } catch (err) {
    console.error(`[ImageKit] safeDelete failed for ${fileId}: ${err.message}`);
    await deleteFromImageKit(fileId);
  }
};

/**
 * Delete all 4 images for a record - uses safeDelete to avoid breaking reused/shared photos
 * @param {Object} record - LockKeyRecord document
 */
export const deleteFilesForRecord = async (record) => {
  const fileIds = [
    record.lockPhoto?.fileId,
    record.keyPhoto?.fileId,
    record.placementPhoto?.fileId,
    record.handoverPhoto?.fileId,
  ].filter(Boolean);
  await Promise.all(fileIds.map((id) => safeDeleteFromImageKit(id, record._id)));
};

/**
 * Get authentication parameters for client-side direct upload
 * Frontend can use these to upload directly to ImageKit without going through backend
 */
export const getImageKitAuthParams = () => {
  return imagekit.getAuthenticationParameters();
};

export default { uploadToImageKit, deleteFromImageKit, deleteFilesForRecord, getImageKitAuthParams };
