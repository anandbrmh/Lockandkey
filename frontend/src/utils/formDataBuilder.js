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
 * Handover persons are filtered so only valid/filled entries are submitted.
 */
export const buildRecordFormData = (wizardState) => {
  const formData = new FormData();

  // Key count
  formData.append('keyCount', String(wizardState.keyCount ?? 1));

  // Reuse IDs to avoid re-upload to ImageKit
  if (wizardState.savedLocationId) formData.append('savedLocationId', wizardState.savedLocationId);

  // Handover persons array (JSON) — filter out blank/empty placeholder slots
  if (Array.isArray(wizardState.handoverPersons) && wizardState.handoverPersons.length > 0) {
    const validPersons = wizardState.handoverPersons
      .filter((p) => (p.name && p.name.trim()) || p.personId || (p.photo && (typeof p.photo === 'string' ? p.photo.trim() : p.photo.url)))
      .map((p, idx) => {
        const base = {
          name: (p.name || '').trim(),
          role: (p.role || '').trim(),
          contactNumber: (p.contact || p.contactNumber || '').trim(),
          personId: p.personId || null,
          status: p.status || 'active',
          keysGiven: parseInt(p.keysGiven, 10) >= 1 ? parseInt(p.keysGiven, 10) : 1,
          _origIdx: idx,
        };
        // If photo is reused http URL, include it so backend keeps reference
        if (p.photo && typeof p.photo === 'string' && p.photo.startsWith('http')) {
          base.photo = { url: p.photo };
        } else if (p.photo && typeof p.photo === 'object' && p.photo.url) {
          base.photo = p.photo;
        }
        return base;
      });

    // Append only non-empty persons (strip temp _origIdx)
    const sanitizedToSubmit = validPersons.map(({ _origIdx, ...rest }) => rest);
    if (sanitizedToSubmit.length > 0) {
      formData.append('handoverPersons', JSON.stringify(sanitizedToSubmit));
    }

    // Convert per-person photos for valid persons
    const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
    validPersons.forEach((vp, submitIdx) => {
      const origPerson = wizardState.handoverPersons[vp._origIdx];
      if (origPerson?.photo && isDataUrl(origPerson.photo) && !origPerson.photoIsReused) {
        const file = dataURLtoFile(origPerson.photo, `person-${submitIdx}.jpg`);
        if (file) formData.append(`personPhoto_${submitIdx}`, file);
      }
    });
  }

  // Convert lock/key/placement photos from base64 data URLs to file uploads
  const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
  if (wizardState.lockPhoto && isDataUrl(wizardState.lockPhoto)) {
    const file = dataURLtoFile(wizardState.lockPhoto, 'lock.jpg');
    if (file) formData.append('lockPhoto', file);
  }
  if (wizardState.keyPhoto && isDataUrl(wizardState.keyPhoto)) {
    const file = dataURLtoFile(wizardState.keyPhoto, 'key.jpg');
    if (file) formData.append('keyPhoto', file);
  }
  if (wizardState.placementPhoto && isDataUrl(wizardState.placementPhoto)) {
    const file = dataURLtoFile(wizardState.placementPhoto, 'placement.jpg');
    if (file) formData.append('placementPhoto', file);
  }

  // Metadata JSON for debugging/audit
  formData.append('metadata', JSON.stringify(wizardState.metadata || {}));

  return formData;
};
