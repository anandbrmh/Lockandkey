import { createSlice } from '@reduxjs/toolkit';

const createEmptyPerson = () => ({ name: '', role: '', contact: '', personId: null, photo: null, status: 'active', photoIsReused: false, keysGiven: 1 });

const sumKeys = (persons) => (persons || []).reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);

// Rebalance persons array so sum(keysGiven) === totalKeys
// trims/adds trailing persons with keysGiven=1, and clamps last if needed
const rebalanceForTotal = (persons, total) => {
  let sum = sumKeys(persons);
  if (sum === total) return persons;
  if (sum < total) {
    const newPersons = [...persons];
    while (sum < total) {
      newPersons.push(createEmptyPerson());
      sum += 1;
    }
    return newPersons;
  }
  // sum > total -> trim from end
  let newPersons = [...persons];
  let currentSum = sum;
  while (currentSum > total && newPersons.length > 1) {
    const last = newPersons[newPersons.length - 1];
    const lastKeys = parseInt(last.keysGiven, 10) || 1;
    if (currentSum - lastKeys >= total) {
      currentSum -= lastKeys;
      newPersons.pop();
    } else {
      const excess = currentSum - total;
      const newLastKeys = lastKeys - excess;
      newPersons[newPersons.length - 1] = { ...last, keysGiven: Math.max(1, newLastKeys) };
      currentSum = total;
      break;
    }
  }
  if (newPersons.length === 1 && currentSum > total) {
    newPersons[0] = { ...newPersons[0], keysGiven: total };
  }
  return newPersons;
};

const rebalanceAfterEdit = (state, editedIdx) => {
  const total = parseInt(state.keyCount, 10) || 1;
  // clamp edited value to not exceed remaining capacity
  let prefixBefore = 0;
  for (let i = 0; i < editedIdx; i++) prefixBefore += parseInt(state.handoverPersons[i]?.keysGiven, 10) || 1;
  let edited = state.handoverPersons[editedIdx];
  if (!edited) return;
  let maxForEdited = total - prefixBefore;
  if (maxForEdited < 1) maxForEdited = 1;
  let curKeys = parseInt(edited.keysGiven, 10) || 1;
  if (curKeys < 1) curKeys = 1;
  if (curKeys > maxForEdited) {
    curKeys = maxForEdited;
    edited.keysGiven = curKeys;
  }
  const prefixIncluding = prefixBefore + curKeys;
  let remaining = total - prefixIncluding;
  if (remaining < 0) remaining = 0;
  // trailing persons after editedIdx
  let trailing = state.handoverPersons.slice(editedIdx + 1);
  let trailingSum = sumKeys(trailing);
  if (trailingSum === remaining) return;
  if (trailingSum < remaining) {
    // add needed persons
    const toAdd = remaining - trailingSum;
    for (let i = 0; i < toAdd; i++) {
      state.handoverPersons.push(createEmptyPerson());
    }
  } else {
    // trailingSum > remaining -> trim trailing end until fits, adjusting last if needed
    while (trailing.length > 0 && trailingSum > remaining) {
      const last = trailing[trailing.length - 1];
      const lastKeys = parseInt(last.keysGiven, 10) || 1;
      if (trailingSum - lastKeys >= remaining) {
        trailingSum -= lastKeys;
        trailing.pop();
        state.handoverPersons.pop();
      } else {
        const excess = trailingSum - remaining;
        const newLastKeys = lastKeys - excess;
        const stateLastIdx = state.handoverPersons.length - 1;
        state.handoverPersons[stateLastIdx] = { ...state.handoverPersons[stateLastIdx], keysGiven: Math.max(1, newLastKeys) };
        trailingSum = remaining;
        break;
      }
    }
  }
  if (remaining === 0) {
    // keep only up to editedIdx
    state.handoverPersons = state.handoverPersons.slice(0, editedIdx + 1);
  }
};

const initialState = {
  currentStep: 0, // 0 = Lock, 1 = Key, 2 = Placement, 3 = Handover, 4 = Review
  lockPhoto: null, // Base64 data URL or reused ImageKit URL
  keyPhoto: null,  // Base64 data URL
  keyCount: 1,
  placementPhoto: null, // Base64 data URL or reused URL
  handoverPhoto: null,  // Base64 data URL or reused URL (legacy group photo, now optional)
  handoverName: '', // legacy single-person fields (kept for backward compat, synced with handoverPersons[0])
  handoverRole: '',
  handoverContact: '',
  // New: array of handover persons sized to keyCount — each with individual photo & status
  handoverPersons: [createEmptyPerson()],
  // Reuse IDs to avoid re-upload to ImageKit
  handoverPersonId: null,
  savedLocationId: null,
  // Flags to track if photo is reused (ImageKit URL) vs newly captured (base64)
  handoverPhotoIsReused: false,
  placementPhotoIsReused: false,
  metadata: {
    lockPhoto: null, // { timestamp, geolocation }
    keyPhoto: null,
    placementPhoto: null,
    handoverPhoto: null
  },
  // Editing existing record — null = create mode, otherwise record id being edited
  editingRecordId: null,
};

export const wizardSlice = createSlice({
  name: 'wizard',
  initialState,
  reducers: {
    setPhoto: (state, action) => {
      const { key, photoData, timestamp, geolocation } = action.payload;
      state[key] = photoData;
      state.metadata[key] = {
        timestamp: timestamp || new Date().toISOString(),
        geolocation: geolocation || null
      };
      // Clear reuse flags when user uploads new photo (base64 starts with data:)
      if (key === 'handoverPhoto' && photoData?.startsWith('data:')) {
        state.handoverPersonId = null;
        state.handoverPhotoIsReused = false;
      }
      if (key === 'placementPhoto' && photoData?.startsWith('data:')) {
        state.savedLocationId = null;
        state.placementPhotoIsReused = false;
      }
    },
    removePhoto: (state, action) => {
      const { key } = action.payload;
      state[key] = null;
      state.metadata[key] = null;
      if (key === 'handoverPhoto') {
        state.handoverPersonId = null;
        state.handoverPhotoIsReused = false;
      }
      if (key === 'placementPhoto') {
        state.savedLocationId = null;
        state.placementPhotoIsReused = false;
      }
    },
    selectSavedPerson: (state, action) => {
      // payload may be { person, index } or just person (defaults to 0)
      const payload = action.payload;
      const person = payload?.person || payload;
      const idx = payload?.index ?? 0;
      if (!state.handoverPersons[idx]) state.handoverPersons[idx] = createEmptyPerson();
      state.handoverPersons[idx].personId = person._id;
      state.handoverPersons[idx].name = person.name || '';
      state.handoverPersons[idx].role = person.role || '';
      state.handoverPersons[idx].contact = person.contactNumber || '';
      if (person.photo?.url) {
        state.handoverPersons[idx].photo = person.photo.url;
        state.handoverPersons[idx].photoIsReused = true;
      }
      if (idx === 0) {
        state.handoverPersonId = person._id;
        state.handoverName = person.name || '';
        state.handoverRole = person.role || '';
        state.handoverContact = person.contactNumber || '';
        // also keep legacy global handoverPhoto for backward compat, but prefer per-person
        if (person.photo?.url && !state.handoverPhoto) {
          state.handoverPhoto = person.photo.url;
          state.handoverPhotoIsReused = true;
          state.metadata.handoverPhoto = { timestamp: person.photo.uploadedAt || new Date().toISOString(), geolocation: null, reused: true };
        }
      }
    },
    clearSavedPerson: (state, action) => {
      const idx = action.payload?.index ?? 0;
      if (state.handoverPersons[idx]) {
        state.handoverPersons[idx].personId = null;
        // keep photo unless user explicitly removes — don't clear photo automatically
      }
      if (idx === 0) {
        state.handoverPersonId = null;
        // only clear global reused flag if no per-person photos are reused
        if (state.handoverPersons.every(p => !p.personId)) {
          state.handoverPhotoIsReused = false;
        }
      }
    },
    setPersonPhoto: (state, action) => {
      const { index, photoData, timestamp } = action.payload;
      if (!state.handoverPersons[index]) state.handoverPersons[index] = createEmptyPerson();
      state.handoverPersons[index].photo = photoData;
      state.handoverPersons[index].photoIsReused = photoData?.startsWith('http') || false;
      // clear personId when new capture overwrites reused
      if (photoData?.startsWith('data:')) {
        state.handoverPersons[index].personId = null;
        if (index === 0) state.handoverPersonId = null;
      }
      if (timestamp) {
        // store in metadata-like field for person
        if (!state.metadata) state.metadata = {};
        // optional per-person metadata tracking
      }
    },
    removePersonPhoto: (state, action) => {
      const { index } = action.payload;
      if (state.handoverPersons[index]) {
        state.handoverPersons[index].photo = null;
        state.handoverPersons[index].photoIsReused = false;
        // if this was the reused person, clear personId? keep but photo cleared
      }
    },
    setPersonStatus: (state, action) => {
      const { index, status } = action.payload;
      const allowed = ["active","inactive","returned","lost"];
      if (!allowed.includes(status)) return;
      if (!state.handoverPersons[index]) state.handoverPersons[index] = createEmptyPerson();
      state.handoverPersons[index].status = status;
    },
    selectSavedLocation: (state, action) => {
      const loc = action.payload; // { _id, photo, lat, lng }
      state.savedLocationId = loc._id;
      if (loc.photo?.url) {
        state.placementPhoto = loc.photo.url;
        state.placementPhotoIsReused = true;
        state.metadata.placementPhoto = { timestamp: loc.photo.uploadedAt || new Date().toISOString(), geolocation: loc.lat != null ? { latitude: loc.lat, longitude: loc.lng } : null, reused: true };
      } else if (loc.lat != null) {
        // reuse coords without photo
        state.metadata.placementPhoto = { timestamp: new Date().toISOString(), geolocation: { latitude: loc.lat, longitude: loc.lng }, reused: true };
      }
    },
    clearSavedLocation: (state) => {
      state.savedLocationId = null;
      state.placementPhotoIsReused = false;
    },
    setKeyCount: (state, action) => {
      const val = action.payload;
      let newCount;
      if (val === '') {
        state.keyCount = '';
        return;
      } else {
        newCount = Math.max(1, parseInt(val) || 1);
        state.keyCount = newCount;
      }
      // Rebalance persons so sum(keysGiven) === newCount, preserving distribution where possible
      if (!state.handoverPersons || state.handoverPersons.length === 0) state.handoverPersons = [createEmptyPerson()];
      // ensure each has keysGiven
      state.handoverPersons.forEach(p => { if (!p.keysGiven || p.keysGiven < 1) p.keysGiven = 1; });
      const rebalanced = rebalanceForTotal(state.handoverPersons, newCount);
      state.handoverPersons = rebalanced;
      // Keep legacy fields in sync with first person
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name;
        state.handoverRole = state.handoverPersons[0].role;
        state.handoverContact = state.handoverPersons[0].contact;
        state.handoverPersonId = state.handoverPersons[0].personId;
      }
    },
    setPersonKeysGiven: (state, action) => {
      const { index, keysGiven } = action.payload;
      if (!state.handoverPersons[index]) return;
      let kg = parseInt(keysGiven, 10);
      if (isNaN(kg) || kg < 1) kg = 1;
      state.handoverPersons[index].keysGiven = kg;
      rebalanceAfterEdit(state, index);
      // sync legacy if first
      if (index === 0 && state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name;
      }
    },
    setHandoverDetails: (state, action) => {
      const { name, role, contact, index = 0 } = action.payload;
      // Ensure array sized
      if (!state.handoverPersons || state.handoverPersons.length === 0) state.handoverPersons = [createEmptyPerson()];
      const targetIdx = Math.min(Math.max(0, index), state.handoverPersons.length - 1);
      const person = state.handoverPersons[targetIdx];
      const hadReuse = !!person.personId || !!state.handoverPersonId;
      if (name !== undefined) {
        if (hadReuse && name !== person.name) {
          person.personId = null;
          if (targetIdx === 0) state.handoverPersonId = null;
        }
        person.name = name;
        if (targetIdx === 0) state.handoverName = name;
      }
      if (role !== undefined) {
        if (hadReuse && role !== person.role) {
          person.personId = null;
          if (targetIdx === 0) state.handoverPersonId = null;
        }
        person.role = role;
        if (targetIdx === 0) state.handoverRole = role;
      }
      if (contact !== undefined) {
        if (hadReuse && contact !== person.contact) person.personId = null;
        person.contact = contact;
        if (targetIdx === 0) state.handoverContact = contact;
      }
    },
    setHandoverPersonField: (state, action) => {
      const { index, field, value } = action.payload;
      if (!state.handoverPersons[index]) return;
      state.handoverPersons[index][field] = value;
      // sync legacy first entry
      if (index === 0) {
        if (field === 'name') state.handoverName = value;
        if (field === 'role') state.handoverRole = value;
        if (field === 'contact') state.handoverContact = value;
        if (field === 'personId') state.handoverPersonId = value;
      }
    },
    setHandoverPersons: (state, action) => {
      const arr = action.payload;
      if (Array.isArray(arr)) {
        const allowed = ["active","inactive","returned","lost"];
        state.handoverPersons = arr.map(p => ({
          name: p.name || '',
          role: p.role || '',
          contact: p.contact || p.contactNumber || '',
          personId: p.personId || null,
          photo: p.photo || null,
          status: allowed.includes(p.status) ? p.status : 'active',
          photoIsReused: !!p.photoIsReused || (typeof p.photo === 'string' && p.photo.startsWith('http')),
          keysGiven: parseInt(p.keysGiven, 10) >= 1 ? parseInt(p.keysGiven, 10) : 1,
        }));
        // Ensure sum(keysGiven) === keyCount via rebalance
        const kc = parseInt(state.keyCount) || 1;
        state.handoverPersons.forEach(p => { if (!p.keysGiven || p.keysGiven < 1) p.keysGiven = 1; });
        state.handoverPersons = rebalanceForTotal(state.handoverPersons, kc);
        if (state.handoverPersons[0]) {
          state.handoverName = state.handoverPersons[0].name;
          state.handoverRole = state.handoverPersons[0].role;
          state.handoverContact = state.handoverPersons[0].contact;
          state.handoverPersonId = state.handoverPersons[0].personId;
        }
      }
    },
    nextStep: (state) => {
      if (state.currentStep < 4) {
        state.currentStep += 1;
      }
    },
    prevStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
    setStep: (state, action) => {
      state.currentStep = action.payload;
    },
    resetWizard: (state) => {
      return initialState;
    },
    hydrateFromRecord: (state, action) => {
      const rec = action.payload;
      if (!rec) return;
      const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);
      state.editingRecordId = rec._id || rec.id || null;
      state.lockPhoto = pickUrl(rec.lockPhoto) || null;
      state.keyPhoto = pickUrl(rec.keyPhoto) || null;
      state.placementPhoto = pickUrl(rec.placementPhoto) || null;
      state.handoverPhoto = pickUrl(rec.handoverPhoto) || null;
      state.handoverPhotoIsReused = !!pickUrl(rec.handoverPhoto);
      state.placementPhotoIsReused = !!pickUrl(rec.placementPhoto);
      state.keyCount = rec.keyCount ?? 1;
      state.handoverName = rec.handoverPerson?.name || '';
      state.handoverRole = rec.handoverPerson?.role || '';
      state.handoverContact = rec.handoverPerson?.contactNumber || '';
      state.handoverPersonId = rec.handoverPersons?.[0]?.personId || rec.handoverPerson?.personId || null;
      state.savedLocationId = null;
      const allowed = ["active","inactive","returned","lost"];
      if (Array.isArray(rec.handoverPersons) && rec.handoverPersons.length > 0) {
        state.handoverPersons = rec.handoverPersons.map(p => ({
          name: p.name || '',
          role: p.role || '',
          contact: p.contactNumber || p.contact || '',
          personId: p.personId || null,
          photo: pickUrl(p.photo) || null,
          status: allowed.includes(p.status) ? p.status : 'active',
          photoIsReused: !!pickUrl(p.photo),
          keysGiven: parseInt(p.keysGiven, 10) >= 1 ? parseInt(p.keysGiven, 10) : 1,
        }));
        // ensure sum matches keyCount
        const kc = parseInt(state.keyCount) || sumKeys(state.handoverPersons);
        state.handoverPersons = rebalanceForTotal(state.handoverPersons, kc);
      } else if (rec.handoverPerson?.name) {
        state.handoverPersons = [{
          name: rec.handoverPerson.name || '',
          role: rec.handoverPerson.role || '',
          contact: rec.handoverPerson.contactNumber || '',
          personId: null,
          photo: pickUrl(rec.handoverPhoto) || null,
          status: 'active',
          photoIsReused: !!pickUrl(rec.handoverPhoto),
          keysGiven: parseInt(rec.keyCount, 10) || 1,
        }];
      } else {
        state.handoverPersons = [createEmptyPerson()];
      }
      state.metadata = {
        lockPhoto: rec.lockPhoto ? { timestamp: rec.lockPhoto.uploadedAt || rec.createdAt, geolocation: null, reused: true } : null,
        keyPhoto: rec.keyPhoto ? { timestamp: rec.keyPhoto.uploadedAt || rec.createdAt, geolocation: null, reused: true } : null,
        placementPhoto: rec.placementPhoto ? { timestamp: rec.placementPhoto.uploadedAt || rec.createdAt, geolocation: null, reused: true } : null,
        handoverPhoto: rec.handoverPhoto ? { timestamp: rec.handoverPhoto.uploadedAt || rec.createdAt, geolocation: null, reused: true } : null,
      };
      // Start at earliest incomplete step so user can continue
      const hasLock = !!state.lockPhoto;
      const hasKey = !!state.keyPhoto;
      const hasPlacement = !!state.placementPhoto;
      const personsComplete = state.handoverPersons.every(p => p.name?.trim() && p.role?.trim() && !!p.photo);
      if (!hasLock) state.currentStep = 0;
      else if (!hasKey) state.currentStep = 1;
      else if (!hasPlacement) state.currentStep = 2;
      else if (!personsComplete) state.currentStep = 3;
      else state.currentStep = 4;
    },
    setEditingId: (state, action) => {
      state.editingRecordId = action.payload;
    },
  }
});

export const {
  setPhoto,
  removePhoto,
  setKeyCount,
  setHandoverDetails,
  setHandoverPersonField,
  setHandoverPersons,
  nextStep,
  prevStep,
  setStep,
  resetWizard,
  selectSavedPerson,
  clearSavedPerson,
  selectSavedLocation,
  clearSavedLocation,
  setPersonPhoto,
  removePersonPhoto,
  setPersonStatus,
  hydrateFromRecord,
  setEditingId,
  setPersonKeysGiven,
} = wizardSlice.actions;

export const selectWizard = (state) => state.wizard;
export const selectCurrentStep = (state) => state.wizard.currentStep;

export default wizardSlice.reducer;
