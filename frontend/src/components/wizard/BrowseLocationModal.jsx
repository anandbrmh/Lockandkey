import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSavedLocations, selectDirectory } from '../../features/directory/directorySlice';
import { Search, MapPin, X, Check, Image as ImageIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrowseLocationModal({ open, onClose, onSelect }) {
  const dispatch = useDispatch();
  const { locations, loadingLocations } = useSelector(selectDirectory);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) dispatch(fetchSavedLocations({ search: '', limit: 20 }));
  }, [open, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchSavedLocations({ search, limit: 20 }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white"><MapPin className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Browse Existing Location</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reuse placement photo to save ImageKit upload</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSearch} className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search label..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold">Search</button>
        </form>

        <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50">
          {loadingLocations ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="py-10 text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No saved locations found</p>
              <p className="text-xs text-slate-400 mt-1">Capture from camera or browse files as usual — it will be saved.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations.map((loc) => (
                <button
                  key={loc._id}
                  onClick={() => { onSelect(loc); onClose(); }}
                  className="text-left p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all group flex gap-3"
                >
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative">
                    {loc.photo?.url ? (
                      <>
                        <img src={loc.photo.url} alt={loc.label || 'location'} className="h-full w-full object-cover group-hover:scale-105 transition-transform" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                        <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400" style={{display:'none'}}><MapPin className="h-6 w-6" /></div>
                      </>
                    ) : <div className="h-full w-full flex items-center justify-center text-slate-400"><MapPin className="h-6 w-6" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{loc.label || 'Unlabeled Location'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Saved location</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />used {loc.usageCount}× · {new Date(loc.lastUsedAt).toLocaleDateString()}</p>
                  </div>
                  <Check className="h-4 w-4 text-teal-600 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">If location not found, close and upload as usual.</p>
        </div>
      </motion.div>
    </div>
  );
}
