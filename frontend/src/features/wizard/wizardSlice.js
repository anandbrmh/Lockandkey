import { createSlice } from '@reduxjs/toolkit';

const createEmptyPerson = () => ({ name: '', role: '', contact: '', personId: null });

const initialState = {
  currentStep: 0, // 0 = Lock, 1 = Key, 2 = Placement, 3 = Handover, 4 = Review
  lockPhoto: null, // Base64 data URL or reused ImageKit URL
  keyPhoto: null,  // Base64 data URL
  keyCount: 1,
  placementPhoto: null, // Base64 data URL or reused URL
  handoverPhoto: null,  // Base64 data URL or reused URL
  handoverName: '', // legacy single-person fields (kept for backward compat, synced with handoverPersons[0])
  handoverRole: '',
  handoverContact: '',
  // New: array of handover persons sized to keyCount
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
  }
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
      if (idx === 0) {
        state.handoverPersonId = person._id;
        state.handoverName = person.name || '';
        state.handoverRole = person.role || '';
        state.handoverContact = person.contactNumber || '';
      }
      if (person.photo?.url) {
        state.handoverPhoto = person.photo.url;
        state.handoverPhotoIsReused = true;
        state.metadata.handoverPhoto = { timestamp: person.photo.uploadedAt || new Date().toISOString(), geolocation: null, reused: true };
      }
    },
    clearSavedPerson: (state, action) => {
      const idx = action.payload?.index ?? 0;
      if (state.handoverPersons[idx]) {
        state.handoverPersons[idx].personId = null;
      }
      if (idx === 0) {
        state.handoverPersonId = null;
        state.handoverPhotoIsReused = false;
      } else if (state.handoverPersons.every(p => !p.personId)) {
        state.handoverPhotoIsReused = false;
      }
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
      // Resize handoverPersons array to match keyCount
      const currentLen = state.handoverPersons?.length || 0;
      if (newCount > currentLen) {
        for (let i = currentLen; i < newCount; i++) state.handoverPersons.push(createEmptyPerson());
      } else if (newCount < currentLen) {
        state.handoverPersons = state.handoverPersons.slice(0, newCount);
      }
      // Keep legacy fields in sync with first person
      if (state.handoverPersons[0]) {
        state.handoverName = state.handoverPersons[0].name;
        state.handoverRole = state.handoverPersons[0].role;
        state.handoverContact = state.handoverPersons[0].contact;
        state.handoverPersonId = state.handoverPersons[0].personId;
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
        state.handoverPersons = arr.map(p => ({ name: p.name || '', role: p.role || '', contact: p.contact || '', personId: p.personId || null }));
        // Ensure length matches keyCount
        const kc = parseInt(state.keyCount) || 1;
        if (state.handoverPersons.length < kc) {
          for (let i = state.handoverPersons.length; i < kc; i++) state.handoverPersons.push(createEmptyPerson());
        } else if (state.handoverPersons.length > kc) {
          state.handoverPersons = state.handoverPersons.slice(0, kc);
        }
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
    }
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
} = wizardSlice.actions;

export const selectWizard = (state) => state.wizard;
export const selectCurrentStep = (state) => state.wizard.currentStep;

export default wizardSlice.reducer;
