import { createSlice } from '@reduxjs/toolkit';

const createEmptyPerson = () => ({ name: '', role: '', contact: '', personId: null, photo: null, status: 'active', photoIsReused: false, keysGiven: 1 });

const rebalanceHandoverPersons = (persons, keyCount, targetIndex = null) => {
  const kCount = Math.max(1, parseInt(keyCount, 10) || 1);
  if (!Array.isArray(persons) || persons.length === 0) {
    persons = [createEmptyPerson()];
  }

  let list = persons.map(p => ({
    ...p,
    keysGiven: Math.max(1, parseInt(p.keysGiven, 10) || 1)
  }));

  if (targetIndex !== null && targetIndex >= 0 && targetIndex < list.length) {
    let keysBefore = 0;
    for (let i = 0; i < targetIndex; i++) {
      keysBefore += list[i].keysGiven;
    }

    const maxTargetKeys = Math.max(1, kCount - keysBefore);
    list[targetIndex].keysGiven = Math.min(list[targetIndex].keysGiven, maxTargetKeys);

    let remKeys = kCount - (keysBefore + list[targetIndex].keysGiven);
    let i = targetIndex + 1;

    while (remKeys > 0) {
      if (i < list.length) {
        const take = Math.min(list[i].keysGiven || 1, remKeys);
        list[i].keysGiven = take;
        remKeys -= take;
        i++;
      } else {
        const newP = createEmptyPerson();
        newP.keysGiven = 1;
        list.push(newP);
        remKeys -= 1;
        i++;
      }
    }

    if (i < list.length) {
      list.splice(i);
    }
  } else {
    let allocated = 0;
    let keepCount = 0;

    for (let i = 0; i < list.length; i++) {
      if (allocated < kCount) {
        const avail = kCount - allocated;
        list[i].keysGiven = Math.min(list[i].keysGiven || 1, avail);
        allocated += list[i].keysGiven;
        keepCount = i + 1;
      } else {
        break;
      }
    }
    list = list.slice(0, keepCount);

    while (allocated < kCount) {
      const newP = createEmptyPerson();
      newP.keysGiven = 1;
      list.push(newP);
      allocated += 1;
    }
  }

  return list;
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
      if (val === '') {
        state.keyCount = '';
        return;
      }
      const newCount = Math.max(1, parseInt(val, 10) || 1);
      state.keyCount = newCount;
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, newCount);
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name || '';
        state.handoverRole = state.handoverPersons[0].role || '';
        state.handoverContact = state.handoverPersons[0].contact || '';
        state.handoverPersonId = state.handoverPersons[0].personId || null;
      }
    },
    setPersonKeysGiven: (state, action) => {
      const { index, keysGiven } = action.payload;
      if (!state.handoverPersons[index]) return;
      let kg = parseInt(keysGiven, 10);
      if (isNaN(kg) || kg < 1) kg = 1;
      state.handoverPersons[index].keysGiven = kg;
      const kCount = Math.max(1, parseInt(state.keyCount, 10) || 1);
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, kCount, index);
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name || '';
        state.handoverRole = state.handoverPersons[0].role || '';
        state.handoverContact = state.handoverPersons[0].contact || '';
        state.handoverPersonId = state.handoverPersons[0].personId || null;
      }
    },
    addPerson: (state) => {
      const kCount = Math.max(1, parseInt(state.keyCount, 10) || 1);
      if (state.handoverPersons.length >= kCount) {
        state.keyCount = kCount + 1;
        state.handoverPersons.push(createEmptyPerson());
      } else {
        state.handoverPersons.push(createEmptyPerson());
        state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, kCount);
      }
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name || '';
        state.handoverRole = state.handoverPersons[0].role || '';
        state.handoverContact = state.handoverPersons[0].contact || '';
        state.handoverPersonId = state.handoverPersons[0].personId || null;
      }
    },
    removePerson: (state, action) => {
      const idx = action.payload;
      if (state.handoverPersons.length <= 1) return; // keep at least one
      state.handoverPersons.splice(idx, 1);
      const kCount = Math.max(1, parseInt(state.keyCount, 10) || 1);
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, kCount);
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name || '';
        state.handoverRole = state.handoverPersons[0].role || '';
        state.handoverContact = state.handoverPersons[0].contact || '';
        state.handoverPersonId = state.handoverPersons[0].personId || null;
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
        state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, state.keyCount);
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
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, state.keyCount);

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
  addPerson,
  removePerson,
} = wizardSlice.actions;

export const selectWizard = (state) => state.wizard;
export const selectCurrentStep = (state) => state.wizard.currentStep;

export default wizardSlice.reducer;
