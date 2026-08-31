import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend root
const backendRoot = path.join(__dirname, "..", "..");

/**
 * Delete a file given its relative URL stored in DB (e.g., /uploads/locks/xxx.jpg)
 * Resolves to absolute path on disk and unlinks if exists.
 */
const deleteFile = async (relativeUrl) => {
  if (!relativeUrl) return;
  // relativeUrl is like /uploads/locks/filename.jpg
  // backendRoot + relativeUrl
  const absolutePath = path.join(backendRoot, relativeUrl);
  try {
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
      console.log(`Deleted file: ${absolutePath}`);
    }
  } catch (err) {
    console.error(`Failed to delete file ${absolutePath}: ${err.message}`);
  }
};

export const deleteFilesForRecord = async (record) => {
  const urls = [
    record.lockPhoto?.url,
    record.keyPhoto?.url,
    record.placementPhoto?.url,
    record.handoverPhoto?.url,
  ].filter(Boolean);
  await Promise.all(urls.map((u) => deleteFile(u)));
};

export default deleteFile;
