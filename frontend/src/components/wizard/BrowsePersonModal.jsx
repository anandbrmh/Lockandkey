import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSavedPersons, selectDirectory } from '../../features/directory/directorySlice';
import { Search, Users, X, Check, User, Briefcase, Phone, Clock, Image as ImageIcon, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrowsePersonModal({ open, onClose, onSelect }) {
  const dispatch = useDispatch();
  const { persons, loadingPersons } = useSelector(selectDirectory);
  const currentUser = useSelector((s) => s.auth?.user);
  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) dispatch(fetchSavedPersons({ search: '', limit: 50, verified: isAdmin ? true : undefined }));
  }, [open, dispatch, isAdmin]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchSavedPersons({ search, limit: 50, verified: isAdmin ? true : undefined }));
  };

  // Admin sees only verified staff linked to this admin — backend strictly filters by linkedAdmin; client is defensive fallback
  const adminIdStr = (currentUser?._id || currentUser?.id || '').toString();
  const displayPersons = isAdmin
    ? persons.filter(p => {
        if (!p.adminCodeVerified) return false;
        // If backend provided linkedAdminId/linkedAdmin, enforce strict match
        const linkedId = p.linkedAdminId?.toString() || (p.linkedAdmin?._id ? p.linkedAdmin._id.toString() : (typeof p.linkedAdmin === 'string' ? p.linkedAdmin : ''));
        if (linkedId) return linkedId === adminIdStr;
        // No linkedAdmin info yet (backend not restarted) — trust backend's already-filtered result
        return true;
      })
    : persons;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-lg sm:max-w-2xl max-h-[92dvh] sm:max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-3xl rounded-b-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 sm:h-9 sm:w-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0"><Users className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white leading-tight">Select Staff Member (Handover)</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{isAdmin ? 'Verified staff only — admin can handover only to verified staff' : 'Choose an onboarded staff member for key handover'}</p>
              {isAdmin && <p className="text-[10px] sm:text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-1 inline-block max-w-full truncate">Verified staff filter active</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0 touch-manipulation"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSearch} className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, department, phone..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
            />
          </div>
          <button type="submit" className="shrink-0 px-3 sm:px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold touch-manipulation">Search</button>
        </form>

        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50 overscroll-contain">
          {loadingPersons ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading staff directory...</div>
          ) : displayPersons.length === 0 ? (
            <div className="py-10 text-center px-4">
              <ImageIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{isAdmin ? 'No verified staff found' : 'No staff members found'}</p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{isAdmin ? 'Only staff who submitted your 4-digit admin code appear here. Ask staff to verify via Staff Onboarding.' : 'Onboard staff via staff onboarding to appear here.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {displayPersons.map((p) => {
                const imgUrl = p.photo?.url || null;
                const isSubAdmin = !!(p.isSubAdmin || p.userRole === 'subadmin' || p.user?.role === 'subadmin');
                return (
                  <button
                    key={p._id}
                    onClick={() => { onSelect(p); onClose(); }}
                    className="text-left p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md active:scale-[0.98] transition-all group flex gap-2 sm:gap-3 min-w-0 touch-manipulation"
                  >
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative">
                      {imgUrl ? (
                        <>
                          <img src={imgUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                          <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400" style={{display:'none'}}><User className="h-6 w-6" /></div>
                        </>
                      ) : <div className="h-full w-full flex items-center justify-center text-slate-400"><User className="h-5 w-5 sm:h-6 sm:w-6" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1 flex-wrap">
                        <span className="truncate">{p.name}</span>
                        {isSubAdmin ? <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0" title="Sub-admin" /> : <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded-full shrink-0">Staff</span>}
                        {isSubAdmin && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">Sub-admin</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.designation || p.role || p.department || 'Staff'}</span>
                      </p>
                      {p.department && (
                        <p className="text-[11px] text-slate-400 truncate">{p.department}</p>
                      )}
                      {(p.contactNumber || p.phone) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.contactNumber || p.phone}</span>
                        </p>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-primary-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{isAdmin ? 'Admin: only verified staff can be selected for handover.' : 'Select a staff member to auto-fill their profile & handover photo.'}</p>
        </div>
      </motion.div>
    </div>
  );
}
