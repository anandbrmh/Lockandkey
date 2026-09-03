import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchRecords, selectRecordsState } from '../features/records/recordsSlice';
import { filterHandoverPersonsForDisplay } from '../utils/validators';
import { KeyRound, Search, MapPin, Calendar, Clock, User, Users, Pencil, X, Check, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LocksDirectoryPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { records = [], loading, error } = useSelector(selectRecordsState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLock, setSelectedLock] = useState(null);

  useEffect(() => {
    dispatch(fetchRecords({ page: 1, limit: 100 }));
  }, [dispatch]);

  const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);

  const filteredRecords = records.filter(rec => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const locLabel = rec.savedLocationLabel || (rec.location?.lat != null ? `${rec.location.lat}, ${rec.location.lng}` : '');
    const persons = rec.handoverPersons || [];
    const personNames = persons.map(p => p.name || '').join(' ');
    const singleName = rec.handoverPersons?.[0]?.name || '';

    return (
      String(rec._id || rec.id).toLowerCase().includes(q) ||
      locLabel.toLowerCase().includes(q) ||
      personNames.toLowerCase().includes(q) ||
      singleName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="wire-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border border-zinc-900 rounded-lg flex items-center justify-center bg-zinc-900 text-white shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Locks Directory</h1>
            <p className="text-xs font-mono text-zinc-500">List of all locks, key counts, and associated handover locations & staff.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono bg-zinc-50">{records.length} Total Locks</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by lock ID, placement location, or staff name..."
          className="wire-input pr-9"
        />
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Locks Grid */}
      {loading ? (
        <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading locks directory...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <KeyRound className="h-10 w-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No lock records found</p>
          <p className="text-xs font-mono text-zinc-500 mt-1">Create a new handover to add locks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const id = rec._id || rec.id;
            const lockImg = pickUrl(rec.lockPhoto);
            const keyImg = pickUrl(rec.keyPhoto);
            const placeImg = pickUrl(rec.placementPhoto);
            const keyCountNum = parseInt(rec.keyCount, 10) || 1;
            const rawPersons = Array.isArray(rec.handoverPersons) && rec.handoverPersons.length > 0
              ? rec.handoverPersons
              : [];
            const handoverPersons = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);

            const locationLabel = rec.savedLocationLabel || (rec.location?.lat != null ? `Location (${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'Placement Location');
            const totalAllocated = handoverPersons.reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);

            return (
              <div
                key={id}
                onClick={() => setSelectedLock(rec)}
                className="wire-card p-4 hover:border-zinc-900 cursor-pointer transition-all flex flex-col justify-between group bg-white"
              >
                <div className="space-y-3">
                  {/* Card Top: Lock photo + Key badge */}
                  <div className="relative aspect-video rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
                    {lockImg ? (
                      <img src={lockImg} alt="Lock" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <KeyRound className="h-8 w-8 text-zinc-400" />
                    )}
                    <span className="absolute top-2 right-2 bg-zinc-900 text-white text-xs font-mono font-semibold px-2 py-1 rounded shadow">
                      {keyCountNum} key{keyCountNum > 1 ? 's' : ''} total
                    </span>
                    <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-zinc-900 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-200">
                      #{String(id).slice(0, 8)}
                    </span>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="text-sm font-semibold truncate flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> {locationLabel}
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 mt-1 flex items-center justify-between">
                      <span>{handoverPersons.length} staff handover{handoverPersons.length !== 1 ? 's' : ''}</span>
                      <span className="border rounded px-1.5 py-0.5 text-[11px] bg-zinc-50">{totalAllocated}/{keyCountNum} keys</span>
                    </p>
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

      {/* Lock Details Modal */}
      <AnimatePresence>
        {selectedLock && (() => {
          const rec = selectedLock;
          const id = rec._id || rec.id;
          const lockImg = pickUrl(rec.lockPhoto);
          const keyImg = pickUrl(rec.keyPhoto);
          const placeImg = pickUrl(rec.placementPhoto);
          const keyCountNum = parseInt(rec.keyCount, 10) || 1;
          const rawPersons = Array.isArray(rec.handoverPersons) && rec.handoverPersons.length > 0
            ? rec.handoverPersons
            : [];
          const handoverPersons = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);

          const locationLabel = rec.savedLocationLabel || (rec.location?.lat != null ? `Location (${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'Placement Location');
          const totalAllocated = handoverPersons.reduce((s, p) => s + (parseInt(p.keysGiven, 10) || 1), 0);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setSelectedLock(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 border border-zinc-900 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                        Lock Details <span className="text-xs font-mono font-normal text-zinc-500">#{String(id).slice(0, 10)}</span>
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {locationLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedLock(null); navigate(`/wizard/edit/${id}`); }} className="wire-btn wire-btn-primary !py-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Edit Record
                    </button>
                    <button onClick={() => setSelectedLock(null)} className="h-8 w-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
                  {/* Summary Banner */}
                  <div className="wire-card p-4 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-zinc-400 uppercase tracking-wide">Number of Keys</p>
                      <p className="text-2xl font-bold font-mono mt-0.5">{keyCountNum} <span className="text-xs font-normal text-zinc-300">Total keys available</span></p>
                    </div>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="border border-zinc-700 bg-zinc-800 rounded px-2.5 py-1">Forms: {handoverPersons.length}</span>
                      <span className="border border-zinc-700 bg-zinc-800 rounded px-2.5 py-1">Allocated: {totalAllocated} / {keyCountNum}</span>
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-2">Photos Gallery</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-zinc-600 font-medium">1. Lock Photo</span>
                        <div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">
                          {lockImg ? <img src={lockImg} alt="Lock" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no lock photo</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-zinc-600 font-medium">2. Key Photo</span>
                        <div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">
                          {keyImg ? <img src={keyImg} alt="Key" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no key photo</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-zinc-600 font-medium">3. Placement Photo</span>
                        <div className="aspect-video border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center">
                          {placeImg ? <img src={placeImg} alt="Placement" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no placement photo</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Handover Staff & Locations */}
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-zinc-900" /> Handover History & Associated Staff ({handoverPersons.length})
                    </h4>

                    {handoverPersons.length === 0 ? (
                      <div className="border border-dashed border-zinc-200 rounded-lg p-6 text-center text-xs font-mono text-zinc-500">
                        No handover details entered yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {handoverPersons.map((p, idx) => {
                          const personPhoto = pickUrl(p.photo);
                          return (
                            <div key={idx} className="wire-card p-4 space-y-3 bg-white">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 flex items-center justify-center">
                                    {personPhoto ? <img src={personPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-zinc-400" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900">{p.name || `Person ${idx + 1}`}</p>
                                    <p className="text-xs font-mono text-zinc-500">{p.role || 'Staff'} {p.contactNumber || p.contact ? `· ${p.contactNumber || p.contact}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="border border-zinc-900 bg-zinc-900 text-white rounded px-2.5 py-1 font-semibold">
                                    {p.keysGiven || 1} key{(p.keysGiven || 1) > 1 ? 's' : ''} assigned
                                  </span>
                                  <span className="border border-zinc-200 rounded px-2 py-1 bg-zinc-50 capitalize">
                                    {p.status || 'active'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
                                <div className="border border-zinc-100 rounded p-2 bg-zinc-50/50 space-y-1">
                                  <span className="text-[11px] text-zinc-500 flex items-center gap-1"><MapPin className="h-3 w-3 text-zinc-400" /> Associated Location</span>
                                  <p className="font-medium text-zinc-800">{locationLabel}</p>
                                </div>
                                <div className="border border-zinc-100 rounded p-2 bg-zinc-50/50 space-y-1">
                                  <span className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3 text-zinc-400" /> Handover Date</span>
                                  <p className="font-medium text-zinc-800">{rec.handoverPersons?.[0]?.photo?.uploadedAt ? new Date(rec.handoverPersons[0].photo.uploadedAt).toLocaleString() : new Date(rec.createdAt).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500">Record Created: {new Date(rec.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => setSelectedLock(null)} className="wire-btn text-xs">Close</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
