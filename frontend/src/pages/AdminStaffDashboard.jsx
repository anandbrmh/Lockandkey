import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVerifiedStaff, promoteStaff, selectStaff } from '../features/staff/staffSlice';
import { fetchRecords, selectRecordsState } from '../features/records/recordsSlice';
import { filterHandoverPersonsForDisplay } from '../utils/validators';
import { Shield, Users, Check, AlertCircle, Crown, User, BadgeCheck, Search, Key, Briefcase, Phone, MapPin, X, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminStaffDashboard() {
  const dispatch = useDispatch();
  const { verifiedStaff, loading, error, promoting } = useSelector(selectStaff);
  const { records = [], loading: loadingRecords } = useSelector(selectRecordsState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => { dispatch(fetchVerifiedStaff()); }, [dispatch]);
  useEffect(() => { dispatch(fetchRecords({ page: 1, limit: 100 })); }, [dispatch]);

  const handlePromote = async (staff, toRole) => {
    await dispatch(promoteStaff({ staffId: staff._id, role: toRole }));
    dispatch(fetchVerifiedStaff());
  };

  // Same logic as StaffDirectoryPage: aggregate keys assigned to each staff member across all records
  const getStaffAssignedRecords = (staff) => {
    const staffId = staff._id || staff.staffId;
    const staffNameLower = (staff.name || '').trim().toLowerCase();
    const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);

    return records.map(rec => {
      const keyCountNum = parseInt(rec.keyCount, 10) || 1;
      const rawPersons = Array.isArray(rec.handoverPersons) ? rec.handoverPersons : [];
      const pList = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);

      const matchedPerson = pList.find(p => {
        if (p.personId && staffId && String(p.personId) === String(staffId)) return true;
        if (p.name && staffNameLower && p.name.trim().toLowerCase() === staffNameLower) return true;
        return false;
      });

      if (!matchedPerson) return null;

      return {
        recordId: rec._id || rec.id,
        lockPhoto: pickUrl(rec.lockPhoto),
        keyPhoto: pickUrl(rec.keyPhoto),
        placementPhoto: pickUrl(rec.placementPhoto),
        handoverPhoto: pickUrl(matchedPerson.photo),
        keysGiven: matchedPerson.keysGiven,
        status: matchedPerson.status || rec.status || 'active',
        handoverAt: matchedPerson.photo?.uploadedAt || rec.createdAt,
        locationLabel: rec.location?.lat != null ? `(${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'Placement Location',
        keyCount: keyCountNum,
      };
    }).filter(Boolean);
  };

  const filteredVerifiedStaff = verifiedStaff.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.designation || s.roleTitle || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="wire-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Admin staff dashboard</p>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Verified Staff <span className="text-xs font-mono text-zinc-500">({verifiedStaff.length})</span></h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">Only staff who submitted your 4-digit admin code appear here. You can promote them to subadmin. Click a staff card to view all locks & keys assigned to them (same as Staff Directory).</p>
  
        </div>
        <span className="border border-zinc-200 rounded px-2 py-1 text-xs font-mono bg-zinc-50">{verifiedStaff.length} verified</span>
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="relative max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search verified staff by name, designation, department..."
          className="wire-input pr-9"
        />
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
      </div>

      {loading || loadingRecords ? (
        <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading…</div>
      ) : filteredVerifiedStaff.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <Users className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No verified staff yet</p>
          <p className="text-xs font-mono text-zinc-500">Staff must submit your admin code via Staff Onboarding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVerifiedStaff.map((s) => {
            const imgUrl = s.photo?.url || null;
            const isSub = s.user?.role === 'subadmin';
            const assignedRecs = getStaffAssignedRecords(s);
            const totalKeysAssigned = assignedRecs.reduce((sum, r) => sum + r.keysGiven, 0);
            return (
              <div key={s._id} className="wire-card p-4 space-y-3 bg-white hover:border-zinc-900 transition-all flex flex-col justify-between group">
                <div onClick={() => setSelectedStaff(s)} className="space-y-3 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center shrink-0">
                      {imgUrl ? <img src={imgUrl} alt={s.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <User className="h-6 w-6 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">{s.name} {isSub && <BadgeCheck className="h-4 w-4 text-blue-600 fill-blue-600 text-white" title="Sub-admin" />} {isSub && <Crown className="h-3.5 w-3.5 text-amber-600" />}</p>
                      <p className="text-xs font-mono text-zinc-500 truncate">{s.email}</p>
                      <p className="text-[11px] font-mono text-zinc-400 truncate flex items-center gap-1"><Briefcase className="h-3 w-3" />{s.designation || s.roleTitle || s.department || 'Staff'} · {s.user?.role} {isSub && <BadgeCheck className="h-3 w-3 text-blue-600" />}</p>
                      <p className="text-[11px] font-mono text-zinc-500 flex items-center gap-1"><Shield className="h-3 w-3" /> code: {s.verifiedAdminCode || '—'} {s.adminCodeVerified && <Check className="h-3 w-3 text-emerald-600" />}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1 text-zinc-600"><Key className="h-3.5 w-3.5 text-zinc-900" /> Assigned:</span>
                    <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${totalKeysAssigned > 0 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                      {totalKeysAssigned} key{totalKeysAssigned !== 1 ? 's' : ''} ({assignedRecs.length} lock{assignedRecs.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between group-hover:text-zinc-900">
                    <span>Click to view locks</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  {!isSub ? (
                    <button disabled={promoting} onClick={()=>handlePromote(s,'subadmin')} className="flex-1 wire-btn wire-btn-primary text-xs"><Crown className="h-3.5 w-3.5" /> Make subadmin</button>
                  ) : (
                    <button disabled={promoting} onClick={()=>handlePromote(s,'staff')} className="flex-1 wire-btn text-xs">Revoke subadmin</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Key Details Modal — same as StaffDirectoryPage */}
      <AnimatePresence>
        {selectedStaff && (() => {
          const assignedRecs = getStaffAssignedRecords(selectedStaff);
          const totalKeysAssigned = assignedRecs.reduce((sum, r) => sum + r.keysGiven, 0);
          const imgUrl = selectedStaff.photo?.url || null;
          const isSubAdminModal = !!(selectedStaff.user?.role === 'subadmin');

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setSelectedStaff(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border border-zinc-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? <img src={imgUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-zinc-400" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1">{selectedStaff.name} {isSubAdminModal && <BadgeCheck className="h-5 w-5 text-blue-600 fill-blue-600 text-white" title="Sub-admin verified" />}</h3>
                      <p className="text-xs font-mono text-zinc-500">{selectedStaff.designation || selectedStaff.roleTitle || 'Staff'} {selectedStaff.department ? `· ${selectedStaff.department}` : ''} {isSubAdminModal && <span className="text-blue-600 font-semibold">• subadmin</span>}</p>
                      <p className="text-[11px] font-mono text-zinc-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedStaff.phone || selectedStaff.email} {selectedStaff.adminCodeVerified && <span className="ml-1 inline-flex items-center gap-1 text-emerald-700"><Check className="h-3 w-3" /> verified</span>}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStaff(null)} className="h-8 w-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
                  <div className="wire-card p-4 bg-zinc-900 text-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-zinc-400 uppercase tracking-wide">Total Keys Assigned</p>
                      <p className="text-2xl font-bold font-mono mt-1">{totalKeysAssigned} <span className="text-xs font-normal text-zinc-300">key{totalKeysAssigned !== 1 ? 's' : ''} total</span></p>
                    </div>
                    <div className="text-right font-mono text-xs text-zinc-300">
                      <p>{assignedRecs.length} Lock record{assignedRecs.length !== 1 ? 's' : ''}</p>
                      {(selectedStaff.phone) && <p className="mt-1 flex items-center justify-end gap-1"><Phone className="h-3 w-3" /> {selectedStaff.phone}</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-zinc-900" /> Assigned Locks & Handover History ({assignedRecs.length})
                    </h4>

                    {assignedRecs.length === 0 ? (
                      <div className="border border-dashed border-zinc-200 rounded-lg p-6 text-center text-xs font-mono text-zinc-500">
                        No keys currently assigned to this staff member.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedRecs.map((item, idx) => (
                          <div key={idx} className="wire-card p-3 space-y-3 bg-white">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-semibold flex items-center gap-1">
                                Lock #{item.recordId.slice(0, 8)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="border border-zinc-900 bg-zinc-900 text-white rounded px-2 py-0.5 text-xs font-mono">
                                  {item.keysGiven} key{item.keysGiven > 1 ? 's' : ''} assigned
                                </span>
                                <span className="border border-zinc-200 rounded px-2 py-0.5 text-xs font-mono capitalize">
                                  {item.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-zinc-500">Lock Photo</span>
                                <div className="aspect-video border border-zinc-200 rounded bg-zinc-50 overflow-hidden flex items-center justify-center">
                                  {item.lockPhoto ? <img src={item.lockPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">no lock photo</span>}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-zinc-500">Placement Photo</span>
                                <div className="aspect-video border border-zinc-200 rounded bg-zinc-50 overflow-hidden flex items-center justify-center">
                                  {item.placementPhoto ? <img src={item.placementPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">no placement photo</span>}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-zinc-500">Handover Photo</span>
                                <div className="aspect-video border border-zinc-200 rounded bg-zinc-50 overflow-hidden flex items-center justify-center">
                                  {item.handoverPhoto ? <img src={item.handoverPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">no handover photo</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-100">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-zinc-400" /> {item.locationLabel}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-zinc-400" /> {new Date(item.handoverAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
                  <span className="text-[11px] font-mono text-zinc-500">Verified staff · Blue tick = subadmin</span>
                  <button onClick={() => setSelectedStaff(null)} className="wire-btn text-xs">Close</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
