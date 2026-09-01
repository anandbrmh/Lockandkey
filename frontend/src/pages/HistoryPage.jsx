import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchRecords, deleteRecord, updateRecord, updateHandoverPhoto, updatePlacementPhoto, selectRecordsState } from '../features/records/recordsSlice';
import { selectCurrentUser } from '../features/auth/authSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { gsap } from 'gsap';
import {
  Calendar, Search, Key, FileSpreadsheet, ChevronDown, ChevronUp, Clock, Briefcase, Trash2, AlertCircle, Filter, RefreshCw, ImagePlus, Timer, Pencil, Save, X, User, Users, Phone, Hash,
} from 'lucide-react';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { const d = new Date(iso); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; } catch { return String(iso); }
};

const normalizeRecord = (rec) => {
  const id = rec._id || rec.id;
  const createdAt = rec.createdAt;
  const keyCount = rec.keyCount ?? 1;
  const handoverName = rec.handoverPerson?.name || rec.handoverName || (Array.isArray(rec.handoverPersons) && rec.handoverPersons[0]?.name) || 'Unknown';
  const handoverRole = rec.handoverPerson?.role || rec.handoverRole || (Array.isArray(rec.handoverPersons) && rec.handoverPersons[0]?.role) || '';
  const handoverContact = rec.handoverPerson?.contactNumber || rec.handoverContact || (Array.isArray(rec.handoverPersons) && rec.handoverPersons[0]?.contactNumber) || '';
  const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);
  const pickUploadedAt = (v) => (typeof v === 'object' ? v?.uploadedAt || null : null);
  const lockPhoto = pickUrl(rec.lockPhoto);
  const keyPhoto = pickUrl(rec.keyPhoto);
  const placementPhoto = pickUrl(rec.placementPhoto);
  const handoverPhoto = pickUrl(rec.handoverPhoto);
  const placementAt = rec.placementAt || pickUploadedAt(rec.placementPhoto) || null;
  const handoverAt = rec.handoverAt || pickUploadedAt(rec.handoverPhoto) || createdAt;
  const location = rec.location || null;
  const status = rec.status || 'active';
  const handoverPersons = Array.isArray(rec.handoverPersons) ? rec.handoverPersons.map(p=>({
    name: p.name || '', role: p.role || '', contactNumber: p.contactNumber || p.contact || '', personId: p.personId || null, status: p.status || 'active', photo: pickUrl(p.photo), photoFileId: p.photo?.fileId || null,
  })) : [];
  return { ...rec, id, _id: id, createdAt, keyCount, handoverName, handoverRole, handoverContact, lockPhoto, keyPhoto, placementPhoto, handoverPhoto, location, status, handoverAt, placementAt, handoverPersons };
};

export default function HistoryPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { records: rawRecords, loading, error, pagination } = useSelector(selectRecordsState);
  const currentUser = useSelector(selectCurrentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ handoverName: '', handoverRole: '', handoverContact: '', keyCount: 1, status: 'active' });
  const containerRef = useRef(null);
  const handoverInputRef = useRef(null);
  const placementInputRef = useRef(null);
  const personPhotoInputRef = useRef(null);
  const [targetId, setTargetId] = useState(null);
  const [targetPerson, setTargetPerson] = useState(null);

  useEffect(() => { dispatch(fetchRecords({ page: 1, limit: 50 })); }, [dispatch]);
  useEffect(() => {
    const t = setTimeout(() => {
      const params = { page: 1, limit: 50 };
      if (searchTerm) params.handoverName = searchTerm;
      if (statusFilter) params.status = statusFilter;
      dispatch(fetchRecords(params));
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, dispatch]);

  useEffect(() => {
    if (!loading && rawRecords.length > 0 && containerRef.current) {
      const items = containerRef.current.querySelectorAll('.record-card');
      gsap.fromTo(items, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05 });
    }
  }, [rawRecords, loading]);

  const records = rawRecords.map(normalizeRecord);
  const handleDelete = async (id) => {
    if (!confirm('Delete this record? [ WIREFRAME — soft-delete ]')) return;
    const result = await dispatch(deleteRecord(id));
    if (result.meta.requestStatus === 'fulfilled') dispatch(fetchRecords({ page: 1, limit: 50, handoverName: searchTerm || undefined, status: statusFilter || undefined }));
  };
  const triggerHandoverChange = (id) => { setTargetId(id); handoverInputRef.current?.click(); };
  const triggerPlacementChange = (id) => { setTargetId(id); placementInputRef.current?.click(); };
  const triggerPersonPhotoChange = (id, idx) => { setTargetPerson({ id, idx }); personPhotoInputRef.current?.click(); };
  const onHandoverFile = async (e) => {
    const file = e.target.files?.[0]; if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) { alert('Only images allowed — [ WIREFRAME ]'); e.target.value=''; return; }
    setUpdatingId(targetId);
    const result = await dispatch(updateHandoverPhoto({ id: targetId, file }));
    setUpdatingId(null); e.target.value='';
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const onPlacementFile = async (e) => {
    const file = e.target.files?.[0]; if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) { alert('Only images'); e.target.value=''; return; }
    setUpdatingId(targetId);
    const result = await dispatch(updatePlacementPhoto({ id: targetId, file }));
    setUpdatingId(null); e.target.value='';
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const onPersonPhotoFile = async (e) => {
    const file = e.target.files?.[0]; if (!file || !targetPerson) return;
    if (!file.type.startsWith('image/')) { alert('Only images'); e.target.value=''; return; }
    setUpdatingId(targetPerson.id);
    const fd = new FormData(); fd.append(`personPhoto_${targetPerson.idx}`, file);
    const result = await dispatch(updateRecord({ id: targetPerson.id, formData: fd }));
    setUpdatingId(null); e.target.value=''; setTargetPerson(null);
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const handlePersonStatusChange = async (rec, idx, newStatus) => {
    const allowed = ["active","inactive","returned","lost"]; if (!allowed.includes(newStatus)) return;
    setUpdatingId(rec.id);
    const updatedPersons = (rec.handoverPersons || []).map((p,i)=> i===idx ? { ...p, status: newStatus } : p);
    const fd = new FormData();
    fd.append('handoverPersons', JSON.stringify(updatedPersons.map(p=>({ name: p.name, role: p.role, contact: p.contactNumber, contactNumber: p.contactNumber, personId: p.personId, status: p.status, photo: p.photo ? {url: p.photo} : undefined }))));
    const result = await dispatch(updateRecord({ id: rec.id, formData: fd }));
    setUpdatingId(null);
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Status update failed');
  };
  const startEditDetails = (rec) => {
    setEditingId(rec.id);
    setEditForm({ handoverName: rec.handoverName || '', handoverRole: rec.handoverRole || '', handoverContact: rec.handoverContact || '', keyCount: rec.keyCount || 1, status: rec.status || 'active' });
  };
  const cancelEditDetails = () => { setEditingId(null); };
  const saveEditDetails = async (id) => {
    if (!editForm.handoverName.trim() || !editForm.handoverRole.trim()) { alert('Name and Role required — [ WIREFRAME ]'); return; }
    if (Number(editForm.keyCount) < 1) { alert('keyCount >=1'); return; }
    setUpdatingId(id);
    const payload = { handoverName: editForm.handoverName.trim(), handoverRole: editForm.handoverRole.trim(), handoverContact: editForm.handoverContact.trim(), keyCount: Number(editForm.keyCount), status: editForm.status };
    const result = await dispatch(updateRecord({ id, formData: payload }));
    setUpdatingId(null);
    if (result.meta.requestStatus === 'fulfilled') setEditingId(null); else alert(result.payload || 'Update failed');
  };
  const toggleExpand = (id) => setExpandedRecord(expandedRecord === id ? null : id);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <input ref={handoverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onHandoverFile} />
      <input ref={placementInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPlacementFile} />
      <input ref={personPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPersonPhotoFile} />

      {/* Header wireframe */}
      <div className="wire-card p-5 bg-white relative">
        <span className="wire-annotation">HISTORY 03</span>
        <div className="wire-tape hidden sm:block" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Vault Audit Log <span className="font-mono text-[11px] border-2 border-ink px-2 py-0.5 ml-2">WIREFRAME</span></h1>
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-zinc-500">[ RECORDS — GRID 24px — DRAFT ]</p>
            {pagination && <p className="font-mono text-[10px] text-zinc-500 mt-1">TOTAL: {pagination.total} • PAGE {pagination.page}/{pagination.pages} — BLUEPRINT</p>}
          </div>
          <button onClick={() => dispatch(fetchRecords({ page: 1, limit: 50, handoverName: searchTerm || undefined, status: statusFilter || undefined }))} className="wire-btn">
            <FileSpreadsheet className="h-4 w-4" /> [ Refresh ]
          </button>
        </div>
        <div className="mt-3 h-px bg-ink w-full opacity-20" />
        <div className="mt-2 font-mono text-[9px] text-zinc-400">┄┄ Wireframe: dashed = placeholder, solid = content, X = image ┄┄</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative max-w-md">
          <input type="text" placeholder="[ Search by receiver name... ]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="wire-input !py-2.5 pr-10" />
          <Search className="absolute right-3 top-3 h-4 w-4 text-ink pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 bg-yellow-200 border border-ink text-[8px] font-mono px-1 rotate-[1deg]">INPUT 44px</div>
        </div>
        <div className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 shadow-[2px_2px_0_0_#111]">
          <Filter className="h-4 w-4" />
          <span className="font-mono text-[10px] font-bold uppercase">[ Status ]</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="font-mono text-xs bg-transparent focus:outline-none">
            <option value="">[ All ]</option>
            <option value="active">[ Active ]</option>
            <option value="inactive">[ Inactive ]</option>
            <option value="returned">[ Returned ]</option>
            <option value="lost">[ Lost ]</option>
          </select>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-white border-2 border-red-600 text-red-600 px-3 py-2 font-mono text-xs shadow-[2px_2px_0_0_#dc2626]"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {loading ? <div className="wire-card p-8 bg-white text-center font-mono text-sm">[ Loading — wireframe skeleton — please wait ]</div>
      : records.length === 0 ? (
        <div className="wire-card p-12 bg-white text-center flex flex-col items-center max-w-lg mx-auto relative">
          <div className="h-16 w-16 border-2 border-ink bg-zinc-50 flex items-center justify-center relative wire-placeholder">
            <Key className="h-6 w-6 text-ink" />
            <span className="absolute -top-2 -right-2 bg-ink text-white text-[8px] px-1 font-mono">EMPTY</span>
          </div>
          <h3 className="mt-4 font-display text-lg font-bold">No Records Found</h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">[ wireframe — add first handover to see it here ]</p>
          <div className="mt-3 border-2 border-dashed border-ink bg-yellow-50 px-3 py-1 font-mono text-[10px]">ANNOTATION: Empty state with placeholder X</div>
        </div>
      ) : (
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((rec) => {
            const isExpanded = expandedRecord === rec.id;
            const dateObj = new Date(rec.createdAt);
            const isUpdating = updatingId === rec.id;
            const missing = [];
            if (!rec.lockPhoto) missing.push('Lock');
            if (!rec.keyPhoto) missing.push('Key');
            if (!rec.placementPhoto) missing.push('Placement');
            const personsMissing = !rec.handoverPersons?.length || rec.handoverPersons.some(p=>!p.photo || !p.name?.trim());
            if (personsMissing) missing.push('Handover');
            const isDraft = missing.length > 0;
            return (
              <div key={rec.id} className="record-card wire-card bg-white flex flex-col justify-between relative">
                <span className="wire-annotation">ID — {String(rec.id).substring(0, 6)}</span>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="inline-flex border border-ink px-2 py-0.5 bg-zinc-100 font-mono text-[9px] font-bold"># {String(rec.id).substring(0, 8)}</div>
                      <h3 className="font-display text-lg font-bold mt-1">┌ {rec.handoverName} ┐</h3>
                      <p className="font-mono text-[11px] flex items-center gap-1"><Briefcase className="h-3 w-3" /> [ {rec.handoverRole} ] <span className="border border-ink px-1.5 py-0.5 bg-yellow-100 text-[9px]">[ {rec.status} ]</span></p>
                    </div>
                    <div className="border-2 border-ink bg-white px-3 py-1 font-mono font-bold text-sm shadow-[2px_2px_0_0_#111] rotate-[0.5deg]">{rec.keyCount} KEY(S)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="border border-dashed border-ink bg-zinc-50 px-2 py-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateObj.toLocaleDateString()}</div>
                    <div className="border border-dashed border-ink bg-zinc-50 px-2 py-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {dateObj.toLocaleTimeString()}</div>
                  </div>
                  <div className="border-2 border-ink bg-white px-2.5 py-1.5 flex items-center gap-1.5 font-mono text-[11px]">
                    <Timer className="h-3.5 w-3.5" />
                    <span>[ Handover: <strong>{formatDateTime(rec.handoverAt)}</strong> ]</span>
                    <span className="ml-auto text-[9px] border border-ink px-1 bg-yellow-100">AUTO</span>
                  </div>
                  <div className={`border-2 p-2.5 flex items-center gap-2 font-mono text-[11px] ${isDraft ? 'border-ink bg-yellow-50' : 'border-ink bg-white'}`}>
                    <span className="font-bold">{isDraft ? `[ INCOMPLETE: ${missing.join(', ')} ]` : '[ COMPLETE ✓ ]'}</span>
                    <button onClick={() => navigate(`/wizard/edit/${rec.id}`)} className="ml-auto wire-btn !py-1 !px-2 !text-[10px]">
                      <Pencil className="h-3 w-3" /> {isDraft ? 'Continue' : 'Edit'}
                    </button>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                    {[rec.lockPhoto, rec.keyPhoto, rec.placementPhoto, rec.handoverPhoto || (rec.handoverPersons && rec.handoverPersons[0]?.photo)].map((p, i) => (
                      <div key={i} className="aspect-square border-2 border-ink bg-zinc-50 relative overflow-hidden">
                        {p ? (
                          <img src={p} alt="thumb" className="w-full h-full object-cover grayscale" />
                        ) : (
                          <div className="w-full h-full wire-placeholder">
                            <span className="font-mono text-[8px] bg-white border border-ink px-1 relative z-10">{i===3 ? `${rec.handoverPersons?.length || 0} persons` : 'NO PHOTO'}</span>
                          </div>
                        )}
                        <span className="absolute top-0 left-0 bg-ink text-white text-[7px] font-mono px-1">0{i+1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t-2 border-dashed border-zinc-300 pt-4 bg-zinc-50/50">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Lock Photo', url: rec.lockPhoto, note: '01' },
                        { label: 'Key Photo', url: rec.keyPhoto, note: '02' },
                        { label: 'Placement Photo', url: rec.placementPhoto, note: '03', action: () => triggerPlacementChange(rec.id), btn: 'Change Placement' },
                        { label: 'Handover Photo', url: rec.handoverPhoto, note: '04', action: () => triggerHandoverChange(rec.id), btn: 'Change Handover' },
                      ].map((it, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]"><span className="border border-ink px-1 bg-white">[ {it.label} ]</span><span className="text-[8px]">{it.note}</span></div>
                          <div className="aspect-video border-2 border-ink bg-white relative overflow-hidden">
                            {it.url ? <img src={it.url} alt={it.label} className="w-full h-full object-cover grayscale" /> : <div className="w-full h-full wire-placeholder"><span className="font-mono text-[10px] bg-white border border-ink px-1">MISSING</span></div>}
                          </div>
                          {it.action && <button onClick={it.action} disabled={isUpdating} className="w-full wire-btn !py-1.5 !text-[11px]">{isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />} {it.btn}</button>}
                        </div>
                      ))}
                    </div>

                    <div className="wire-card p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <h4 className="font-mono text-[11px] font-bold uppercase flex items-center gap-1"><User className="h-3 w-3" /> [ Handover Details ]</h4>
                        {editingId !== rec.id ? (
                          <button onClick={() => startEditDetails(rec)} className="wire-btn !py-1 !px-2 !text-[11px]"><Pencil className="h-3 w-3" /> Edit</button>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => saveEditDetails(rec.id)} disabled={updatingId===rec.id} className="wire-btn wire-btn-primary !py-1 !px-2 !text-[11px]">{updatingId===rec.id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save</button>
                            <button onClick={cancelEditDetails} className="wire-btn !py-1 !px-2 !text-[11px]"><X className="h-3 w-3" /> Cancel</button>
                          </div>
                        )}
                      </div>
                      {editingId !== rec.id ? (
                        <div className="mt-2 space-y-1 font-mono text-xs">
                          <div className="flex justify-between border-b border-dashed border-zinc-300 py-1"><span>[ Name ]</span><span className="font-bold">{rec.handoverName}</span></div>
                          <div className="flex justify-between border-b border-dashed border-zinc-300 py-1"><span>[ Role ]</span><span className="font-bold">{rec.handoverRole || '—'}</span></div>
                          <div className="flex justify-between border-b border-dashed border-zinc-300 py-1"><span>[ Contact ]</span><span className="font-bold">{rec.handoverContact || '—'}</span></div>
                          <div className="flex justify-between py-1"><span>[ Keys ]</span><span className="border-2 border-ink px-2 bg-yellow-100 font-bold">{rec.keyCount}</span></div>
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          <input value={editForm.handoverName} onChange={(e)=>setEditForm({...editForm, handoverName:e.target.value})} className="wire-input" placeholder="[ Name ]" />
                          <input value={editForm.handoverRole} onChange={(e)=>setEditForm({...editForm, handoverRole:e.target.value})} className="wire-input" placeholder="[ Role ]" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" min="1" value={editForm.keyCount} onChange={(e)=>setEditForm({...editForm, keyCount:e.target.value})} className="wire-input" />
                            <select value={editForm.status} onChange={(e)=>setEditForm({...editForm, status:e.target.value})} className="wire-input">
                              <option value="active">[ active ]</option><option value="inactive">[ inactive ]</option><option value="returned">[ returned ]</option><option value="lost">[ lost ]</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {rec.handoverPersons && rec.handoverPersons.length > 0 && (
                      <div className="wire-card p-3 bg-white">
                        <h4 className="font-mono text-[11px] font-bold uppercase flex items-center gap-1"><Users className="h-3 w-3" /> [ Per-Person Photo & Status ]</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {rec.handoverPersons.map((p, idx)=> (
                            <div key={idx} className="border-2 border-ink bg-white p-2 space-y-2 relative">
                              <span className="absolute -top-2 -left-2 bg-ink text-white text-[9px] px-1.5 py-0.5 font-mono">#{idx+1}</span>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 border-2 border-ink bg-zinc-100 flex items-center justify-center font-mono text-xs font-bold">{idx+1}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-xs font-bold truncate">[ {p.name || 'Unnamed'} ]</p>
                                  <p className="font-mono text-[10px] text-zinc-500 truncate">{p.role || 'No role'}</p>
                                </div>
                                <span className="border-2 border-ink bg-yellow-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">{p.status}</span>
                              </div>
                              <div className="aspect-video border-2 border-ink bg-white relative overflow-hidden">
                                {p.photo ? <img src={p.photo} alt={`Person ${idx+1}`} className="w-full h-full object-cover grayscale" /> : <div className="w-full h-full wire-placeholder"><span className="font-mono text-[10px] bg-white border border-ink px-1">NO PHOTO — X</span></div>}
                              </div>
                              <button onClick={()=> triggerPersonPhotoChange(rec.id, idx)} disabled={isUpdating} className="w-full wire-btn !py-1.5 !text-[11px]"><ImagePlus className="h-3 w-3"/> {p.photo ? '[ Change ]' : '[ Add Photo ]'}</button>
                              <select value={p.status} onChange={(e)=> handlePersonStatusChange(rec, idx, e.target.value)} disabled={isUpdating} className="w-full wire-input !py-1.5">
                                <option value="active">[ active ]</option><option value="inactive">[ inactive ]</option><option value="returned">[ returned ]</option><option value="lost">[ lost ]</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentUser?.role === 'admin' && (
                      <button onClick={() => handleDelete(rec.id)} className="w-full border-2 border-red-600 bg-white text-red-600 font-mono font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_#dc2626] hover:bg-red-600 hover:text-white">
                        <Trash2 className="h-4 w-4" /> [ Delete — admin ]
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => toggleExpand(rec.id)} className="w-full py-3 border-t-2 border-ink bg-zinc-100 hover:bg-yellow-50 flex items-center justify-center gap-1.5 font-mono font-bold text-xs uppercase">
                  {isExpanded ? <><span>[ Hide ]</span><ChevronUp className="h-4 w-4" /></> : <><span>[ Expand & Edit Photos — WIREFRAME ]</span><ChevronDown className="h-4 w-4" /></>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
