import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectWizard, selectCurrentStep, nextStep, prevStep, setKeyCount,
  setHandoverDetails, selectSavedPerson, clearSavedPerson,
  selectSavedLocation, clearSavedLocation, setPersonPhoto, removePersonPhoto, setPersonStatus, setPersonKeysGiven,
} from '../../features/wizard/wizardSlice';
import { fetchSavedPersons, fetchSavedLocations, selectDirectory } from '../../features/directory/directorySlice';
import { createRecord, updateRecord, selectRecordsState } from '../../features/records/recordsSlice';
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

export default function LockKeyUploadWizard({ editingId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wizardState = useSelector(selectWizard);
  const currentStep = useSelector(selectCurrentStep);
  const { creating: isLoading, loading: updatingLoading, error: createError } = useSelector(selectRecordsState);
  const { persons = [], locations = [] } = useSelector(selectDirectory);
  const isEditing = !!editingId || !!wizardState.editingRecordId;
  const effectiveId = editingId || wizardState.editingRecordId;

  const [isSuccess, setIsSuccess] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showPersonBrowse, setShowPersonBrowse] = useState(false);
  const [showLocationBrowse, setShowLocationBrowse] = useState(false);
  const [activePersonIdx, setActivePersonIdx] = useState(0);
  const [cameraPersonIdx, setCameraPersonIdx] = useState(null);
  const personFileRefs = React.useRef({});

  useEffect(() => { dispatch(fetchSavedPersons({ limit: 50 })); dispatch(fetchSavedLocations({ limit: 50 })); }, [dispatch]);

  const handleNext = () => { if (validateStep(currentStep, wizardState)) { setDirection(1); dispatch(nextStep()); } };
  const handlePrev = () => { setDirection(-1); dispatch(prevStep()); };
  const handleSaveDraft = async () => {
    if (!canSaveDraft(wizardState)) { alert('Capture Lock Photo first.'); return; }
    const formData = buildRecordFormData(wizardState);
    const result = isEditing && effectiveId ? await dispatch(updateRecord({ id: effectiveId, formData })) : await dispatch(createRecord(formData));
    if (result.meta.requestStatus === 'fulfilled') setIsSuccess(true); else alert(result.payload || 'Save failed');
  };
  const handleSubmit = async () => {
    if (!canSaveDraft(wizardState)) { alert('Lock Photo required.'); return; }
    const formData = buildRecordFormData(wizardState);
    const result = isEditing && effectiveId ? await dispatch(updateRecord({ id: effectiveId, formData })) : await dispatch(createRecord(formData));
    if (result.meta.requestStatus === 'fulfilled') setIsSuccess(true);
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
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono flex items-center gap-1"><MapPin className="h-3 w-3" /> Saved locations ({locations.length})</span>
              {wizardState.savedLocationId && <button type="button" onClick={() => dispatch(clearSavedLocation())} className="text-xs underline">Clear</button>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
              {locations.map((loc) => {
                const sel = wizardState.savedLocationId === loc._id;
                return (
                  <div key={loc._id} onClick={() => dispatch(selectSavedLocation(loc))} className={`p-2 rounded-md border cursor-pointer flex items-center gap-2 ${sel ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:border-zinc-900'}`}>
                    <span className="h-8 w-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0"><MapPin className="h-4 w-4" /></span>
                    <span className="text-xs truncate">{loc.label || 'Location'}</span>
                    {sel && <Check className="h-3 w-3 ml-auto" />}
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
        const remaining = Math.max(0, keyCountNum - totalAllocated);
        return (
          <div key="handover" className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Handover — {handoverPersons.length} {handoverPersons.length === 1 ? 'person' : 'persons'} for {keyCountNum} keys</h2>
              <p className="text-xs font-mono text-zinc-500">Tell how many keys each person receives. E.g. 4 keys → give 2 to Person 1, forms auto-reduce to 3 (2+1+1). Total must equal {keyCountNum}.</p>
              <div className="mt-2 flex gap-2 text-xs font-mono">
                <span className={`border rounded px-2 py-1 ${totalAllocated === keyCountNum ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>Allocated: {totalAllocated}/{keyCountNum}</span>
                {totalAllocated !== keyCountNum && <span className="border rounded px-2 py-1 bg-red-50 border-red-200 text-red-700">Remaining: {keyCountNum - totalAllocated}</span>}
                {remaining === 0 && totalAllocated === keyCountNum && <span className="border rounded px-2 py-1 bg-emerald-50 border-emerald-200 text-emerald-700">✓ Balanced</span>}
              </div>
            </div>
            {handoverPersons.map((person, idx) => {
              const prefixBefore = handoverPersons.slice(0, idx).reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);
              const maxForThis = keyCountNum - prefixBefore;
              return (
              <div key={idx} className="wire-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono flex items-center gap-1"><span className="h-6 w-6 rounded border border-zinc-900 flex items-center justify-center text-xs">{idx + 1}</span> Person {idx + 1} · <span className="border rounded px-1 text-[11px]">{person.status}</span> · <span className="border rounded px-1 text-[11px] bg-zinc-900 text-white">{person.keysGiven || 1} key{(person.keysGiven||1)>1?'s':''}</span></span>
                  {person.personId ? <button type="button" onClick={() => dispatch(clearSavedPerson({ index: idx }))} className="text-xs underline">Clear</button> : <button type="button" onClick={() => { setActivePersonIdx(idx); setShowPersonBrowse(true); }} className="text-xs underline">Browse</button>}
                </div>
                <div className="space-y-1">
                  <label className="wire-label flex items-center gap-1"><Camera className="h-3 w-3" /> Photo</label>
                  {!person.photo ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCameraPersonIdx(idx)} className="flex-1 wire-btn wire-btn-primary text-xs"><Camera className="h-3.5 w-3.5" /> Camera</button>
                      <button type="button" onClick={() => personFileRefs.current[idx]?.click()} className="flex-1 wire-btn text-xs"><Upload className="h-3.5 w-3.5" /> File</button>
                      <input ref={el => personFileRefs.current[idx] = el} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePersonFile(idx, f); e.target.value = ''; }} />
                    </div>
                  ) : (
                    <div className="relative border border-zinc-200 rounded-md overflow-hidden max-w-sm">
                      <img src={person.photo} alt="" className="w-full aspect-video object-cover" />
                      <button type="button" onClick={() => dispatch(removePersonPhoto({ index: idx }))} className="absolute top-2 right-2 h-7 w-7 bg-white border border-zinc-200 rounded-md flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
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
                    <input type="number" min="1" max={maxForThis} value={person.keysGiven || 1} onChange={(e)=> dispatch(setPersonKeysGiven({ index: idx, keysGiven: e.target.value }))} className="flex-1 text-center wire-input" />
                    <button type="button" onClick={() => dispatch(setPersonKeysGiven({ index: idx, keysGiven: Math.min(maxForThis, (parseInt(person.keysGiven,10)||1)+1 )}))} className="h-9 w-9 border border-zinc-900 rounded-md flex items-center justify-center bg-zinc-900 text-white"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">Max {maxForThis} for this row (auto-reduces forms). Example: 4 keys total + 2 here → 3 persons (2+1+1).</p>
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-4">
      <div className="wire-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">{isEditing ? 'Editing record' : 'New handover'}</p>
          <h1 className="text-lg font-semibold">{isEditing ? 'Continue handover' : 'Document handover'}</h1>
        </div>
        <div className="w-full md:w-1/2"><StepIndicator currentStep={currentStep} /></div>
      </div>
      {createError && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {createError}</div>}
      <div className="wire-card p-4 sm:p-6 min-h-[380px] flex flex-col">
        <div className="flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={variants} initial="enter" animate="center" exit="exit">
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <BrowsePersonModal open={showPersonBrowse} onClose={() => setShowPersonBrowse(false)} onSelect={(p) => dispatch(selectSavedPerson({ person: p, index: activePersonIdx }))} />
        <BrowseLocationModal open={showLocationBrowse} onClose={() => setShowLocationBrowse(false)} onSelect={(loc) => dispatch(selectSavedLocation(loc))} />
        <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <button onClick={handlePrev} disabled={currentStep === 0} className="wire-btn text-xs disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <button onClick={handleSaveDraft} disabled={!canSaveDraft(wizardState)} className="wire-btn text-xs disabled:opacity-40"><Save className="h-3.5 w-3.5" /> {isEditing ? 'Update' : 'Save draft'}</button>
          </div>
          {currentStep < 4 ? <button onClick={handleNext} disabled={!isCurrentStepValid} className="wire-btn wire-btn-primary text-xs disabled:opacity-40">Next <ArrowRight className="h-3.5 w-3.5" /></button> : <span className="text-xs font-mono text-zinc-500">Review → Submit</span>}
        </div>
      </div>
    </div>
  );
}
