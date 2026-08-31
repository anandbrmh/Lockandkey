import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchRecords, deleteRecord, updateRecord, updateHandoverPhoto, updatePlacementPhoto, selectRecordsState } from '../features/records/recordsSlice';
import { selectCurrentUser } from '../features/auth/authSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { gsap } from 'gsap';
import {
  Calendar,
  Search,
  Key,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase,
  Trash2,
  AlertCircle,
  Filter,
  RefreshCw,
  ImagePlus,
  Timer,
  Pencil,
  Save,
  X,
  User,
  Users,
  Phone,
  Hash,
} from 'lucide-react';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { const d = new Date(iso); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; } catch { return String(iso); }
};

// Normalize backend record to UI shape — includes per-person photos & status enum
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
  const handoverPhotoUploadedAt = pickUploadedAt(rec.handoverPhoto);
  const placementPhotoUploadedAt = pickUploadedAt(rec.placementPhoto);
  const location = rec.location || null;
  const status = rec.status || 'active';
  const handoverPersons = Array.isArray(rec.handoverPersons) ? rec.handoverPersons.map(p=>({
    name: p.name || '',
    role: p.role || '',
    contactNumber: p.contactNumber || p.contact || '',
    personId: p.personId || null,
    status: p.status || 'active',
    photo: pickUrl(p.photo),
    photoFileId: p.photo?.fileId || null,
  })) : [];
  return { ...rec, id, _id: id, createdAt, keyCount, handoverName, handoverRole, handoverContact, lockPhoto, keyPhoto, placementPhoto, handoverPhoto, location, status, handoverAt, placementAt, handoverPhotoUploadedAt, placementPhotoUploadedAt, handoverPersons };
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
  const [targetPerson, setTargetPerson] = useState(null); // {id, idx}

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
      gsap.fromTo(items, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    }
  }, [rawRecords, loading]);

  const records = rawRecords.map(normalizeRecord);

  const handleDelete = async (id) => {
    if (!confirm('Delete this record? This will soft-delete and remove ImageKit files.')) return;
    const result = await dispatch(deleteRecord(id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchRecords({ page: 1, limit: 50, handoverName: searchTerm || undefined, status: statusFilter || undefined }));
    }
  };

  const triggerHandoverChange = (id) => { setTargetId(id); handoverInputRef.current?.click(); };
  const triggerPlacementChange = (id) => { setTargetId(id); placementInputRef.current?.click(); };
  const triggerPersonPhotoChange = (id, idx) => { setTargetPerson({ id, idx }); personPhotoInputRef.current?.click(); };

  const onHandoverFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) { alert('Only images allowed'); e.target.value=''; return; }
    setUpdatingId(targetId);
    const result = await dispatch(updateHandoverPhoto({ id: targetId, file }));
    setUpdatingId(null);
    e.target.value='';
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const onPlacementFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) { alert('Only images allowed'); e.target.value=''; return; }
    setUpdatingId(targetId);
    const result = await dispatch(updatePlacementPhoto({ id: targetId, file }));
    setUpdatingId(null);
    e.target.value='';
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const onPersonPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetPerson) return;
    if (!file.type.startsWith('image/')) { alert('Only images allowed'); e.target.value=''; return; }
    setUpdatingId(targetPerson.id);
    const fd = new FormData();
    fd.append(`personPhoto_${targetPerson.idx}`, file);
    const result = await dispatch(updateRecord({ id: targetPerson.id, formData: fd }));
    setUpdatingId(null);
    e.target.value='';
    setTargetPerson(null);
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const handlePersonStatusChange = async (rec, idx, newStatus) => {
    const allowed = ["active","inactive","returned","lost"];
    if (!allowed.includes(newStatus)) return;
    setUpdatingId(rec.id);
    const updatedPersons = (rec.handoverPersons || []).map((p,i)=> i===idx ? { ...p, status: newStatus } : p);
    // ensure we send as JSON string for backend
    const fd = new FormData();
    fd.append('handoverPersons', JSON.stringify(updatedPersons.map(p=>({ name: p.name, role: p.role, contact: p.contactNumber, contactNumber: p.contactNumber, personId: p.personId, status: p.status, photo: p.photo ? {url: p.photo} : undefined }))));
    const result = await dispatch(updateRecord({ id: rec.id, formData: fd }));
    setUpdatingId(null);
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Status update failed');
  };

  const startEditDetails = (rec) => {
    setEditingId(rec.id);
    setEditForm({
      handoverName: rec.handoverName || '',
      handoverRole: rec.handoverRole || '',
      handoverContact: rec.handoverContact || '',
      keyCount: rec.keyCount || 1,
      status: rec.status || 'active',
    });
  };
  const cancelEditDetails = () => { setEditingId(null); };
  const saveEditDetails = async (id) => {
    if (!editForm.handoverName.trim() || !editForm.handoverRole.trim()) { alert('Name and Role are required'); return; }
    if (Number(editForm.keyCount) < 1) { alert('keyCount must be >=1'); return; }
    setUpdatingId(id);
    const payload = {
      handoverName: editForm.handoverName.trim(),
      handoverRole: editForm.handoverRole.trim(),
      handoverContact: editForm.handoverContact.trim(),
      keyCount: Number(editForm.keyCount),
      status: editForm.status,
    };
    const result = await dispatch(updateRecord({ id, formData: payload }));
    setUpdatingId(null);
    if (result.meta.requestStatus === 'fulfilled') setEditingId(null);
    else alert(result.payload || 'Update failed');
  };

  const toggleExpand = (id) => setExpandedRecord(expandedRecord === id ? null : id);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Hidden file inputs for photo changes */}
      <input ref={handoverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onHandoverFile} />
      <input ref={placementInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPlacementFile} />
      <input ref={personPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPersonPhotoFile} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight sm:text-3xl">Vault Audit Log History</h1>
          
          {pagination && <p className="text-xs text-slate-400 mt-1">Total: {pagination.total} • Page {pagination.page}/{pagination.pages}</p>}
        </div>
        <button onClick={() => dispatch(fetchRecords({ page: 1, limit: 50, handoverName: searchTerm || undefined, status: statusFilter || undefined }))} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm">
          <FileSpreadsheet className="h-4 w-4" /><span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative max-w-md">
          <input type="text" placeholder="Search by receiver name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm" />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="returned">Returned</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {loading ? <LoadingSpinner message="Querying lock registry..." />
      : records.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 text-center flex flex-col items-center max-w-lg mx-auto">
          <div className="h-14 w-14 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mb-4"><Key className="h-6 w-6" /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Records Found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{searchTerm ? 'No entries match your search.' : 'Document your first handover to see it here.'}</p>
        </div>
      ) : (
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((rec) => {
            const isExpanded = expandedRecord === rec.id;
            const dateObj = new Date(rec.createdAt);
            const isUpdating = updatingId === rec.id;
            return (
              <div key={rec.id} className="record-card glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">#ID-{String(rec.id).substring(0, 8)}</span>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-50 mt-1">{rec.handoverName}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><Briefcase className="h-3 w-3" /> {rec.handoverRole} {rec.status && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600">{rec.status}</span>}</p>
                    </div>
                    <span className="inline-flex px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-extrabold text-xs border border-primary-100 dark:border-primary-900/30">{rec.keyCount} {rec.keyCount === 1 ? 'Key' : 'Keys'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>{dateObj.toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span>{dateObj.toLocaleTimeString()}</span></div>
                  </div>
                  {/* System-auto handover date */}
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <Timer className="h-3.5 w-3.5" />
                    <span>Handover (system): <strong>{formatDateTime(rec.handoverAt)}</strong></span>
                    <span className="ml-auto text-[9px] opacity-70">auto on photo upload</span>
                  </div>
                  {/* Incomplete steps indicator + Edit/Continue */}
                  {(() => {
                    const missing = [];
                    if (!rec.lockPhoto) missing.push('Lock');
                    if (!rec.keyPhoto) missing.push('Key');
                    if (!rec.placementPhoto) missing.push('Placement');
                    const personsMissing = !rec.handoverPersons?.length || rec.handoverPersons.some(p=>!p.photo || !p.name?.trim());
                    if (personsMissing) missing.push('Handover');
                    const isDraft = missing.length > 0;
                    return (
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${isDraft ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'}`}>
                        <span className="font-bold">{isDraft ? `Incomplete: ${missing.join(', ')} — continue editing` : 'All 5 steps complete ✓'}</span>
                        <button onClick={() => navigate(`/wizard/edit/${rec.id}`)} className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm border ${isDraft ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          <Pencil className="h-3.5 w-3.5" /> {isDraft ? 'Continue / Edit Steps' : 'Edit All Steps'}
                        </button>
                      </div>
                    );
                  })()}

                </div>

                {!isExpanded && (
                  <div className="px-6 pb-4 grid grid-cols-4 gap-2">
                    {[rec.lockPhoto, rec.keyPhoto, rec.placementPhoto, rec.handoverPhoto || (rec.handoverPersons && rec.handoverPersons[0]?.photo)].map((p, i) => (
                      <div key={i} className="aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-800 relative">
                        {p ? (
                          <>
                            <img src={p} alt="thumb" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                            <div className="hidden absolute inset-0 items-center justify-center text-[10px] text-slate-500 bg-slate-800 p-1 text-center" style={{display:'none'}}>Unavailable</div>
                          </>
                        ) : <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-500 bg-slate-800">{i===3 ? `${rec.handoverPersons?.length || 0} persons` : 'No Photo'}</div>}
                        {i===3 && rec.handoverPersons?.length > 1 && p && <div className="absolute bottom-0.5 right-0.5 bg-primary-600 text-white text-[8px] px-1 rounded-full font-bold">+{rec.handoverPersons.length}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6 border-t border-slate-100 dark:border-slate-800/80 pt-6 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lock Photo</span>
                        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">{rec.lockPhoto ? (
                          <>
                            <img src={rec.lockPhoto} alt="Lock" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                            <div className="hidden absolute inset-0 items-center justify-center text-xs text-slate-500 bg-slate-800" style={{display:'none'}}>Missing</div>
                          </>
                        ) : <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 bg-slate-800">Missing</div>}</div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Photo</span>
                        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">{rec.keyPhoto ? (
                          <>
                            <img src={rec.keyPhoto} alt="Key" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                            <div className="hidden absolute inset-0 items-center justify-center text-xs text-slate-500 bg-slate-800" style={{display:'none'}}>Missing</div>
                          </>
                        ) : <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 bg-slate-800">Missing</div>}</div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement Photo</span><span className="text-[9px] text-slate-400">{rec.placementAt ? formatDateTime(rec.placementAt) : ''}</span></div>
                        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">{rec.placementPhoto ? (
                          <>
                            <img src={rec.placementPhoto} alt="Placement" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                            <div className="hidden absolute inset-0 items-center justify-center text-xs text-slate-500 bg-slate-800" style={{display:'none'}}>Missing</div>
                          </>
                        ) : <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 bg-slate-800">Missing</div>}</div>
                        <button onClick={() => triggerPlacementChange(rec.id)} disabled={isUpdating} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50">
                          {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" /> } Change Placement Photo
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Handover Photo</span><span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">{rec.handoverAt ? formatDateTime(rec.handoverAt) : ''}</span></div>
                        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                          {rec.handoverPhoto ? (
                            <>
                              <img src={rec.handoverPhoto} alt="Handover" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextElementSibling; if(fb) fb.style.display='flex'; }} />
                              <div className="hidden absolute inset-0 items-center justify-center text-xs text-slate-500 bg-slate-800" style={{display:'none'}}>Missing</div>
                            </>
                          ) : <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 bg-slate-800">Missing</div>}
                          <div className="absolute bottom-1.5 left-1.5 bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow">SYSTEM DATE</div>
                        </div>
                        <button onClick={() => triggerHandoverChange(rec.id)} disabled={isUpdating} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-tr from-primary-600 to-amber-500 text-white text-xs font-bold shadow hover:from-primary-700 hover:to-amber-600 disabled:opacity-50">
                          {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" /> } Change Handover Photo
                        </button>
                        <p className="text-[9px] text-slate-400 text-center">Server auto-sets date/time on upload — no manual input</p>
                      </div>
                    </div>

                    {/* Handover Details — view / edit */}
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Handover Details</h4>
                        {editingId !== rec.id ? (
                          <button onClick={() => startEditDetails(rec)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => saveEditDetails(rec.id)} disabled={updatingId===rec.id} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">
                              {updatingId===rec.id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save
                            </button>
                            <button onClick={cancelEditDetails} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                              <X className="h-3 w-3" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {editingId !== rec.id ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1"><User className="h-3 w-3"/> Name</span><span className="font-semibold text-slate-800 dark:text-slate-100">{rec.handoverName}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1"><Briefcase className="h-3 w-3"/> Role</span><span className="font-semibold text-slate-800 dark:text-slate-100">{rec.handoverRole || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3"/> Contact</span><span className="font-semibold text-slate-800 dark:text-slate-100">{rec.handoverContact || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3"/> Keys</span><span className="font-bold text-primary-600">{rec.keyCount}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600">{rec.status}</span></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500">Name *</label>
                            <input value={editForm.handoverName} onChange={(e)=>setEditForm({...editForm, handoverName:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Full name" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500">Role *</label>
                            <input value={editForm.handoverRole} onChange={(e)=>setEditForm({...editForm, handoverRole:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Designation" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500">Contact</label>
                            <input value={editForm.handoverContact} onChange={(e)=>setEditForm({...editForm, handoverContact:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Phone" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500">Keys</label>
                              <input type="number" min="1" value={editForm.keyCount} onChange={(e)=>setEditForm({...editForm, keyCount:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500">Status</label>
                              <select value={editForm.status} onChange={(e)=>setEditForm({...editForm, status:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="returned">Returned</option>
                                <option value="lost">Lost</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Per-key persons — individual photo & status enum */}
                    {rec.handoverPersons && rec.handoverPersons.length > 0 && (
                      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Keys — Per-Person Photo & Status (update anytime)</h4>
                        <p className="text-[11px] text-slate-400">Each key’s receiver has its own image and status (<span className="font-mono font-bold">active / inactive / returned / lost</span>). You can update remaining steps later.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rec.handoverPersons.map((p, idx)=> (
                            <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 flex items-center justify-center text-xs font-bold">{idx+1}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{p.name || 'Unnamed'} </p>
                                  <p className="text-[11px] text-slate-500 truncate">{p.role || 'No role'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${p.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200': p.status==='inactive'?'bg-slate-100 text-slate-600 border-slate-200': p.status==='returned'?'bg-blue-50 text-blue-700 border-blue-200':'bg-red-50 text-red-700 border-red-200'}`}>{p.status}</span>
                              </div>
                              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                                {p.photo ? <img src={p.photo} alt={`Person ${idx+1}`} className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; }} /> : <div className="h-full w-full flex flex-col items-center justify-center text-[11px] text-slate-500 bg-slate-800 p-2 text-center">No Photo<br/><span className="text-[10px] text-amber-400">Add later</span></div>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={()=> triggerPersonPhotoChange(rec.id, idx)} disabled={isUpdating} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                                  {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin"/> : <ImagePlus className="h-3 w-3"/>} {p.photo ? 'Change' : 'Add'} Photo
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="text-[11px] font-bold text-slate-500">Status:</label>
                                <select value={p.status} onChange={(e)=> handlePersonStatusChange(rec, idx, e.target.value)} disabled={isUpdating} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold">
                                  <option value="active">active</option>
                                  <option value="inactive">inactive</option>
                                  <option value="returned">returned</option>
                                  <option value="lost">lost</option>
                                </select>
                              </div>
                              {p.contactNumber && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3"/> {p.contactNumber}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentUser?.role === 'admin' && (
                      <button onClick={() => handleDelete(rec.id)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-sm border border-red-100 dark:border-red-900/30 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Delete (admin)
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => toggleExpand(rec.id)} className="w-full py-3.5 border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-900/60 flex items-center justify-center gap-1.5 font-bold text-xs text-slate-500 dark:text-slate-400">
                  {isExpanded ? <><span>Hide</span><ChevronUp className="h-4 w-4" /></> : <><span>Expand & Edit Photos</span><ChevronDown className="h-4 w-4" /></>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
