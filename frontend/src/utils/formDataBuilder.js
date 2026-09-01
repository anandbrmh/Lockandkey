/**
 * Helper to convert Base64 dataURL to a binary File object
 */
export const dataURLtoFile = (dataurl, filename) => {
  if (!dataurl) return null;
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Builds FormData from the wizard Redux state ready for multipart submission to API
 * Backend expects: keyCount, handoverName, handoverRole, handoverContact, lat, lng,
 * plus 4 image fields: lockPhoto, keyPhoto, placementPhoto, handoverPhoto (multipart)
 */
export const buildRecordFormData = (wizardState) => {
  const formData = new FormData();

  // Required text fields (backend validates keyCount >=1, handoverName required or handoverPersonId)
  formData.append('keyCount', String(wizardState.keyCount ?? 1));
  // Reuse IDs to avoid re-upload to ImageKit
  if (wizardState.handoverPersonId) formData.append('handoverPersonId', wizardState.handoverPersonId);
  if (wizardState.savedLocationId) formData.append('savedLocationId', wizardState.savedLocationId);
  // Legacy single-person fields (for backward compat)
  if (wizardState.handoverName) formData.append('handoverName', wizardState.handoverName);
  if (wizardState.handoverRole) formData.append('handoverRole', wizardState.handoverRole);
  if (wizardState.handoverContact) formData.append('handoverContact', wizardState.handoverContact);
  // New: multiple handover persons array (JSON) — each with per-person status enum
  if (Array.isArray(wizardState.handoverPersons) && wizardState.handoverPersons.length > 0) {
    // Sanitize persons for JSON — omit raw base64 photo (sent as files), keep reused URLs and status
    const sanitizedPersons = wizardState.handoverPersons.map(p => {
      const base = {
        name: p.name || '',
        role: p.role || '',
        contact: p.contact || '',
        contactNumber: p.contact || '',
        personId: p.personId || null,
        status: p.status || 'active',
        keysGiven: parseInt(p.keysGiven, 10) >= 1 ? parseInt(p.keysGiven, 10) : 1,
      };
      // If photo is reused http URL, include it so backend can keep reference without re-upload
      if (p.photo && typeof p.photo === 'string' && p.photo.startsWith('http')) {
        base.photo = { url: p.photo };
      } else if (p.photo && typeof p.photo === 'object' && p.photo.url) {
        base.photo = p.photo;
      }
      return base;
    });
    formData.append('handoverPersons', JSON.stringify(sanitizedPersons));
    const personIds = wizardState.handoverPersons.map(p => p.personId).filter(Boolean);
    if (personIds.length) formData.append('handoverPersonIds', JSON.stringify(personIds));
  }

  // Geolocation removed per UI requirement — no lat/lng sent
  // (kept for backward compat but disabled)
  // const coords = wizardState.metadata?.placementPhoto?.geolocation || ...
  // if (coords) { formData.append('lat', ...); formData.append('lng', ...); }

  // Convert photos from base64 data URLs to file uploads — skip if reused (URL not data:)
  const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
  if (wizardState.lockPhoto && isDataUrl(wizardState.lockPhoto)) {
    const file = dataURLtoFile(wizardState.lockPhoto, 'lock.jpg');
    if (file) formData.append('lockPhoto', file);
  }
  if (wizardState.keyPhoto && isDataUrl(wizardState.keyPhoto)) {
    const file = dataURLtoFile(wizardState.keyPhoto, 'key.jpg');
    if (file) formData.append('keyPhoto', file);
  }
  // placementPhoto: skip file upload if reused via savedLocationId
  if (wizardState.placementPhoto && isDataUrl(wizardState.placementPhoto) && !wizardState.savedLocationId) {
    const file = dataURLtoFile(wizardState.placementPhoto, 'placement.jpg');
    if (file) formData.append('placementPhoto', file);
  } else if (wizardState.placementPhoto && isDataUrl(wizardState.placementPhoto) && wizardState.savedLocationId) {
    // if user uploaded new after selecting saved, ignore savedLocationId? Already cleared in slice, so this branch is fallback
    const file = dataURLtoFile(wizardState.placementPhoto, 'placement.jpg');
    if (file) formData.append('placementPhoto', file);
  }
  // handoverPhoto legacy group photo: skip if reused (now secondary to per-person photos)
  if (wizardState.handoverPhoto && isDataUrl(wizardState.handoverPhoto) && !wizardState.handoverPhotoIsReused) {
    const file = dataURLtoFile(wizardState.handoverPhoto, 'handover.jpg');
    if (file) formData.append('handoverPhoto', file);
  } else if (wizardState.handoverPhoto && isDataUrl(wizardState.handoverPhoto) && wizardState.handoverPhotoIsReused) {
    const file = dataURLtoFile(wizardState.handoverPhoto, 'handover.jpg');
    if (file) formData.append('handoverPhoto', file);
  }

  // Per-person photos: each as personPhoto_<idx> if data URL (new capture)
  if (Array.isArray(wizardState.handoverPersons)) {
    wizardState.handoverPersons.forEach((p, idx) => {
      if (p.photo && isDataUrl(p.photo) && !p.photoIsReused) {
        const file = dataURLtoFile(p.photo, `person-${idx}.jpg`);
        if (file) formData.append(`personPhoto_${idx}`, file);
      }
    });
  }

  // Also pack metadata JSON for debugging/audit (backend ignores unknown fields safely)
  formData.append('metadata', JSON.stringify(wizardState.metadata || {}));

  return formData;
};
