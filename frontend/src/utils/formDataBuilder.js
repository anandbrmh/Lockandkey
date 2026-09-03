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
 * Builds FormData from the wizard Redux state ready for multipart submission to API.
 * Backend derives person name/role/contact from handoverPersons[0] — no separate top-level fields.
 */
export const buildRecordFormData = (wizardState) => {
  const formData = new FormData();

  // Key count
  formData.append('keyCount', String(wizardState.keyCount ?? 1));

  // Reuse IDs to avoid re-upload to ImageKit
  if (wizardState.savedLocationId) formData.append('savedLocationId', wizardState.savedLocationId);

  // Handover persons array (JSON) — single source of truth
  if (Array.isArray(wizardState.handoverPersons) && wizardState.handoverPersons.length > 0) {
    const sanitizedPersons = wizardState.handoverPersons.map(p => {
      const base = {
        name: p.name || '',
        role: p.role || '',
        contactNumber: p.contact || '',   // normalize to contactNumber only
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
  }

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
  if (wizardState.placementPhoto && isDataUrl(wizardState.placementPhoto)) {
    const file = dataURLtoFile(wizardState.placementPhoto, 'placement.jpg');
    if (file) formData.append('placementPhoto', file);
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

  // Metadata JSON for debugging/audit (backend ignores unknown fields safely)
  formData.append('metadata', JSON.stringify(wizardState.metadata || {}));

  return formData;
};
