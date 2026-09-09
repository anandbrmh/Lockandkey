import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectWizard, selectCurrentStep, nextStep, prevStep, setKeyCount,
  setHandoverDetails, selectSavedPerson, clearSavedPerson,
  selectSavedLocation, clearSavedLocation, setPersonPhoto, removePersonPhoto, setPersonStatus, setPersonKeysGiven, addPerson, removePerson,
} from '../../features/wizard/wizardSlice';
import { fetchSavedLocations, selectDirectory } from '../../features/directory/directorySlice';
import { createRecord, updateRecord, selectRecordsState } from '../../features/records/recordsSlice';
import { fetchAssignedUsers } from '../../features/assignedUsers/assignedUsersSlice';
import { resetWizard } from '../../features/wizard/wizardSlice';
import { buildRecordFormData } from '../../utils/formDataBuilder';
import { validateStep, canSaveDraft } from '../../utils/validators';
import { useNavigate } from 'react-router-dom';
import StepIndicator from './StepIndicator';
import PhotoUploadStep from './PhotoUploadStep';
import ReviewSubmit from './ReviewSubmit';
import SuccessAnimation from './SuccessAnimation';
import CameraCapture from './CameraCapture';
import { ArrowLeft, ArrowRight, User, Hash, Plus, Minus, AlertCircle, Users, MapPin, Check, Landmark, Contact, ShieldCheck, Save, Camera, Upload, Trash2 } from 'lucide-react';
import BrowsePersonModal from './BrowsePersonModal';
import BrowseLocationModal from './BrowseLocationModal';
import { motion, AnimatePresence } from 'framer-motion';
import {saveOfflineEntry} from '../../utils/Offline.db';  

export default function LockKeyUploadWizard({ editingId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wizardState = useSelector(selectWizard);
  const currentStep = useSelector(selectCurrentStep);
  const { creating: isLoading, loading: updatingLoading, error: createError } = useSelector(selectRecordsState);
  const { locations = [] } = useSelector(selectDirectory);
  const isEditing = !!editingId || !!wizardState.editingRecordId;
  const effectiveId = editingId || wizardState.editingRecordId;

  const [isSuccess, setIsSuccess] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showPersonBrowse, setShowPersonBrowse] = useState(false);
  const [showLocationBrowse, setShowLocationBrowse] = useState(false);
  const [activePersonIdx, setActivePersonIdx] = useState(0);
  const [cameraPersonIdx, setCameraPersonIdx] = useState(null);
  const personFileRefs = React.useRef({});

  useEffect(() => { dispatch(fetchSavedLocations({ limit: 50 })); }, [dispatch]);

  const handleNext = () => { if (validateStep(currentStep, wizardState)) { setDirection(1); dispatch(nextStep()); } };
  const handlePrev = () => { setDirection(-1); dispatch(prevStep()); };
const handleSaveDraft = async () => {
  if (!canSaveDraft(wizardState)) { alert('Capture Lock Photo first.'); return; }

  if (!navigator.onLine) {
    await saveOfflineEntry({ wizardState, isEditing, effectiveId, isDraft: true, timestamp: Date.now() });
    setIsSuccess(true);
    return;
  }

  const formData = buildRecordFormData(wizardState);
  const result = isEditing && effectiveId ? await dispatch(updateRecord({ id: effectiveId, formData })) : await dispatch(createRecord(formData));
  if (result.meta.requestStatus === 'fulfilled') { dispatch(fetchAssignedUsers({ search: '', limit: 100 })); setIsSuccess(true); } else alert(result.payload || 'Save failed');
};
const handleSubmit = async () => {
  if (!canSaveDraft(wizardState)) { alert('Lock Photo required.'); return; }

  if (!navigator.onLine) {
    // wizardState already base64 strings rakhta hai, JSON-safe hai
    await saveOfflineEntry({ wizardState, isEditing, effectiveId, timestamp: Date.now() });
    setIsSuccess(true); // ya ek custom "Saved offline" screen dikhao
    return;
  }

  const formData = buildRecordFormData(wizardState);
  try {
    const result = isEditing && effectiveId
      ? await dispatch(updateRecord({ id: effectiveId, formData }))
      : await dispatch(createRecord(formData));

    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchAssignedUsers({ search: '', limit: 100 }));
      setIsSuccess(true);
    } else {
      await saveOfflineEntry({ wizardState, isEditing, effectiveId, timestamp: Date.now() });
      setIsSuccess(true);
    }
  } catch (err) {
    await saveOfflineEntry({ wizardState, isEditing, effectiveId, timestamp: Date.now() });
    setIsSuccess(true);
  }
};
  const handlePersonFile = (idx, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) dispatch(setPersonPhoto({ index: idx, photoData: e.target.result, timestamp: new Date().toISOString() })); };
    reader.readAsDataURL(file);
  };
  const handleResetFromSuccess = () => { dispatch(resetWizard()); setIsSuccess(false); if (isEditing) navigate('/history'); };
  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.2 } },
    exit: (dir) => ({ x: dir < 0 ? 40 : -40, opacity: 0, transition: { duration: 0.15 } }),
  };
  if (isSuccess) return <SuccessAnimation onReset={handleResetFromSuccess} />;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <PhotoUploadStep key="lock" title="Lock Photo" description="Photo of the lock." photoKey="lockPhoto" />;
      case 1: {
        const keyCountFields = (
          <div className="max-w-sm space-y-2">
            <label className="wire-label flex items-center gap-1"><Hash className="h-3 w-3" /> Keys handed over</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => dispatch(setKeyCount(Math.max(1, (parseInt(wizardState.keyCount) || 1) - 1)))} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-white"><Minus className="h-4 w-4" /></button>
              <input type="number" min="1" value={wizardState.keyCount} onChange={(e) => dispatch(setKeyCount(e.target.value))} className="flex-1 text-center wire-input" />
              <button type="button" onClick={() => dispatch(setKeyCount((parseInt(wizardState.keyCount) || 1) + 1))} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-zinc-900 text-white"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        );
        return <PhotoUploadStep key="key" title="Key Photo + Count" description="Photo of keys and quantity." photoKey="keyPhoto" extraFields={keyCountFields} />;
      }
      case 2: {
        const locationInlineFields = locations?.length ? (
          <div className="pt-3 border-t border-dashed border-zinc-200 space-y-2">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <span className="text-xs font-mono flex items-center gap-1"><MapPin className="h-3 w-3" /> Saved locations ({locations.length})</span>
              {wizardState.savedLocationId && <button type="button" onClick={() => dispatch(clearSavedLocation())} className="text-xs underline touch-manipulation">Clear</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
              {locations.map((loc) => {
                const sel = wizardState.savedLocationId === loc._id;
                return (
                  <div key={loc._id} onClick={() => dispatch(selectSavedLocation(loc))} className={`p-2 rounded-md border cursor-pointer flex items-center gap-2 min-w-0 touch-manipulation ${sel ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:border-zinc-900'}`}>
                    <span className="h-8 w-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0"><MapPin className="h-4 w-4" /></span>
                    <span className="text-xs truncate min-w-0 flex-1">{loc.label || 'Location'}</span>
                    {sel && <Check className="h-3 w-3 ml-auto shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;
        return <PhotoUploadStep key="placement" title="Placement" description="Where the lock is installed." photoKey="placementPhoto" extraFields={locationInlineFields} browseAction={{ label: wizardState.savedLocationId ? 'Using saved location' : 'Browse locations', icon: <MapPin className="h-3.5 w-3.5" />, onClick: () => setShowLocationBrowse(true) }} />;
      }
      case 3: {
        const keyCountNum = parseInt(wizardState.keyCount) || 1;
        const handoverPersons = wizardState.handoverPersons || [];
        const totalAllocated = handoverPersons.reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);
        return (
          <div key="handover" className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Handover — {handoverPersons.length} {handoverPersons.length === 1 ? 'person form' : 'person forms'} ({keyCountNum} keys total)</h2>
              <p className="text-xs font-mono text-zinc-500 leading-snug">Browse assigned users (name + phone) or create new one — then upload. Admin can assign to anyone.</p>
              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
                <span className="border rounded px-2 py-1 bg-zinc-900 text-white border-zinc-900">Total keys: {keyCountNum}</span>
                <span className="border rounded px-2 py-1 bg-zinc-50 border-zinc-200">Forms: {handoverPersons.length}</span>
                <span className="border rounded px-2 py-1 bg-zinc-50 border-zinc-200">Allocated: {totalAllocated} / {keyCountNum}</span>
                <button type="button" onClick={() => dispatch(addPerson())} className="border rounded px-2 py-1 bg-white hover:bg-zinc-900 hover:text-white border-zinc-900 flex items-center gap-1 shrink-0 touch-manipulation"><Plus className="h-3 w-3" /> Add person</button>
              </div>
            </div>
            {handoverPersons.map((person, idx) => {
              return (
              <div key={idx} className="wire-card p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono flex flex-wrap items-center gap-1"><span className="h-6 w-6 rounded border border-zinc-900 flex items-center justify-center text-xs shrink-0">{idx + 1}</span> Person {idx + 1} · <span className="border rounded px-1 text-[11px]">{person.status}</span> · <span className="border rounded px-1 text-[11px] bg-zinc-900 text-white">{person.keysGiven || 1} key{(person.keysGiven||1)>1?'s':''}</span></span>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {handoverPersons.length > 1 && <button type="button" onClick={() => dispatch(removePerson(idx))} className="text-xs border border-red-200 bg-red-50 text-red-700 px-2 py-1 rounded touch-manipulation">Remove</button>}
                    {person.personId ? <button type="button" onClick={() => dispatch(clearSavedPerson({ index: idx }))} className="text-xs underline touch-manipulation">Clear</button> : <button type="button" onClick={() => { setActivePersonIdx(idx); setShowPersonBrowse(true); }} className="text-xs underline touch-manipulation">Browse users</button>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="wire-label flex items-center gap-1 flex-wrap"><Camera className="h-3 w-3" /> Photo <span className="text-[10px] font-mono text-zinc-500">(Camera / Gallery / Browse)</span></label>
                  {!person.photo ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCameraPersonIdx(idx)} className="flex-1 min-h-[42px] wire-btn wire-btn-primary text-xs touch-manipulation"><Camera className="h-3.5 w-3.5" /> Camera</button>
                        <button type="button" onClick={() => personFileRefs.current[idx]?.click()} className="flex-1 min-h-[42px] wire-btn text-xs touch-manipulation"><Upload className="h-3.5 w-3.5" /> Browse file</button>
                      </div>
                      <button type="button" onClick={() => { setActivePersonIdx(idx); setShowPersonBrowse(true); }} className="w-full min-h-[42px] wire-btn text-xs border-dashed touch-manipulation"><Users className="h-3.5 w-3.5" /> Browse users</button>
                      <p className="text-[11px] font-mono text-zinc-500 text-center leading-snug">Browse → check → create if missing → upload</p>
                      <input ref={el => personFileRefs.current[idx] = el} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePersonFile(idx, f); e.target.value = ''; }} />
                    </div>
                  ) : (
                    <div className="relative border border-zinc-200 rounded-md overflow-hidden w-full max-w-sm mx-auto sm:mx-0">
                      <img src={person.photo} alt="" className="w-full aspect-video object-cover" />
                      <button type="button" onClick={() => dispatch(removePersonPhoto({ index: idx }))} className="absolute top-2 right-2 h-8 w-8 sm:h-7 sm:w-7 bg-white border border-zinc-200 rounded-md flex items-center justify-center shadow-sm touch-manipulation"><Trash2 className="h-3.5 w-3.5" /></button>
                      {person.personId && (
                        <div className="absolute bottom-2 left-2 bg-zinc-900 text-white text-[10px] font-mono px-2 py-1 rounded">From staff</div>
                      )}
                      <div className="absolute bottom-2 right-2 flex gap-1 flex-wrap justify-end max-w-[60%]">
                        <button type="button" onClick={() => setCameraPersonIdx(idx)} className="h-7 px-2 bg-white border border-zinc-200 rounded-md flex items-center gap-1 text-[11px] shadow-sm touch-manipulation"><Camera className="h-3 w-3" /> Retake</button>
                        <button type="button" onClick={() => { setActivePersonIdx(idx); setShowPersonBrowse(true); }} className="h-7 px-2 bg-white border border-zinc-200 rounded-md flex items-center gap-1 text-[11px] shadow-sm touch-manipulation"><Users className="h-3 w-3" /> Browse</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div><label className="wire-label flex items-center gap-1"><User className="h-3 w-3" /> Name</label><input value={person.name} onChange={(e) => dispatch(setHandoverDetails({ name: e.target.value, index: idx }))} className="wire-input mt-1" placeholder="Name" /></div>
                  <div><label className="wire-label flex items-center gap-1"><Landmark className="h-3 w-3" /> Role</label><input value={person.role} onChange={(e) => dispatch(setHandoverDetails({ role: e.target.value, index: idx }))} className="wire-input mt-1" placeholder="Role" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div><label className="wire-label flex items-center gap-1"><Contact className="h-3 w-3" /> Contact</label><input value={person.contact} onChange={(e) => dispatch(setHandoverDetails({ contact: e.target.value, index: idx }))} className="wire-input mt-1" placeholder="Optional" /></div>
                  <div><label className="wire-label flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Status</label><select value={person.status} onChange={(e) => dispatch(setPersonStatus({ index: idx, status: e.target.value }))} className="wire-input mt-1 bg-white"><option value="active">active</option><option value="inactive">inactive</option><option value="returned">returned</option><option value="lost">lost</option></select></div>
                </div>
                <div>
                  <label className="wire-label flex items-center gap-1"><Hash className="h-3 w-3" /> Keys to this person</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button type="button" onClick={() => dispatch(setPersonKeysGiven({ index: idx, keysGiven: Math.max(1, (parseInt(person.keysGiven,10)||1)-1 )}))} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-white"><Minus className="h-4 w-4" /></button>
                    <input type="number" min="1" value={person.keysGiven || 1} onChange={(e)=> dispatch(setPersonKeysGiven({ index: idx, keysGiven: e.target.value }))} className="flex-1 text-center wire-input" />
                    <button type="button" onClick={() => dispatch(setPersonKeysGiven({ index: idx, keysGiven: (parseInt(person.keysGiven,10)||1)+1 }))} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-zinc-900 text-white"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">One person can take multiple keys (e.g. 1 person → 5 keys).</p>
                </div>
              </div>
              );
            })}
            {cameraPersonIdx !== null && <div className="fixed inset-0 z-50"><CameraCapture label={`Person ${cameraPersonIdx + 1}`} onCapture={(b) => { dispatch(setPersonPhoto({ index: cameraPersonIdx, photoData: b, timestamp: new Date().toISOString() })); setCameraPersonIdx(null); }} onClose={() => setCameraPersonIdx(null)} /></div>}
          </div>
        );
      }
      case 4: return <ReviewSubmit key="review" onSubmit={handleSubmit} isSubmitting={isLoading || updatingLoading} isEditing={isEditing} />;
      default: return null;
    }
  };

  const isCurrentStepValid = validateStep(currentStep, wizardState);
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
      <div className="wire-card p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">{isEditing ? 'Editing record' : 'New handover'}</p>
          <h1 className="text-base sm:text-lg font-semibold truncate">{isEditing ? 'Continue handover' : 'Document handover'}</h1>
        </div>
        <div className="w-full md:w-1/2 shrink-0"><StepIndicator currentStep={currentStep} /></div>
      </div>
      {createError && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2 break-words"><AlertCircle className="h-4 w-4 shrink-0" /> <span className="min-w-0">{createError}</span></div>}
      <div className="wire-card p-3 sm:p-6 min-h-[320px] sm:min-h-[380px] flex flex-col">
        {/* Mobile top controls — visible only on mobile */}
        <div className="flex flex-col gap-2 pb-4 mb-4 border-b border-zinc-200 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePrev} disabled={currentStep === 0} className="wire-btn text-xs disabled:opacity-40 min-h-[42px] touch-manipulation justify-center"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <button onClick={handleSaveDraft} disabled={!canSaveDraft(wizardState)} className="wire-btn text-xs disabled:opacity-40 min-h-[42px] touch-manipulation justify-center"><Save className="h-3.5 w-3.5" /> {isEditing ? 'Update' : 'Save draft'}</button>
          </div>
          {currentStep < 4 ? <button onClick={handleNext} disabled={!isCurrentStepValid} className="wire-btn wire-btn-primary text-xs disabled:opacity-40 min-h-[44px] w-full justify-center touch-manipulation">Next <ArrowRight className="h-3.5 w-3.5" /></button> : <span className="text-xs font-mono text-zinc-500 text-center py-2">Review → Submit</span>}
        </div>
        <div className="flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={variants} initial="enter" animate="center" exit="exit">
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <BrowsePersonModal open={showPersonBrowse} onClose={() => setShowPersonBrowse(false)} onSelect={(p) => dispatch(selectSavedPerson({ person: p, index: activePersonIdx }))} />
        <BrowseLocationModal open={showLocationBrowse} onClose={() => setShowLocationBrowse(false)} onSelect={(loc) => dispatch(selectSavedLocation(loc))} />
        {/* Desktop bottom controls — hidden on mobile */}
        <div className="hidden md:flex mt-6 pt-4 border-t border-zinc-200 flex-row flex-wrap justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrev} disabled={currentStep === 0} className="wire-btn text-xs disabled:opacity-40 min-h-[40px] touch-manipulation"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <button onClick={handleSaveDraft} disabled={!canSaveDraft(wizardState)} className="wire-btn text-xs disabled:opacity-40 min-h-[40px] touch-manipulation"><Save className="h-3.5 w-3.5" /> {isEditing ? 'Update' : 'Save draft'}</button>
          </div>
          {currentStep < 4 ? <button onClick={handleNext} disabled={!isCurrentStepValid} className="wire-btn wire-btn-primary text-xs disabled:opacity-40 min-h-[40px] w-auto justify-center touch-manipulation">Next <ArrowRight className="h-3.5 w-3.5" /></button> : <span className="text-xs font-mono text-zinc-500 text-right">Review → Submit</span>}
        </div>
      </div>
    </div>
  );
}
