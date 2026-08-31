/**
 * Validates a single wizard step using the current state
 * Returns true if the step is valid, false otherwise.
 */
export const validateStep = (stepIndex, wizardState) => {
  switch (stepIndex) {
    case 0: // Lock Photo
      return !!wizardState.lockPhoto;

    case 1: // Key Photo + Count
      return !!wizardState.keyPhoto && wizardState.keyCount >= 1;

    case 2: // Lock Placement Photo
      return !!wizardState.placementPhoto;

    case 3: { // Handover Persons Photo + Details (N persons = keyCount)
      if (!wizardState.handoverPhoto) return false;
      const count = parseInt(wizardState.keyCount) || 1;
      const persons = wizardState.handoverPersons || [];
      if (persons.length !== count) return false;
      return persons.every(p => p.name?.trim() && p.role?.trim());
    }

    case 4: { // Review and submit
      const kc = parseInt(wizardState.keyCount) || 0;
      const persons = wizardState.handoverPersons || [];
      const personsValid = persons.length === kc && persons.every(p => p.name?.trim() && p.role?.trim());
      return (
        !!wizardState.lockPhoto &&
        !!wizardState.keyPhoto &&
        kc >= 1 &&
        !!wizardState.placementPhoto &&
        !!wizardState.handoverPhoto &&
        personsValid
      );
    }

    default:
      return false;
  }
};
