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

    case 3: { // Handover Persons — each person needs name/role and individual photo (per-key image requirement)
      const count = parseInt(wizardState.keyCount) || 1;
      const persons = wizardState.handoverPersons || [];
      if (persons.length !== count) return false;
      // For strict step validation, require name/role; photo per person is required for final submit but allow draft without photo?
      // We enforce per-person photo here for sequential flow — user must upload each key person's image
      const hasNames = persons.every(p => p.name?.trim() && p.role?.trim());
      if (!hasNames) return false;
      // Check each person has photo (either data URL or reused http)
      const allPhotos = persons.every(p => !!p.photo);
      return allPhotos;
    }

    case 4: { // Review — for incremental saves, only lock is mandatory; full validation is shown as warnings not blocks
      // Full completion check (used to show completeness, but draft submit only needs lock)
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
  const personsValid = persons.length === kc && persons.every(p => p.name?.trim() && p.role?.trim() && !!p.photo && ["active","inactive","returned","lost"].includes(p.status || "active"));
  return (
    !!wizardState.lockPhoto &&
    !!wizardState.keyPhoto &&
    kc >= 1 &&
    !!wizardState.placementPhoto &&
    personsValid
  );
};
