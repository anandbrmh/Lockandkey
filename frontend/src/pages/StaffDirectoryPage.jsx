import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSavedPersons, selectDirectory } from '../features/directory/directorySlice';
import { Users, Search, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffDirectoryPage() {
  const dispatch = useDispatch();
  const { persons = [], loadingPersons } = useSelector(selectDirectory);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    dispatch(fetchSavedPersons({ limit: 100 }));
  }, [dispatch]);

  const filteredStaff = persons.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(q);
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
            <h1 className="text-lg font-semibold tracking-tight">Staff Directory</h1>
            <p className="text-xs font-mono text-zinc-500">Browse staff members.</p>
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
          placeholder="Search by name..."
          className="wire-input pr-9"
        />
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
      </div>

      {/* Staff Grid - only photo and name */}
      {loadingPersons ? (
        <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading staff directory...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <User className="h-10 w-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No staff members found</p>
          <p className="text-xs font-mono text-zinc-500 mt-1">Staff profiles with uploaded photos appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredStaff.map((staff) => {
            const imgUrl = staff.photo?.url || null;
            return (
              <div
                key={staff._id}
                onClick={() => setSelectedStaff(staff)}
                className="wire-card p-4 hover:border-zinc-900 cursor-pointer transition-all bg-white flex flex-col items-center text-center gap-3 group"
              >
                <div className="h-24 w-24 rounded-full border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt={staff.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <User className="h-10 w-10 text-zinc-400" />
                  )}
                </div>
                <h3 className="text-sm font-semibold truncate w-full">{staff.name}</h3>
              </div>
            );
          })}
        </div>
      )}

      {/* Minimal modal - only photo and name */}
      <AnimatePresence>
        {selectedStaff && (() => {
          const imgUrl = selectedStaff.photo?.url || null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setSelectedStaff(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
              >
                <div className="p-6 flex flex-col items-center gap-4">
                  <div className="h-32 w-32 rounded-full border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {imgUrl ? <img src={imgUrl} alt={selectedStaff.name} className="h-full w-full object-cover" /> : <User className="h-12 w-12 text-zinc-400" />}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 text-center">{selectedStaff.name}</h3>
                </div>
                <div className="p-3 border-t border-zinc-200 bg-zinc-50 text-right">
                  <button onClick={() => setSelectedStaff(null)} className="wire-btn text-xs inline-flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
