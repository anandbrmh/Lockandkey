import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchSavedPersons, selectDirectory } from '../features/directory/directorySlice';
import { fetchRecords, selectRecordsState } from '../features/records/recordsSlice';
import { filterHandoverPersonsForDisplay } from '../utils/validators';
import { Users, Search, Key, User, Briefcase, Phone, Mail, Clock, MapPin, X, ChevronRight, ShieldCheck, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffDirectoryPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { persons = [], loadingPersons } = useSelector(selectDirectory);
  const { records = [], loading: loadingRecords } = useSelector(selectRecordsState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    dispatch(fetchSavedPersons({ limit: 100 }));
    dispatch(fetchRecords({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Aggregate keys assigned to each staff member across all records
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

  const filteredStaff = persons.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.role || p.designation || '').toLowerCase().includes(q) ||
      (p.department || '').toLowerCase().includes(q) ||
      (p.contactNumber || p.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="wire-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border border-zinc-900 rounded-lg flex items-center justify-center bg-zinc-900 text-white shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Staff Directory & Key Assignments</h1>
            <p className="text-xs font-mono text-zinc-500">View staff members and keys currently assigned to them.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono bg-zinc-50">{persons.length} Staff members</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search staff by name, designation, department..."
          className="wire-input pr-9"
        />
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
      </div>

      {/* Staff Grid */}
      {loadingPersons || loadingRecords ? (
        <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading staff directory...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <User className="h-10 w-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No staff members found</p>
          <p className="text-xs font-mono text-zinc-500 mt-1">Staff profiles with uploaded photos appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const assignedRecs = getStaffAssignedRecords(staff);
            const totalKeysAssigned = assignedRecs.reduce((sum, r) => sum + r.keysGiven, 0);
            const imgUrl = staff.photo?.url || staff.imageUrl || null;

            return (
              <div
                key={staff._id}
                onClick={() => setSelectedStaff(staff)}
                className="wire-card p-4 hover:border-zinc-900 cursor-pointer transition-all flex flex-col justify-between group bg-white"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 relative flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt={staff.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <User className="h-8 w-8 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold truncate group-hover:text-zinc-900">{staff.name}</h3>
                      </div>
                      <p className="text-xs font-mono text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" /> {staff.designation || staff.role || 'Staff'}
                      </p>
                      {staff.department && (
                        <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">{staff.department}</p>
                      )}
                      {(staff.phone || staff.contactNumber) && (
                        <p className="text-[11px] font-mono text-zinc-500 truncate flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-zinc-400" /> {staff.phone || staff.contactNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Key Assignment Badge */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1 text-zinc-600">
                      <Key className="h-3.5 w-3.5 text-zinc-900" /> Assigned:
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${totalKeysAssigned > 0 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                      {totalKeysAssigned} key{totalKeysAssigned !== 1 ? 's' : ''} ({assignedRecs.length} lock{assignedRecs.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] font-mono text-zinc-400 flex items-center justify-between group-hover:text-zinc-900">
                  <span>Click to view details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Key Details Modal */}
      <AnimatePresence>
        {selectedStaff && (() => {
          const assignedRecs = getStaffAssignedRecords(selectedStaff);
          const totalKeysAssigned = assignedRecs.reduce((sum, r) => sum + r.keysGiven, 0);
          const imgUrl = selectedStaff.photo?.url || selectedStaff.imageUrl || null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setSelectedStaff(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border border-zinc-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? <img src={imgUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-zinc-400" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">{selectedStaff.name}</h3>
                      <p className="text-xs font-mono text-zinc-500">{selectedStaff.designation || selectedStaff.role || 'Staff'} {selectedStaff.department ? `· ${selectedStaff.department}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStaff(null)} className="h-8 w-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
                  {/* Summary Box */}
                  <div className="wire-card p-4 bg-zinc-900 text-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-zinc-400 uppercase tracking-wide">Total Keys Assigned</p>
                      <p className="text-2xl font-bold font-mono mt-1">{totalKeysAssigned} <span className="text-xs font-normal text-zinc-300">key{totalKeysAssigned !== 1 ? 's' : ''} total</span></p>
                    </div>
                    <div className="text-right font-mono text-xs text-zinc-300">
                      <p>{assignedRecs.length} Lock record{assignedRecs.length !== 1 ? 's' : ''}</p>
                      {(selectedStaff.phone || selectedStaff.contactNumber) && <p className="mt-1 flex items-center justify-end gap-1"><Phone className="h-3 w-3" /> {selectedStaff.phone || selectedStaff.contactNumber}</p>}
                    </div>
                  </div>

                  {/* Assigned Locks List */}
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

                            {/* Photos */}
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

                            {/* Location & Time info */}
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

                {/* Footer */}
                <div className="p-3 border-t border-zinc-200 bg-zinc-50 text-right">
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
