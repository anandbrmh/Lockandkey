import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyAssignedRecords, fetchMyAssignedStats, selectRecordsState } from '../features/records/recordsSlice';
import { selectCurrentUser } from '../features/auth/authSlice';
import { filterHandoverPersonsForDisplay } from '../utils/validators';
import { KeyRound, MapPin, Search, Key, Clock, User, Users, PlusCircle, ShieldCheck, LayoutDashboard, FilePlus, Edit3, Calendar, AlertCircle, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LockKeyUploadWizard from '../components/wizard/LockKeyUploadWizard';

export default function StaffDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const { myAssigned = [], myAssignedStats, myAssignedLoading, error } = useSelector(selectRecordsState);
  const isSubAdmin = currentUser?.role === 'subadmin';
  const isStaff = currentUser?.role === 'staff';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLock, setSelectedLock] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (isStaff || isSubAdmin) {
      dispatch(fetchMyAssignedRecords({ page: 1, limit: 100 }));
      dispatch(fetchMyAssignedStats());
    }
  }, [dispatch, isStaff, isSubAdmin]);

  const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);

  const filtered = myAssigned.filter(rec => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const loc = rec.location?.lat != null ? `${rec.location.lat}, ${rec.location.lng}` : '';
    const names = (rec.handoverPersons || []).map(p => p.name || '').join(' ');
    return String(rec._id || rec.id).toLowerCase().includes(q) || loc.toLowerCase().includes(q) || names.toLowerCase().includes(q);
  });

  // derive totals for display from stats or fallback compute
  const totalLocks = myAssignedStats?.totalAssignedLocks ?? myAssigned.length;
  const totalKeys = myAssignedStats?.totalAssignedKeys ?? myAssigned.reduce((s, r) => {
    const kc = parseInt(r.keyCount, 10) || 1;
    return s + kc;
  }, 0);
  // also compute actually assigned keysGiven sum for this staff specifically? Use stats active/inactive?
  // We'll show both: total locks + total keys assigned to this staff (from stats totalAssignedKeys)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="wire-card p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border border-zinc-900 rounded-lg flex items-center justify-center bg-zinc-900 text-white shrink-0">
            {isSubAdmin ? <ShieldCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">{isSubAdmin ? 'Subadmin dashboard' : 'Staff dashboard'}</p>
            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              {isSubAdmin ? 'Lock & Record Dashboard' : 'My Locks & Keys'} 
              <span className="text-xs font-mono font-normal text-zinc-500">· {currentUser?.name} ({currentUser?.role})</span>
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              {isSubAdmin ? 'View all keys/locks assigned to you + submit new Lock & Key records with all fields.' : 'All locks and keys currently associated with you via handover records.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono bg-zinc-50">{totalLocks} Locks</span>
          <span className="border border-zinc-900 rounded-md px-3 py-1.5 text-xs font-mono bg-zinc-900 text-white">{totalKeys} Keys assigned</span>
          {isSubAdmin && (
            <button onClick={() => setShowWizard(v => !v)} className="wire-btn wire-btn-primary text-xs">
              {showWizard ? <><X className="h-3.5 w-3.5" /> Hide form</> : <><FilePlus className="h-3.5 w-3.5" /> New Lock & Key Record</>}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="wire-card p-4 bg-white">
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 flex items-center gap-1"><Lock className="h-3 w-3" /> Total locks</p>
          <p className="text-2xl font-bold font-mono mt-1">{totalLocks}</p>
          <p className="text-xs font-mono text-zinc-500">assigned to you</p>
        </div>
        <div className="wire-card p-4 bg-zinc-900 text-white">
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-400 flex items-center gap-1"><Key className="h-3 w-3" /> Total keys</p>
          <p className="text-2xl font-bold font-mono mt-1">{totalKeys}</p>
          <p className="text-xs font-mono text-zinc-300">{myAssignedStats ? 'keysGiven sum' : 'keyCount sum'}</p>
        </div>
        <div className="wire-card p-4 bg-white">
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Active</p>
          <p className="text-2xl font-bold font-mono mt-1 text-emerald-600">{myAssignedStats?.active ?? '—'}</p>
          <p className="text-xs font-mono text-zinc-500">active locks</p>
        </div>
        <div className="wire-card p-4 bg-white">
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Returned / Lost</p>
          <p className="text-lg font-bold font-mono mt-1">{myAssignedStats ? `${myAssignedStats.returned} / ${myAssignedStats.lost}` : '—'}</p>
          <p className="text-xs font-mono text-zinc-500">returned vs lost</p>
        </div>
      </div>

      {/* Subadmin: Lock & Record submission dashboard */}
      {isSubAdmin && showWizard && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="wire-card p-4 sm:p-6 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Lock & Record Submission — All Fields</h2>
            <span className="text-[11px] font-mono text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 bg-zinc-50">Subadmin can submit: lockPhoto, keyPhoto, placementPhoto, keyCount, handover persons (photos, status, keysGiven), location</span>
          </div>
          <p className="text-xs font-mono text-zinc-500">Fill all required steps and submit. The wizard below supports every field — lock, key + count, placement, and per-person handover details. You can also <button onClick={() => navigate('/wizard')} className="underline font-mono text-zinc-900">open full-page wizard →</button></p>
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50/50">
            <LockKeyUploadWizard />
          </div>
        </motion.div>
      )}

      {isSubAdmin && !showWizard && (
        <div className="wire-card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <FilePlus className="h-4 w-4 text-zinc-900" /> Subadmin quick actions:
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowWizard(true)} className="wire-btn wire-btn-primary text-xs"><PlusCircle className="h-3.5 w-3.5" /> Submit new record (all fields)</button>
            <button onClick={() => navigate('/wizard')} className="wire-btn text-xs"><Edit3 className="h-3.5 w-3.5" /> Open full wizard</button>
            <button onClick={() => navigate('/locks-directory')} className="wire-btn text-xs"><KeyRound className="h-3.5 w-3.5" /> All locks directory</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <input type="text" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search your locks by ID, location, or staff name..." className="wire-input pr-9" />
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {/* Locks grid */}
      {myAssignedLoading ? (
        <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading your locks & keys...</div>
      ) : filtered.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <KeyRound className="h-10 w-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No locks assigned yet</p>
          <p className="text-xs font-mono text-zinc-500 mt-1">When an admin hands over keys to you, those locks will appear here with photos, key counts, and location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((rec) => {
            const id = rec._id || rec.id;
            const lockImg = pickUrl(rec.lockPhoto);
            const keyImg = pickUrl(rec.keyPhoto);
            const placeImg = pickUrl(rec.placementPhoto);
            const keyCountNum = parseInt(rec.keyCount, 10) || 1;
            const rawPersons = Array.isArray(rec.handoverPersons) ? rec.handoverPersons : [];
            const handoverPersons = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);
            const locationLabel = rec.location?.lat != null ? `Location (${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'Placement Location';
            const totalAllocated = handoverPersons.reduce((s,p)=> s + (parseInt(p.keysGiven,10)||1),0);
            // Find this user's person entry for highlight
            const myPerson = handoverPersons.find(p => {
              const nameMatch = (p.name||'').trim().toLowerCase() === (currentUser?.name||'').trim().toLowerCase();
              return nameMatch;
            });
            const myKeys = myPerson ? myPerson.keysGiven : null;
            return (
              <div key={id} onClick={()=>setSelectedLock(rec)} className="wire-card p-4 hover:border-zinc-900 cursor-pointer transition-all flex flex-col justify-between group bg-white">
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
                    {lockImg ? <img src={lockImg} alt="Lock" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <KeyRound className="h-8 w-8 text-zinc-400" />}
                    <span className="absolute top-2 right-2 bg-zinc-900 text-white text-xs font-mono font-semibold px-2 py-1 rounded shadow">{keyCountNum} key{keyCountNum>1?'s':''}</span>
                    <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-zinc-900 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200">#{String(id).slice(0,8)}</span>
                    {myKeys && <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5 rounded">You: {myKeys} key{myKeys>1?'s':''}</span>}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold truncate flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> {locationLabel}</h3>
                    <p className="text-xs font-mono text-zinc-500 mt-1 flex items-center justify-between">
                      <span>{handoverPersons.length} handover{handoverPersons.length!==1?'s':''}</span>
                      <span className="border rounded px-1.5 py-0.5 text-[11px] bg-zinc-50">{totalAllocated}/{keyCountNum} keys</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 border border-zinc-100 rounded p-1.5 bg-zinc-50/50">
                      <p className="text-[10px] font-mono text-zinc-500">Lock</p>
                      <div className="h-12 border border-zinc-200 rounded bg-white overflow-hidden flex items-center justify-center mt-1">
                        {lockImg ? <img src={lockImg} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">—</span>}
                      </div>
                    </div>
                    <div className="flex-1 border border-zinc-100 rounded p-1.5 bg-zinc-50/50">
                      <p className="text-[10px] font-mono text-zinc-500">Key</p>
                      <div className="h-12 border border-zinc-200 rounded bg-white overflow-hidden flex items-center justify-center mt-1">
                        {keyImg ? <img src={keyImg} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">—</span>}
                      </div>
                    </div>
                    <div className="flex-1 border border-zinc-100 rounded p-1.5 bg-zinc-50/50">
                      <p className="text-[10px] font-mono text-zinc-500">Placement</p>
                      <div className="h-12 border border-zinc-200 rounded bg-white overflow-hidden flex items-center justify-center mt-1">
                        {placeImg ? <img src={placeImg} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">—</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-zinc-900">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(rec.createdAt).toLocaleDateString()}</span>
                  <span>View Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lock Details Modal — same as LocksDirectory but reused here */}
      <AnimatePresence>
        {selectedLock && (() => {
          const rec = selectedLock;
          const id = rec._id || rec.id;
          const lockImg = pickUrl(rec.lockPhoto);
          const keyImg = pickUrl(rec.keyPhoto);
          const placeImg = pickUrl(rec.placementPhoto);
          const keyCountNum = parseInt(rec.keyCount, 10) || 1;
          const rawPersons = Array.isArray(rec.handoverPersons) ? rec.handoverPersons : [];
          const handoverPersons = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);
          const locationLabel = rec.location?.lat != null ? `Location (${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'Placement Location';
          const totalAllocated = handoverPersons.reduce((s,p)=> s + (parseInt(p.keysGiven,10)||1),0);
          const canEdit = isSubAdmin;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={()=>setSelectedLock(null)} />
              <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.96 }} className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 border border-zinc-900 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0"><KeyRound className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">Lock Details <span className="text-xs font-mono font-normal text-zinc-500">#{String(id).slice(0,10)}</span></h3>
                      <p className="text-xs font-mono text-zinc-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {locationLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && <button onClick={()=>{ setSelectedLock(null); navigate(`/wizard/edit/${id}`); }} className="wire-btn wire-btn-primary !py-1.5 text-xs"><Edit3 className="h-3.5 w-3.5" /> Edit</button>}
                    <button onClick={()=>setSelectedLock(null)} className="h-8 w-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-100"><X className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
                  <div className="wire-card p-4 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-4">
                    <div><p className="text-xs font-mono text-zinc-400 uppercase tracking-wide">Number of Keys</p><p className="text-2xl font-bold font-mono mt-0.5">{keyCountNum} <span className="text-xs font-normal text-zinc-300">Total</span></p></div>
                    <div className="flex gap-2 text-xs font-mono"><span className="border border-zinc-700 bg-zinc-800 rounded px-2.5 py-1">Forms: {handoverPersons.length}</span><span className="border border-zinc-700 bg-zinc-800 rounded px-2.5 py-1">Allocated: {totalAllocated} / {keyCountNum}</span></div>
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-2">Photos Gallery</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><span className="text-xs font-mono text-zinc-600 font-medium">1. Lock Photo</span><div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">{lockImg ? <img src={lockImg} alt="Lock" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no photo</span>}</div></div>
                      <div className="space-y-1"><span className="text-xs font-mono text-zinc-600 font-medium">2. Key Photo</span><div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">{keyImg ? <img src={keyImg} alt="Key" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no photo</span>}</div></div>
                      <div className="space-y-1"><span className="text-xs font-mono text-zinc-600 font-medium">3. Placement Photo</span><div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">{placeImg ? <img src={placeImg} alt="Placement" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no photo</span>}</div></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-1"><Users className="h-3.5 w-3.5 text-zinc-900" /> Handover & Keys ({handoverPersons.length})</h4>
                    {handoverPersons.length===0 ? <div className="border border-dashed border-zinc-200 rounded-lg p-6 text-center text-xs font-mono text-zinc-500">No handover details.</div> : (
                      <div className="space-y-3">
                        {handoverPersons.map((p, idx)=>{
                          const personPhoto = pickUrl(p.photo);
                          const isMe = (p.name||'').trim().toLowerCase() === (currentUser?.name||'').trim().toLowerCase();
                          return (
                            <div key={idx} className={`wire-card p-4 space-y-3 bg-white ${isMe ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 flex items-center justify-center">{personPhoto ? <img src={personPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-zinc-400" />}</div>
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1">{p.name || `Person ${idx+1}`} {isMe && <span className="text-[10px] font-mono bg-emerald-600 text-white px-1.5 py-0.5 rounded">You</span>}</p>
                                    <p className="text-xs font-mono text-zinc-500">{p.role || 'Staff'} {p.contactNumber ? `· ${p.contactNumber}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="border border-zinc-900 bg-zinc-900 text-white rounded px-2.5 py-1 font-semibold">{p.keysGiven || 1} key{(p.keysGiven||1)>1?'s':''}</span>
                                  <span className="border border-zinc-200 rounded px-2 py-1 bg-zinc-50 capitalize">{p.status || 'active'}</span>
                                </div>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
                                <div className="border border-zinc-100 rounded p-2 bg-zinc-50/50 space-y-1"><span className="text-[11px] text-zinc-500 flex items-center gap-1"><MapPin className="h-3 w-3 text-zinc-400" /> Location</span><p className="font-medium text-zinc-800">{locationLabel}</p></div>
                                <div className="border border-zinc-100 rounded p-2 bg-zinc-50/50 space-y-1"><span className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3 text-zinc-400" /> Handover Date</span><p className="font-medium text-zinc-800">{p.photo?.uploadedAt ? new Date(p.photo.uploadedAt).toLocaleString() : new Date(rec.createdAt).toLocaleString()}</p></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500">Created: {new Date(rec.createdAt).toLocaleDateString()}</span>
                  <button onClick={()=>setSelectedLock(null)} className="wire-btn text-xs">Close</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
