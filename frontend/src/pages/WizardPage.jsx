import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import LockKeyUploadWizard from '../components/wizard/LockKeyUploadWizard';
import { fetchRecordById, selectRecordsState } from '../features/records/recordsSlice';
import { hydrateFromRecord } from '../features/wizard/wizardSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function WizardPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentRecord, loading } = useSelector(selectRecordsState);

  useEffect(() => {
    if (id) {
      dispatch(fetchRecordById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (id && currentRecord && (currentRecord._id === id || currentRecord.id === id)) {
      dispatch(hydrateFromRecord(currentRecord));
    }
  }, [id, currentRecord, dispatch]);

  // editing banner
  const isEditing = !!id;

  if (isEditing && loading && !currentRecord) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner message="Loading record for editing..." />
      </div>
    );
  }

  if (isEditing && !loading && !currentRecord) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-slate-500">Record not found or failed to load.</p>
        <button onClick={() => navigate('/history')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm">Back to History</button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-300 py-6">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-primary-600/5 blur-[100px] pointer-events-none z-0" />
      <div className="relative z-10">
        {isEditing && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
              <span className="font-bold">Editing mode</span>
              <span className="text-xs opacity-80">— You saved Lock earlier; complete remaining steps (Key / Placement / Per-person photos) and hit Update. Draft already in History #{String(id).substring(0,8)}</span>
              <button onClick={() => navigate('/history')} className="ml-auto text-xs underline">Back</button>
            </div>
          </div>
        )}
        <LockKeyUploadWizard editingId={id} />
      </div>
    </div>
  );
}
