import LockKeyRecord from "../models/LockKeyRecord.js";
import User from "../models/User.js";
import { upsertSavedLocation } from "./directoryController.js";
import triggerEvent from "../../services/dispatcher.js";

/**
 * Resolve owner for webhook-created records.
 * Priority: body.ownerEmail > body.ownerId > header x-webhook-owner > SEED_ADMIN_EMAIL > first admin > first user
 */
async function resolveWebhookOwner(req) {
  const { ownerEmail, ownerId } = req.body || {};
  const headerOwner = req.headers["x-webhook-owner"] || req.headers["x-owner-email"];

  if (ownerId) {
    try {
      const u = await User.findById(ownerId).select("_id role email");
      if (u) return u;
    } catch {}
  }
  const emailToFind = ownerEmail || headerOwner;
  if (emailToFind) {
    const u = await User.findOne({ email: String(emailToFind).toLowerCase().trim() }).select("_id role email");
    if (u) return u;
  }
  // Fallback to seed admin env or first admin
  const seedEmail = process.env.SEED_ADMIN_EMAIL;
  if (seedEmail) {
    const seedUser = await User.findOne({ email: seedEmail.toLowerCase().trim() }).select("_id role email");
    if (seedUser) return seedUser;
  }
  const admin = await User.findOne({ role: "admin" }).select("_id role email");
  if (admin) return admin;
  const anyUser = await User.findOne({}).select("_id role email");
  return anyUser;
}

/**
 * POST /api/incoming-webhooks/record  (also /records)
 * Webhook-authenticated record creation. Uses WEBHOOK_SECRET from .env, not JWT.
 * Body: JSON {
 *   keyCount?: number,
 *   status?: "active"|"inactive"|"returned"|"lost",
 *   location?: { lat, lng } | { lat, lng } at top-level
 *   lat?, lng?,
 *   lockPhoto?: { url, fileId? },
 *   keyPhoto?: { url, fileId? },
 *   placementPhoto?: { url, fileId? },
 *   handoverPersons?: [{ name, role, contactNumber, status, keysGiven, photo?: {url}}],
 *   handoverName?, handoverRole?, handoverContact? (legacy single-person)
 *   ownerEmail?, ownerId? (optional owner mapping)
 * }
 */
export const createRecordViaWebhook = async (req, res, next) => {
  try {
    const owner = await resolveWebhookOwner(req);
    if (!owner) {
      return res.status(500).json({ success: false, message: "No owner user found to attribute webhook record. Create at least one user (admin) first." });
    }

    const body = req.body || {};
    // Normalize fields (support both nested location and top-level lat/lng)
    let { keyCount, status, lockPhoto, keyPhoto, placementPhoto, handoverPersons, handoverName, handoverRole, handoverContact, lat, lng, location } = body;

    if (location && typeof location === "object") {
      if (location.lat !== undefined) lat = location.lat;
      if (location.lng !== undefined) lng = location.lng;
    }

    // Validate status
    const allowedStatus = ["active", "inactive", "returned", "lost"];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${allowedStatus.join(", ")}` });
    }

    // Validate keyCount
    let finalKeyCount = keyCount !== undefined && keyCount !== "" ? Number(keyCount) : 1;
    if (isNaN(finalKeyCount) || finalKeyCount < 1) finalKeyCount = 1;

    // Normalize lat/lng
    let finalLat = lat !== undefined && lat !== "" ? Number(lat) : undefined;
    let finalLng = lng !== undefined && lng !== "" ? Number(lng) : undefined;
    if (finalLat !== undefined && (isNaN(finalLat) || finalLat < -90 || finalLat > 90)) {
      return res.status(400).json({ success: false, message: "lat must be between -90 and 90" });
    }
    if (finalLng !== undefined && (isNaN(finalLng) || finalLng < -180 || finalLng > 180)) {
      return res.status(400).json({ success: false, message: "lng must be between -180 and 180" });
    }

    // Normalize photo fields: accept {url} or string url
    const normalizePhoto = (p) => {
      if (!p) return undefined;
      if (typeof p === "string") return { url: p, uploadedAt: new Date() };
      if (typeof p === "object" && p.url) return { url: String(p.url), fileId: p.fileId ? String(p.fileId) : undefined, uploadedAt: p.uploadedAt ? new Date(p.uploadedAt) : new Date() };
      return undefined;
    };

    const finalLockPhoto = normalizePhoto(lockPhoto);
    const finalKeyPhoto = normalizePhoto(keyPhoto);
    const finalPlacementPhoto = normalizePhoto(placementPhoto);

    // Normalize handoverPersons
    let finalHandoverPersons = [];
    const allowedPersonStatus = ["active", "inactive", "returned", "lost"];

    if (Array.isArray(handoverPersons) && handoverPersons.length > 0) {
      for (const p of handoverPersons) {
        if (!p) continue;
        const name = p.name ? String(p.name).trim() : "";
        const role = p.role ? String(p.role).trim() : "";
        const contactNumber = p.contactNumber || p.contact ? String(p.contactNumber || p.contact).trim() : undefined;
        const statusVal = allowedPersonStatus.includes(p.status) ? p.status : "active";
        let keysGiven = p.keysGiven !== undefined && p.keysGiven !== "" ? parseInt(p.keysGiven, 10) : 1;
        if (isNaN(keysGiven) || keysGiven < 1) keysGiven = 1;
        const photo = normalizePhoto(p.photo);
        if (name || p.personId || photo) {
          const entry = {
            name,
            role,
            contactNumber: contactNumber || undefined,
            personId: p.personId || undefined,
            status: statusVal,
            keysGiven,
          };
          if (photo) entry.photo = photo;
          finalHandoverPersons.push(entry);
        }
      }
    } else if (handoverName) {
      const photo = normalizePhoto(body.handoverPhoto || body.photo);
      finalHandoverPersons = [
        {
          name: String(handoverName).trim(),
          role: handoverRole ? String(handoverRole).trim() : "",
          contactNumber: handoverContact ? String(handoverContact).trim() : undefined,
          status: allowedPersonStatus.includes(body.handoverStatus) ? body.handoverStatus : "active",
          keysGiven: body.keysGiven !== undefined ? parseInt(body.keysGiven, 10) || 1 : 1,
          ...(photo ? { photo } : {}),
        },
      ];
    }

    // Create record
    const doc = await LockKeyRecord.create({
      lockPhoto: finalLockPhoto,
      keyPhoto: finalKeyPhoto,
      placementPhoto: finalPlacementPhoto,
      keyCount: finalKeyCount,
      handoverPersons: finalHandoverPersons,
      location: finalLat != null || finalLng != null ? { lat: finalLat, lng: finalLng } : undefined,
      status: status || "active",
      ownerId: owner._id,
    });



    try {
      if (finalPlacementPhoto) {
        await upsertSavedLocation({
          label: undefined,
          lat: finalLat,
          lng: finalLng,
          description: undefined,
          photo: finalPlacementPhoto,
          createdBy: owner._id,
        });
      }
    } catch (e) {
      console.warn("[createRecordViaWebhook] upsertSavedLocation failed:", e.message);
    }

    // Outbound webhook — fire and forget, enrich payload
    triggerEvent("record.created", {
      recordId: doc._id,
      ownerId: owner._id,
      ownerEmail: owner.email,
      source: "webhook",
      webhookSource: req.params.source || "incoming-webhook",
      status: doc.status,
      keyCount: doc.keyCount,
      handoverPersons: doc.handoverPersons,
      location: doc.location,
      lockPhoto: doc.lockPhoto,
      keyPhoto: doc.keyPhoto,
      placementPhoto: doc.placementPhoto,
      createdAt: doc.createdAt,
    }).catch((e) => console.warn("[Webhook] dispatch failed:", e.message));

    return res.status(201).json({
      success: true,
      message: "Record created via webhook",
      source: req.params.source || "webhook",
      owner: { _id: owner._id, email: owner.email, role: owner.role },
      data: doc,
    });
  } catch (err) {
    next(err);
  }
};

export default { createRecordViaWebhook };
