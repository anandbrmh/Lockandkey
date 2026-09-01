import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import LockKeyUploadWizard from '../components/wizard/LockKeyUploadWizard';
import { fetchRecordById, selectRecordsState } from '../features/records/recordsSlice';
import { hydrateFromRecord, resetWizard } from '../features/wizard/wizardSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function WizardPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentRecord, loading } = useSelector(selectRecordsState);

  useEffect(() => { if (id) dispatch(fetchRecordById(id)); }, [id, dispatch]);
  useEffect(() => { if (id && currentRecord && (currentRecord._id === id || currentRecord.id === id)) dispatch(hydrateFromRecord(currentRecord)); }, [id, currentRecord, dispatch]);
  // Fresh wizard for new record — never auto-open old incomplete draft
  // User can resume draft from History → Edit if they want
  useEffect(() => {
    if (!id) {
      dispatch(resetWizard());
    }
  }, [id, dispatch]);

  const isEditing = !!id;
  if (isEditing && loading && !currentRecord) return <div className="min-h-[50vh] flex items-center justify-center"><LoadingSpinner message="Loading..." /></div>;
  if (isEditing && !loading && !currentRecord) return <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3"><p className="text-sm text-zinc-500">Record not found.</p><button onClick={() => navigate('/history')} className="wire-btn wire-btn-primary text-xs">Back to History</button></div>;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 bg-white">
      {isEditing && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-3">
          <div className="flex items-center gap-2 p-3 border border-zinc-200 rounded-md bg-zinc-50 text-xs">
            <span className="font-medium">Editing</span><span className="text-zinc-500">— #{String(id).slice(0,8)}</span>
            <button onClick={() => navigate('/history')} className="ml-auto underline">Back</button>
          </div>
        </div>
      )}
      <LockKeyUploadWizard editingId={id} />
    </div>
  );
}
