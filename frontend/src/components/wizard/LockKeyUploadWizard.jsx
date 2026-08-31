import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectWizard,
  selectCurrentStep,
  nextStep,
  prevStep,
  setKeyCount,
  setHandoverDetails,
  selectSavedPerson,
  clearSavedPerson,
  selectSavedLocation,
  clearSavedLocation,
  setPersonPhoto,
  removePersonPhoto,
  setPersonStatus,
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
import { ArrowLeft, ArrowRight, User, Contact, Hash, Landmark, Sparkles, Plus, Minus, AlertCircle, Users, MapPin, Check, Search, X, Briefcase, Phone, Clock, Camera, Upload, Trash2, Image as ImageIcon, ShieldCheck, Save } from 'lucide-react';
import BrowsePersonModal from './BrowsePersonModal';
import BrowseLocationModal from './BrowseLocationModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function LockKeyUploadWizard({ editingId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wizardState = useSelector(selectWizard);
  const currentStep = useSelector(selectCurrentStep);
  const { creating: isLoading, loading: updatingLoading, error: createError } = useSelector(selectRecordsState);
  const { persons = [], locations = [], loadingPersons, loadingLocations } = useSelector(selectDirectory);
  const isEditing = !!editingId || !!wizardState.editingRecordId;
  const effectiveId = editingId || wizardState.editingRecordId;

  const [isSuccess, setIsSuccess] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = Forward, -1 = Backward
  const [showPersonBrowse, setShowPersonBrowse] = useState(false);
  const [showLocationBrowse, setShowLocationBrowse] = useState(false);
  const [activePersonIdx, setActivePersonIdx] = useState(0);
  const [cameraPersonIdx, setCameraPersonIdx] = useState(null);
  const personFileRefs = React.useRef({});

  useEffect(() => {
    dispatch(fetchSavedPersons({ limit: 50 }));
    dispatch(fetchSavedLocations({ limit: 50 }));
  }, [dispatch]);

  const handleNext = () => {
    if (validateStep(currentStep, wizardState)) {
      setDirection(1);
      dispatch(nextStep());
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    dispatch(prevStep());
  };

  const handleSaveDraft = async () => {
    if (!canSaveDraft(wizardState)) {
      alert('Please capture Lock Photo (Step 1) before saving. You can complete other steps later.');
      return;
    }
    try {
      const formData = buildRecordFormData(wizardState);
      let result;
      if (isEditing && effectiveId) {
        result = await dispatch(updateRecord({ id: effectiveId, formData }));
      } else {
        result = await dispatch(createRecord(formData));
      }
      if (result.meta.requestStatus === 'fulfilled') {
        setIsSuccess(true);
      } else {
        alert(result.payload || 'Save failed');
      }
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  };

  const handleSubmit = async () => {
    if (!canSaveDraft(wizardState)) {
      alert('Lock Photo is required to save.');
      return;
    }
    try {
      const formData = buildRecordFormData(wizardState);
      let result;
      if (isEditing && effectiveId) {
        result = await dispatch(updateRecord({ id: effectiveId, formData }));
      } else {
        result = await dispatch(createRecord(formData));
      }
      if (result.meta.requestStatus === 'fulfilled') {
        setIsSuccess(true);
      }
    } catch (e) {
      console.error('Failed to submit record:', e);
    }
  };

  const handlePersonFile = (idx, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Only images allowed'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) dispatch(setPersonPhoto({ index: idx, photoData: e.target.result, timestamp: new Date().toISOString() }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetFromSuccess = () => {
    dispatch(resetWizard());
    setIsSuccess(false);
    if (isEditing) navigate('/history');
  };

  // Step Slide Framer Motion Animation Settings
  const variants = {
    enter: (dir) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (dir) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  if (isSuccess) {
    return <SuccessAnimation onReset={handleResetFromSuccess} />;
  }

  // Render Step specific input panels
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PhotoUploadStep
            key="lock"
            title="Lock Photo"
            description="Capture or upload a clear, high-resolution photo of the physical lock itself."
            photoKey="lockPhoto"
          />
        );

      case 1:
        const keyCountFields = (
          <div className="space-y-3.5 max-w-sm">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              <Hash className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span>Number of Keys handed over *</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(setKeyCount(Math.max(1, (parseInt(wizardState.keyCount) || 1) - 1)))}
                className="h-12 w-12 bg-primary-100 hover:bg-primary-200 dark:bg-primary-950/80 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm active:scale-90"
                aria-label="Decrease key count"
              >
                <Minus className="h-5 w-5" />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  value={wizardState.keyCount}
                  onChange={(e) => dispatch(setKeyCount(e.target.value))}
                  onBlur={() => {
                    if (wizardState.keyCount === '' || wizardState.keyCount < 1) {
                      dispatch(setKeyCount(1));
                    }
                  }}
                  className="w-full text-center py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => dispatch(setKeyCount((parseInt(wizardState.keyCount) || 1) + 1))}
                className="h-12 w-12 bg-primary-100 hover:bg-primary-200 dark:bg-primary-950/80 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm active:scale-90"
                aria-label="Increase key count"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        );

        return (
          <PhotoUploadStep
            key="key"
            title="Key Photo + Count"
            description="Capture or upload a photo showing the key(s) laid flat, and log the quantity below."
            photoKey="keyPhoto"
            extraFields={keyCountFields}
          />
        );

      case 2:
        const locationInlineFields = (
          <div className="space-y-4">
            {locations && locations.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span>Or Pick from Existing Directory Locations ({locations.length})</span>
                  </span>
                  {wizardState.savedLocationId && (
                    <button
                      type="button"
                      onClick={() => dispatch(clearSavedLocation())}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold px-2 py-1 bg-red-50 dark:bg-red-950/40 rounded-lg"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {locations.map((loc) => {
                    const isSelected = wizardState.savedLocationId === loc._id;
                    return (
                      <div
                        key={loc._id}
                        onClick={() => dispatch(selectSavedLocation(loc))}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
                        }`}
                      >
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400 relative">
                          {loc.photo?.url ? (
                            <>
                              <img src={loc.photo.url} alt={loc.label || 'Location'} className="h-full w-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                              <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800" style={{display:'none'}}><MapPin className="h-5 w-5 text-teal-500" /></div>
                            </>
                          ) : (
                            <MapPin className="h-5 w-5 text-teal-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {loc.label || 'Saved Location'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Saved location
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

        return (
          <PhotoUploadStep
            key="placement"
            title="Lock Placement Location"
            description="Capture or upload a photo showing where the lock is installed, or select a saved location below."
            photoKey="placementPhoto"
            extraFields={locationInlineFields}
            browseAction={{
              label: wizardState.savedLocationId ? `Reusing saved location ✓` : 'Browse Existing Location',
              icon: <MapPin className="h-4.5 w-4.5" />,
              onClick: () => setShowLocationBrowse(true),
            }}
          />
        );

      case 3: {
        const keyCountNum = parseInt(wizardState.keyCount) || 1;
        const handoverPersons = wizardState.handoverPersons || [];
        const personsForUI = handoverPersons.length === keyCountNum ? handoverPersons : Array.from({length: keyCountNum}, (_,i)=> handoverPersons[i] || {name:'', role:'', contact:'', personId:null, photo:null, status:'active', photoIsReused:false});
        const getFilteredForIdx = (idx) => {
          const name = personsForUI[idx]?.name || '';
          if (!name) return persons;
          const search = name.toLowerCase();
          return persons.filter(p => p.name?.toLowerCase().includes(search) || p.role?.toLowerCase().includes(search) || p.contactNumber?.includes(search));
        };
        return (
          <div key="handover" className="space-y-5">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl">Handover Verification — {keyCountNum} {keyCountNum===1?'Person':'Persons'}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each key’s receiver must have their <strong>own photo</strong> and status. You can save after Step 1 (Lock) and complete others later.</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <AlertCircle className="h-4 w-4" /> Per-key status enum: <span className="font-mono">active / inactive / returned / lost</span> — change anytime from history.
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/30 px-3 py-2 rounded-xl border border-primary-100 dark:border-primary-900/30">
              <Users className="h-4 w-4" />
              <span>Keys: {keyCountNum} — Fill details for {keyCountNum} {keyCountNum===1?'person':'persons'} below (each key's receiver)</span>
              <button type="button" onClick={()=> { setActivePersonIdx(0); setShowPersonBrowse(true); }} className="ml-auto text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"><Users className="h-3 w-3"/> Browse</button>
            </div>
            {personsForUI.map((person, idx) => {
              const filteredForIdx = getFilteredForIdx(idx);
              const isSelected = !!person.personId;
              const personPhoto = person.photo;
              const statusVal = person.status || 'active';
              return (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="h-6 w-6 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">{idx+1}</span>
                      Person {idx+1} {keyCountNum>1 && <span className="normal-case font-semibold text-slate-400">— Key {idx+1}</span>}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusVal==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200': statusVal==='inactive'?'bg-slate-100 text-slate-600 border-slate-200': statusVal==='returned'?'bg-blue-50 text-blue-700 border-blue-200':'bg-red-50 text-red-700 border-red-200'}`}>{statusVal}</span>
                    </h4>
                    {isSelected ? (
                      <button type="button" onClick={()=> dispatch(clearSavedPerson({index: idx}))} className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/40">Clear</button>
                    ) : (
                      <button type="button" onClick={()=> { setActivePersonIdx(idx); setShowPersonBrowse(true); }} className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"><Users className="h-3 w-3"/> Browse</button>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <Users className="h-3.5 w-3.5" /> Reusing: <strong>{person.name}</strong> ({person.role||'No role'})
                    </div>
                  )}
                  {/* Per-person Photo Uploader */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      <Camera className="h-3.5 w-3.5 text-primary-600" />
                      <span>Person {idx+1} Photo * — individual verification image</span>
                      {person.photoIsReused && <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Reused ✓ no upload</span>}
                    </label>
                    {!personPhoto ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button type="button" onClick={() => setCameraPersonIdx(idx)} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-tr from-primary-600 to-amber-500 text-white font-bold py-2.5 px-3 rounded-xl text-sm shadow"><Camera className="h-4 w-4"/> Open Camera</button>
                        <button type="button" onClick={() => personFileRefs.current[idx]?.click()} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-sm"><Upload className="h-4 w-4"/> Browse File</button>
                        <input ref={el => personFileRefs.current[idx]=el} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handlePersonFile(idx,f); e.target.value=''; }} />
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group w-full max-w-sm mx-auto">
                        <img src={personPhoto} alt={`Person ${idx+1}`} className="w-full aspect-video object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={()=> setCameraPersonIdx(idx)} className="p-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur rounded-lg"><Camera className="h-4 w-4"/></button>
                          <button type="button" onClick={()=> dispatch(removePersonPhoto({index: idx}))} className="p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-lg"><Trash2 className="h-4 w-4"/></button>
                        </div>
                        {person.photoIsReused && <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Reused</div>}
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <button type="button" onClick={()=> dispatch(removePersonPhoto({index: idx}))} className="text-[11px] bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border font-semibold">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        <User className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Full Name *</span>
                      </label>
                      <input type="text" placeholder={`Person ${idx+1} name`} value={person.name} onChange={(e) => dispatch(setHandoverDetails({ name: e.target.value, index: idx }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        <Landmark className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Designation *</span>
                      </label>
                      <input type="text" placeholder="e.g. Security Supervisor" value={person.role} onChange={(e) => dispatch(setHandoverDetails({ role: e.target.value, index: idx }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        <Contact className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Contact (Optional)</span>
                      </label>
                      <input type="tel" placeholder="e.g. +1 555-0199" value={person.contact} onChange={(e) => dispatch(setHandoverDetails({ contact: e.target.value, index: idx }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Key Status *</span>
                      </label>
                      <select value={statusVal} onChange={(e)=> dispatch(setPersonStatus({index: idx, status: e.target.value}))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="returned">Returned</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                  {/* Inline quick select */}
                  {persons && persons.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"><Users className="h-3 w-3 text-primary-500" /> Select Existing ({filteredForIdx.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {filteredForIdx.slice(0,6).map((p)=>{
                          const sel = person.personId === p._id;
                          return (
                            <div key={p._id} onClick={()=> dispatch(selectSavedPerson({person: p, index: idx}))} className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between gap-2 ${sel ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 relative">
                                  {p.photo?.url ? (
                                    <>
                                      <img src={p.photo.url} alt={p.name} className="h-full w-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                                      <div className="hidden absolute inset-0 items-center justify-center bg-white dark:bg-slate-900" style={{display:'none'}}><User className="h-4 w-4 text-slate-400"/></div>
                                    </>
                                  ) : <User className="h-4 w-4 text-slate-400"/>}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{p.role || 'No role'}{p.contactNumber ? ` • ${p.contactNumber}` : ''}</p>
                                </div>
                              </div>
                              {sel ? <span className="text-xs font-bold text-primary-600">✓</span> : <span className="text-xs font-semibold text-slate-400">Use</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Per-person camera overlay */}
            {cameraPersonIdx !== null && (
              <div className="fixed inset-0 z-50">
                <CameraCapture label={`Person ${cameraPersonIdx+1} Photo`} onCapture={(base64)=>{ dispatch(setPersonPhoto({ index: cameraPersonIdx, photoData: base64, timestamp: new Date().toISOString() })); setCameraPersonIdx(null); }} onClose={()=> setCameraPersonIdx(null)} />
              </div>
            )}
          </div>
        );
        }

      case 4:
        return (
          <ReviewSubmit
            key="review"
            onSubmit={handleSubmit}
            isSubmitting={isLoading || updatingLoading}
            isEditing={isEditing}
          />
        );

      default:
        return null;
    }
  };

  const isCurrentStepValid = validateStep(currentStep, wizardState);

  const handleSelectPerson = (person) => dispatch(selectSavedPerson({ person, index: activePersonIdx }));
  const handleSelectLocation = (loc) => dispatch(selectSavedLocation(loc));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Upper Wizard Banner */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border mb-2 ${isEditing ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-900/30'}`}>
            <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} /> {isEditing ? 'Editing Existing Record' : 'Handover Logger'}
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {isEditing ? 'Continue Handover — Update Remaining Steps' : 'Document Handover Event'}
          </h1>
          {isEditing && <p className="text-xs text-slate-500 mt-1">You saved lock earlier. Fill Key / Placement / Per-person photos now and hit Update. Draft already visible in History.</p>}
        </div>
        
        {/* Step Indicator Sub-component */}
        <div className="w-full md:w-2/3">
          <StepIndicator currentStep={currentStep} />
        </div>
      </div>

      {createError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
          <AlertCircle className="h-4 w-4" /> {createError}
        </div>
      )}

      {/* Main step container with transitions */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-md min-h-[420px] flex flex-col justify-between">
        <div className="overflow-hidden flex-1 relative flex flex-col">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex-1 flex flex-col justify-between"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <BrowsePersonModal open={showPersonBrowse} onClose={() => setShowPersonBrowse(false)} onSelect={handleSelectPerson} />
        <BrowseLocationModal open={showLocationBrowse} onClose={() => setShowLocationBrowse(false)} onSelect={handleSelectLocation} />

        {/* Wizard Footer Controls */}
        {(currentStep < 4 || true) && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1.5 font-bold text-sm px-5 py-3 rounded-xl transition-all ${
                  currentStep === 0
                    ? 'text-slate-350 dark:text-slate-650 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              {/* Save Draft / Update — allowed from any step if at least lock exists */}
              <button
                onClick={handleSaveDraft}
                disabled={!canSaveDraft(wizardState) || isLoading || updatingLoading}
                title={!canSaveDraft(wizardState) ? 'Add Lock Photo first (Step 1) to save' : isEditing ? 'Update record with current steps' : 'Save now and complete remaining steps later from History'}
                className={`flex items-center gap-1.5 font-bold text-sm px-5 py-3 rounded-xl border transition-all active:scale-95 ${
                  canSaveDraft(wizardState)
                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {(isLoading || updatingLoading) ? <span className="h-4 w-4 border-2 border-t-transparent border-emerald-600 rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{isEditing ? 'Update Record — Save Progress' : `Save ${currentStep===0 ? 'Lock' : 'Draft'} — Complete Later`}</span>
              </button>
            </div>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!isCurrentStepValid}
                className={`flex items-center gap-1.5 font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 ${
                  isCurrentStepValid
                    ? 'bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-650 text-white shadow-primary-500/10'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="text-xs text-slate-400">Review → Submit to Vault</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

