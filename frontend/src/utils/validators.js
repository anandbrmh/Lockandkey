/**
 * Validates a single wizard step using the current state
 * Returns true if the step is valid, false otherwise.
 * For incremental workflow, only lock is mandatory for draft save; other steps can be completed later.
 */
export const validateStep = (stepIndex, wizardState) => {
  switch (stepIndex) {
    case 0: // Lock Photo — always required
      return !!wizardState.lockPhoto;

    case 1: // Key Photo + Count — require keyPhoto and count when traversing sequentially, but draft save bypasses this
      return !!wizardState.keyPhoto && (parseInt(wizardState.keyCount) || 0) >= 1;

    case 2: // Lock Placement Photo — optional for draft, but required for sequential progression
      return !!wizardState.placementPhoto;

    case 3: { // Handover Persons
      const persons = wizardState.handoverPersons || [];
      if (persons.length === 0) return false;
      if (persons.some(p => (parseInt(p.keysGiven, 10) || 1) < 1)) return false;
      const keyCountNum = parseInt(wizardState.keyCount, 10) || 1;
      const sumAllocated = persons.reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);
      if (sumAllocated !== keyCountNum) return false;
      const hasNames = persons.every(p => p.name?.trim() && p.role?.trim());
      if (!hasNames) return false;
      const allPhotos = persons.every(p => !!p.photo);
      return allPhotos;
    }

    case 4: { // Review — for incremental saves, only lock is mandatory; full validation is shown as warnings not blocks
      return !!wizardState.lockPhoto;
    }

    default:
      return false;
  }
};

// Draft save allowed if at least lock photo exists (user can add lock and hit save, later update remaining steps)
export const canSaveDraft = (wizardState) => !!wizardState.lockPhoto;

// Strict completeness check for UI warnings
export const isFullyComplete = (wizardState) => {
  const kc = parseInt(wizardState.keyCount) || 0;
  const persons = wizardState.handoverPersons || [];
  const sumAllocated = persons.reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);
  const personsValid = persons.length > 0 && sumAllocated === kc && persons.every(p => p.name?.trim() && p.role?.trim() && !!p.photo && ["active","inactive","returned","lost"].includes(p.status || "active") && (parseInt(p.keysGiven,10)||1) >= 1);
  return (
    !!wizardState.lockPhoto &&
    !!wizardState.keyPhoto &&
    kc >= 1 &&
    !!wizardState.placementPhoto &&
    personsValid
  );
};

/**
 * Filters and clamps handover persons list for display so that total keys assigned
 * equals keyCount and no zero-key or excess placeholder persons are displayed.
 */
export const filterHandoverPersonsForDisplay = (persons, keyCount) => {
  const kCount = Math.max(1, parseInt(keyCount, 10) || 1);
  if (!Array.isArray(persons) || persons.length === 0) return [];

  const validOnly = persons.filter((p) => p && (p.name?.trim() || p.personId || p.photo));
  let allocated = 0;
  const result = [];

  for (let i = 0; i < validOnly.length; i++) {
    if (allocated < kCount) {
      const p = validOnly[i];
      const origKg = parseInt(p.keysGiven, 10) >= 1 ? parseInt(p.keysGiven, 10) : 1;
      const actualKeys = Math.min(origKg, kCount - allocated);

      if (actualKeys > 0) {
        result.push({
          ...p,
          keysGiven: actualKeys,
        });
        allocated += actualKeys;
      }
    } else {
      break;
    }
  }

  return result;
};
