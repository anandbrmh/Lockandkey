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
  lockPhoto: null,       // Base64 data URL or reused ImageKit URL
  keyPhoto: null,        // Base64 data URL
  keyCount: 1,
  placementPhoto: null,  // Base64 data URL or reused URL
  // Array of handover persons — each with individual photo, status, keysGiven
  handoverPersons: [createEmptyPerson()],
  // Reuse IDs to avoid re-upload to ImageKit
  savedLocationId: null,
  // Flags to track if placement photo is reused (ImageKit URL) vs newly captured (base64)
  placementPhotoIsReused: false,
  metadata: {
    lockPhoto: null, // { timestamp, geolocation }
    keyPhoto: null,
    placementPhoto: null,
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
      if (state.metadata[key] !== undefined) {
        state.metadata[key] = {
          timestamp: timestamp || new Date().toISOString(),
          geolocation: geolocation || null
        };
      }
      if (key === 'placementPhoto' && photoData?.startsWith('data:')) {
        state.savedLocationId = null;
        state.placementPhotoIsReused = false;
      }
    },
    removePhoto: (state, action) => {
      const { key } = action.payload;
      state[key] = null;
      if (state.metadata[key] !== undefined) state.metadata[key] = null;
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
      state.handoverPersons[idx].role = person.role || person.designation || '';
      state.handoverPersons[idx].contact = person.contactNumber || person.phone || '';
      const photoUrl = person.photo?.url || null;
      if (photoUrl) {
        state.handoverPersons[idx].photo = photoUrl;
        state.handoverPersons[idx].photoIsReused = true;
      }
    },
    clearSavedPerson: (state, action) => {
      const idx = action.payload?.index ?? 0;
      if (state.handoverPersons[idx]) {
        state.handoverPersons[idx].personId = null;
        // keep photo unless user explicitly removes — don't clear photo automatically
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
      }
    },
    removePersonPhoto: (state, action) => {
      const { index } = action.payload;
      if (state.handoverPersons[index]) {
        state.handoverPersons[index].photo = null;
        state.handoverPersons[index].photoIsReused = false;
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
    },
    setPersonKeysGiven: (state, action) => {
      const { index, keysGiven } = action.payload;
      if (!state.handoverPersons[index]) return;
      let kg = parseInt(keysGiven, 10);
      if (isNaN(kg) || kg < 1) kg = 1;
      state.handoverPersons[index].keysGiven = kg;
      const kCount = Math.max(1, parseInt(state.keyCount, 10) || 1);
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, kCount, index);
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
    },
    removePerson: (state, action) => {
      const idx = action.payload;
      if (state.handoverPersons.length <= 1) return; // keep at least one
      state.handoverPersons.splice(idx, 1);
      const kCount = Math.max(1, parseInt(state.keyCount, 10) || 1);
      state.handoverPersons = rebalanceHandoverPersons(state.handoverPersons, kCount);
    },
    setHandoverDetails: (state, action) => {
      const { name, role, contact, index = 0 } = action.payload;
      if (!state.handoverPersons || state.handoverPersons.length === 0) state.handoverPersons = [createEmptyPerson()];
      const targetIdx = Math.min(Math.max(0, index), state.handoverPersons.length - 1);
      const person = state.handoverPersons[targetIdx];
      const hadReuse = !!person.personId;
      if (name !== undefined) {
        if (hadReuse && name !== person.name) person.personId = null;
        person.name = name;
      }
      if (role !== undefined) {
        if (hadReuse && role !== person.role) person.personId = null;
        person.role = role;
      }
      if (contact !== undefined) {
        if (hadReuse && contact !== person.contact) person.personId = null;
        person.contact = contact;
      }
    },
    setHandoverPersonField: (state, action) => {
      const { index, field, value } = action.payload;
      if (!state.handoverPersons[index]) return;
      state.handoverPersons[index][field] = value;
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
      state.placementPhotoIsReused = !!pickUrl(rec.placementPhoto);
      state.keyCount = rec.keyCount ?? 1;
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
        // Backward compat: old records that still have the legacy field
        state.handoverPersons = [{
          name: rec.handoverPerson.name || '',
          role: rec.handoverPerson.role || '',
          contact: rec.handoverPerson.contactNumber || '',
          personId: null,
          photo: null,
          status: 'active',
          photoIsReused: false,
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
// Convenience selectors — derive from handoverPersons[0] instead of removed top-level fields
export const selectFirstPersonName = (state) => state.wizard.handoverPersons?.[0]?.name || '';
export const selectFirstPersonRole = (state) => state.wizard.handoverPersons?.[0]?.role || '';
export const selectFirstPersonContact = (state) => state.wizard.handoverPersons?.[0]?.contact || '';
export const selectFirstPersonId = (state) => state.wizard.handoverPersons?.[0]?.personId || null;

export default wizardSlice.reducer;
