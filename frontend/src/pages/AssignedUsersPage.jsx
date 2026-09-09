import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAssignedUsers, createAssignedUser, deleteAssignedUser, fetchAssignedUserRecords, selectAssignedUsers } from '../features/assignedUsers/assignedUsersSlice';
import { Users, Search, User, Plus, Phone, Trash2, KeyRound, MapPin, Clock, X, AlertCircle, Image as ImageIcon, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraCapture from '../components/wizard/CameraCapture';

export default function AssignedUsersPage() {
  const dispatch = useDispatch();
  const { users, pagination, loading, creating, error, selectedRecords, recordsLoading } = useSelector(selectAssignedUsers);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { dispatch(fetchAssignedUsers({ search: '', limit: 100 })); }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchAssignedUsers({ search: query, limit: 100 }));
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim() || !phone.trim()) { setLocalError('Name and phone required'); return; }
    const result = await dispatch(createAssignedUser({ name: name.trim(), phone: phone.trim(), photoFile }));
    if (result.meta.requestStatus === 'fulfilled') { setName(''); setPhone(''); setPhotoFile(null); setPhotoPreview(null); }
    else setLocalError(result.payload);
  };

  const openUser = async (u) => {
    setSelected(u);
    dispatch(fetchAssignedUserRecords(u._id));
  };

  const filtered = users;
  const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="wire-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Users className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">Users <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{pagination.total}</span></h1>
            <p className="text-xs text-zinc-500">Admin's assigned users — name + phone + photo. Click a user to view all associated keys & locks.</p>
          </div>
        </div>
        <span className="border border-zinc-200 rounded-full px-3 py-1.5 text-xs font-medium bg-zinc-50 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> {users.length} users</span>
      </div>

      {/* Create new assigned user with camera/file */}
      <form onSubmit={handleCreate} className="wire-card p-4 bg-white space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create assigned user</h2>
        <p className="text-xs font-mono text-zinc-500">Fill name, phone & photo (camera or file) — or browse existing in wizard.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="wire-label flex items-center gap-1"><User className="h-3 w-3" /> Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" className="wire-input mt-1" required maxLength={60} />
          </div>
          <div>
            <label className="wire-label flex items-center gap-1"><Phone className="h-3 w-3" /> Phone *</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9876543210" className="wire-input mt-1" required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="wire-label flex items-center gap-1"><Camera className="h-3 w-3" /> Photo (Camera / File) <span className="text-[11px] font-mono text-zinc-500">optional</span></label>
          {!photoPreview ? (
            <div className="flex gap-2">
              <button type="button" onClick={()=>setShowCamera(true)} className="flex-1 wire-btn wire-btn-primary text-xs"><Camera className="h-3.5 w-3.5" /> Camera</button>
              <button type="button" onClick={()=>fileRef.current?.click()} className="flex-1 wire-btn text-xs"><Upload className="h-3.5 w-3.5" /> Browse file</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }} />
            </div>
          ) : (
            <div className="relative w-32 h-20 border rounded-lg overflow-hidden bg-zinc-50">
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={()=>{setPhotoFile(null); setPhotoPreview(null);}} className="absolute top-1 right-1 h-6 w-6 bg-white border rounded flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
            </div>
          )}
        </div>
        <button disabled={creating} className="wire-btn wire-btn-primary w-full sm:w-auto">{creating ? 'Creating...' : 'Create user & just upload'}</button>
        {(localError || error) && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {localError || error}</p>}
      </form>
      {showCamera && <div className="fixed inset-0 z-50"><CameraCapture label="User photo" onCapture={(b)=>{ setPhotoPreview(b); fetch(b).then(r=>r.blob()).then(blob=> setPhotoFile(new File([blob], `assigned-${Date.now()}.jpg`, {type:'image/jpeg'}))); setShowCamera(false); }} onClose={()=>setShowCamera(false)} /></div>}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or phone..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm" />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-mono">Search</button>
      </form>

      {loading ? <div className="wire-card p-10 text-center text-sm font-mono text-zinc-500">Loading users...</div> : filtered.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <User className="h-10 w-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No assigned users yet</p>
          <p className="text-xs font-mono text-zinc-500">Create users above — they will appear here and be selectable in wizard Browse.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => {
            const img = u.photo?.url || null;
            return (
            <div key={u._id} onClick={()=>openUser(u)} className="wire-card p-4 bg-white hover:border-zinc-900 cursor-pointer transition-all flex flex-col gap-3 group">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center shrink-0">{img ? <img src={img} alt={u.name} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-zinc-400" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  <p className="text-xs font-mono text-zinc-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-zinc-100">
                <span className="text-zinc-500">Click to view locks</span>
                <button onClick={(e)=>{e.stopPropagation(); if(confirm(`Delete ${u.name}?`)) dispatch(deleteAssignedUser(u._id));}} className="border border-red-200 text-red-600 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* User records modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={()=>setSelected(null)} />
            <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}} className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-900 text-white overflow-hidden flex items-center justify-center">{selected.photo?.url ? <img src={selected.photo.url} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5" />}</div>
                  <div>
                    <h3 className="text-base font-bold">{selected.name}</h3>
                    <p className="text-xs font-mono text-zinc-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {selected.phone}</p>
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} className="h-8 w-8 rounded-md border bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-zinc-50">
                {recordsLoading ? <div className="py-10 text-center text-sm font-mono text-zinc-500">Loading associated locks...</div> : !selectedRecords || selectedRecords.length===0 ? (
                  <div className="border border-dashed rounded-lg p-8 text-center bg-white">
                    <KeyRound className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                    <p className="text-sm font-medium">No keys/locks assigned yet</p>
                    <p className="text-xs font-mono text-zinc-500">Assign this user in wizard — then locks will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-zinc-500">{selectedRecords.length} lock(s) associated</p>
                    {selectedRecords.map(rec=>{
                      const id = rec._id || rec.id;
                      const lockImg = pickUrl(rec.lockPhoto);
                      const keyImg = pickUrl(rec.keyPhoto);
                      const placeImg = pickUrl(rec.placementPhoto);
                      const keyCountNum = parseInt(rec.keyCount,10)||1;
                      const persons = Array.isArray(rec.handoverPersons)?rec.handoverPersons:[];
                      const myPerson = persons.find(p=> String(p.personId)===String(selected._id) || (p.contactNumber && p.contactNumber===selected.phone) || (p.name && p.name.toLowerCase()===selected.name.toLowerCase()));
                      return (
                        <div key={id} className="wire-card p-3 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold">Lock #{String(id).slice(0,8)}</span>
                            <span className="text-xs font-mono border bg-zinc-900 text-white rounded px-2 py-0.5">{myPerson?.keysGiven||keyCountNum} key(s) assigned</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[{label:'Lock',url:lockImg},{label:'Key',url:keyImg},{label:'Placement',url:placeImg}].map(s=>(
                              <div key={s.label} className="space-y-1"><span className="text-[11px] font-mono text-zinc-500">{s.label}</span><div className="aspect-video border rounded bg-zinc-50 overflow-hidden flex items-center justify-center">{s.url? <img src={s.url} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="h-4 w-4 text-zinc-300"/>}</div></div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs font-mono text-zinc-500 pt-1 border-t border-zinc-100">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {rec.location?.lat!=null? `(${rec.location.lat.toFixed(2)}, ${rec.location.lng.toFixed(2)})` : 'No location'}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(rec.createdAt).toLocaleDateString()}</span>
                          </div>
                          {myPerson && <div className="text-xs font-mono bg-zinc-900 text-white rounded px-2 py-1 inline-flex">Handover: {myPerson.name} · {myPerson.contactNumber} · {myPerson.status}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t bg-white text-right"><button onClick={()=>setSelected(null)} className="wire-btn text-xs">Close</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
