// frontend/src/hooks/useOfflineSync.js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAllPendingEntries, deletePendingEntry } from '../utils/Offline.db';
import { createRecord, updateRecord } from '../features/records/recordsSlice';
import { buildRecordFormData } from '../utils/formDataBuilder';

export function useOfflineSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    const syncPending = async () => {
      const entries = await getAllPendingEntries();
      for (const entry of entries) {
        try {
          const formData = buildRecordFormData(entry.wizardState);
          const result = entry.isEditing && entry.effectiveId
            ? await dispatch(updateRecord({ id: entry.effectiveId, formData }))
            : await dispatch(createRecord(formData));

          if (result.meta.requestStatus === 'fulfilled') {
            await deletePendingEntry(entry.id);
          }
        } catch (err) {
          console.log('Sync failed for entry, will retry later');
        }
      }
    };

    window.addEventListener('online', syncPending);
    syncPending();

    return () => window.removeEventListener('online', syncPending);
  }, [dispatch]);
}