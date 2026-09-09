import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAssignedUsers, createAssignedUser, selectAssignedUsers } from '../../features/assignedUsers/assignedUsersSlice';
import { Search, Users, X, Check, User, Phone, AlertCircle, Plus, Camera, Upload, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CameraCapture from './CameraCapture';

export default function BrowsePersonModal({ open, onClose, onSelect }) {
  const dispatch = useDispatch();
  const { users, loading, creating, error } = useSelector(selectAssignedUsers);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [localErr, setLocalErr] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) dispatch(fetchAssignedUsers({ search: '', limit: 100 }));
  }, [open, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchAssignedUsers({ search, limit: 100 }));
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreateAndSelect = async (e) => {
    e.preventDefault();
    setLocalErr(null);
    if (!name.trim() || !phone.trim()) { setLocalErr('Name and phone required'); return; }
    const result = await dispatch(createAssignedUser({ name: name.trim(), phone: phone.trim(), photoFile }));
    if (result.meta.requestStatus === 'fulfilled') {
      const created = result.payload;
      onSelect({
        _id: created._id,
        name: created.name,
        phone: created.phone,
        contactNumber: created.phone,
        role: 'Assignee',
        photo: created.photo || null,
      });
      setName(''); setPhone(''); setPhotoFile(null); setPhotoPreview(null);
      onClose();
    } else {
      setLocalErr(result.payload || 'Create failed');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-3xl shadow-xl border border-slate-200 flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0"><Users className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base">Select User (Handover)</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Browse your assigned users — check whom you want to assign. If not found, create new one with name, phone & photo then upload.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSearch} className="p-3 sm:p-4 border-b border-slate-100 flex gap-2">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-w-0" />
          </div>
          <button type="submit" className="shrink-0 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold">Search</button>
        </form>

        {/* Inline create with camera/file */}
        <form onSubmit={handleCreateAndSelect} className="p-3 sm:p-4 bg-amber-50/40 border-b border-slate-100 space-y-3">
          <p className="text-xs font-mono font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Create new user</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name *" className="wire-input py-2.5" maxLength={60} />
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone *" className="wire-input py-2.5" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono text-zinc-600 flex items-center gap-1"><Camera className="h-3 w-3" /> Photo (Camera / File)</p>
            {!photoPreview ? (
              <div className="flex gap-2">
                <button type="button" onClick={()=>setShowCamera(true)} className="flex-1 wire-btn wire-btn-primary text-xs py-2"><Camera className="h-3.5 w-3.5" /> Camera</button>
                <button type="button" onClick={()=>fileRef.current?.click()} className="flex-1 wire-btn text-xs py-2"><Upload className="h-3.5 w-3.5" /> Browse file</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }} />
              </div>
            ) : (
              <div className="relative w-28 h-20 border rounded-lg overflow-hidden bg-zinc-50">
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={()=>{setPhotoFile(null); setPhotoPreview(null);}} className="absolute top-1 right-1 h-6 w-6 bg-white border rounded flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}
          </div>
          <button type="submit" disabled={creating} className="w-full wire-btn wire-btn-primary text-xs py-2.5">{creating ? 'Creating...' : 'Create & Select'}</button>
          {(localErr || error) && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {localErr || error}</p>}
          <p className="text-[11px] font-mono text-zinc-500">If user not in list, fill name, phone + optional photo then Create & Select — then just upload.</p>
        </form>
        {showCamera && <div className="fixed inset-0 z-50"><CameraCapture label="Assigned user" onCapture={(b)=>{ setPhotoPreview(b); fetch(b).then(r=>r.blob()).then(blob=> setPhotoFile(new File([blob], `assigned-${Date.now()}.jpg`, {type:'image/jpeg'}))); setShowCamera(false); }} onClose={()=>setShowCamera(false)} /></div>}

        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 bg-slate-50 overscroll-contain">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center px-4">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No assigned users yet</p>
              <p className="text-xs text-slate-400 mt-1">Create one above using name, phone & photo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const img = u.photo?.url || null;
                return (
                  <button
                    key={u._id}
                    onClick={() => { onSelect({ _id: u._id, name: u.name, phone: u.phone, contactNumber: u.phone, role: 'Assignee', photo: u.photo }); onClose(); }}
                    className="text-left p-3 rounded-2xl bg-white border border-slate-200 hover:border-zinc-900 hover:shadow-md active:scale-[0.98] transition-all flex gap-3 min-w-0"
                  >
                    <div className="h-12 w-12 rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0">{img ? <img src={img} alt={u.name} className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-zinc-500" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><Phone className="h-3 w-3" /> {u.phone}</p>
                    </div>
                    <Check className="h-4 w-4 text-zinc-900 opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-3 bg-white border-t text-center">
          <p className="text-[11px] text-slate-500">Browse → check user → select. If missing → create new → upload.</p>
        </div>
      </motion.div>
    </div>
  );
}
