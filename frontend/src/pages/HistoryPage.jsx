import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchRecords, deleteRecord, updateRecord, updatePlacementPhoto, updatePersonPhoto, selectRecordsState } from '../features/records/recordsSlice';
import { selectCurrentUser } from '../features/auth/authSlice';
import { Calendar, Search, Key, ChevronDown, ChevronUp, Clock, Briefcase, Trash2, AlertCircle, Filter, RefreshCw, ImagePlus, Pencil, Save, X, User, Users } from 'lucide-react';

import { filterHandoverPersonsForDisplay } from '../utils/validators';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { const d = new Date(iso); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; } catch { return String(iso); }
};

const normalizeRecord = (rec) => {
  const id = rec._id || rec.id;
  const pickUrl = (v) => (typeof v === 'string' ? v : v?.url || null);
  const pickUploadedAt = (v) => (typeof v === 'object' ? v?.uploadedAt || null : null);
  const lockPhoto = pickUrl(rec.lockPhoto);
  const keyPhoto = pickUrl(rec.keyPhoto);
  const placementPhoto = pickUrl(rec.placementPhoto);
  const placementAt = pickUploadedAt(rec.placementPhoto) || null;
  const keyCountNum = parseInt(rec.keyCount, 10) || 1;
  const rawPersons = Array.isArray(rec.handoverPersons) && rec.handoverPersons.length > 0
    ? rec.handoverPersons.map(p=>({
        name: p.name || '', role: p.role || '', contactNumber: p.contactNumber || p.contact || '', personId: p.personId || null, status: p.status || 'active', photo: pickUrl(p.photo), keysGiven: parseInt(p.keysGiven,10) >=1 ? parseInt(p.keysGiven,10) :1,
      }))
    : [];
  const handoverPersons = filterHandoverPersonsForDisplay(rawPersons, keyCountNum);
  const firstName = handoverPersons[0]?.name || 'Unknown';
  const firstRole = handoverPersons[0]?.role || '';
  const firstContact = handoverPersons[0]?.contactNumber || '';
  return { ...rec, id, _id: id, handoverName: firstName, handoverRole: firstRole, handoverContact: firstContact, keyCount: keyCountNum, lockPhoto, keyPhoto, placementPhoto, placementAt, handoverPersons, status: rec.status || 'active' };
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
  const [editForm, setEditForm] = useState({ handoverPersons: [], keyCount: 1, status: 'active' });
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

  const records = rawRecords.map(normalizeRecord);
  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    const result = await dispatch(deleteRecord(id));
    if (result.meta.requestStatus === 'fulfilled') dispatch(fetchRecords({ page: 1, limit: 50 }));
  };
  const triggerPlacementChange = (id) => { setTargetId(id); placementInputRef.current?.click(); };
  const triggerPersonPhotoChange = (id, idx) => { setTargetPerson({ id, idx }); personPhotoInputRef.current?.click(); };
  const onPlacementFile = async (e) => {
    const file = e.target.files?.[0]; if (!file || !targetId) return;
    setUpdatingId(targetId);
    const result = await dispatch(updatePlacementPhoto({ id: targetId, file }));
    setUpdatingId(null); e.target.value='';
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const onPersonPhotoFile = async (e) => {
    const file = e.target.files?.[0]; if (!file || !targetPerson) return;
    setUpdatingId(targetPerson.id);
    const result = await dispatch(updatePersonPhoto({ id: targetPerson.id, personIndex: targetPerson.idx, file }));
    setUpdatingId(null); e.target.value=''; setTargetPerson(null);
    if (result.meta.requestStatus === 'rejected') alert(result.payload || 'Update failed');
  };
  const startEditDetails = (rec) => {
    setEditingId(rec.id);
    setEditForm({ handoverPersons: rec.handoverPersons || [], keyCount: rec.keyCount || 1, status: rec.status || 'active' });
  };
  const saveEditDetails = async (id) => {
    setUpdatingId(id);
    const payload = { handoverPersons: JSON.stringify(editForm.handoverPersons), keyCount: Number(editForm.keyCount), status: editForm.status };
    const result = await dispatch(updateRecord({ id, formData: payload }));
    setUpdatingId(null);
    if (result.meta.requestStatus === 'fulfilled') setEditingId(null); else alert(result.payload || 'Update failed');
  };
  const handlePersonKeysGivenChange = async (rec, idx, newKeys) => {
    let kg = parseInt(newKeys,10); if(isNaN(kg)||kg<1) kg=1;
    const remaining = (parseInt(rec.keyCount,10)||1) - rec.handoverPersons.slice(0,idx).reduce((s,p)=>s+(parseInt(p.keysGiven,10)||1),0) - kg;
    if (remaining <0) { alert(`Exceeds total ${rec.keyCount} keys. Max for this person is ${kg+remaining}`); return; }
    setUpdatingId(rec.id);
    const updated = rec.handoverPersons.map((p,i)=> i===idx ? { ...p, keysGiven: kg } : p);
    // if edit leaves remaining keys, ensure persons count matches? backend will validate sum, so we must keep sum==keyCount. If remaining>0, backend will reject because sum < total. So we need to add dummy persons to fill? Simpler: distribute remaining as new persons if needed.
    // For history quick edit, just send updated persons and let backend validate; if remaining>0 we add persons with empty names to fill.
    let sum = updated.reduce((s,p)=>s+(parseInt(p.keysGiven,10)||1),0);
    const total = parseInt(rec.keyCount,10)||1;
    while (sum < total) { updated.push({ name: 'New Person', role: '', contactNumber:'', status:'active', keysGiven:1 }); sum+=1; }
    while (sum > total && updated.length>1) {
      const last = updated[updated.length-1];
      if (sum - (parseInt(last.keysGiven,10)||1) >= total) { sum-=(parseInt(last.keysGiven,10)||1); updated.pop(); }
      else { const excess=sum-total; last.keysGiven=(parseInt(last.keysGiven,10)||1)-excess; sum=total; }
    }
    const fd = new FormData(); fd.append('handoverPersons', JSON.stringify(updated.map(p=>({ name:p.name, role:p.role, contact:p.contactNumber, personId:p.personId, status:p.status, keysGiven:p.keysGiven, photo: p.photo?{url:p.photo}:undefined }))));
    const result = await dispatch(updateRecord({ id: rec.id, formData: fd }));
    setUpdatingId(null);
    if (result.meta.requestStatus==='rejected') alert(result.payload || 'Update failed');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <input ref={placementInputRef} type="file" accept="image/*" className="hidden" onChange={onPlacementFile} />
      <input ref={personPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={onPersonPhotoFile} />

      {/* header */}
      <div className="wire-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">History</h1>
          <p className="text-xs font-mono text-zinc-500">{pagination ? `${pagination.total} records` : 'Audit log'}</p>
        </div>
        <button onClick={() => dispatch(fetchRecords({ page: 1, limit: 50 }))} className="wire-btn text-xs"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative max-w-md">
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="wire-input pr-9" />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex items-center gap-2 border border-zinc-200 rounded-md bg-white px-3">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-mono bg-transparent py-2 focus:outline-none">
            <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="returned">Returned</option><option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {loading ? <div className="wire-card p-8 text-center text-sm font-mono text-zinc-500">Loading...</div>
      : records.length === 0 ? (
        <div className="wire-card p-10 text-center">
          <div className="mx-auto h-12 w-12 border border-dashed border-zinc-300 rounded-md flex items-center justify-center bg-zinc-50"><Key className="h-5 w-5 text-zinc-400" /></div>
          <p className="mt-3 text-sm font-medium">No records</p><p className="text-xs font-mono text-zinc-500">Create your first handover.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((rec) => {
            const isExpanded = expandedRecord === rec.id;
            const isUpdating = updatingId === rec.id;
            const missing = []; if (!rec.lockPhoto) missing.push('Lock'); if (!rec.keyPhoto) missing.push('Key'); if (!rec.placementPhoto) missing.push('Place');
            const isDraft = missing.length > 0;
            return (
              <div key={rec.id} className="wire-card flex flex-col overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono border border-zinc-200 rounded px-1.5 py-0.5 bg-zinc-50">#{String(rec.id).slice(0,8)}</span>
                      <h3 className="text-sm font-semibold mt-1">{rec.handoverName}</h3>
                      <p className="text-xs font-mono text-zinc-500 flex items-center gap-1"><Briefcase className="h-3 w-3" /> {rec.handoverRole} · <span className="border border-zinc-200 rounded px-1 text-[11px]">{rec.status}</span></p>
                    </div>
                    <span className="h-fit border border-zinc-900 rounded-md px-2 py-1 text-xs font-mono bg-white">{rec.keyCount} keys</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <span className="border border-zinc-200 rounded px-2 py-1.5 bg-zinc-50 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(rec.createdAt).toLocaleDateString()}</span>
                    <span className="border border-zinc-200 rounded px-2 py-1.5 bg-zinc-50 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(rec.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs font-mono border border-zinc-200 rounded px-2 py-1.5 bg-white">Handover: {formatDateTime(rec.handoverPersons?.[0]?.photo?.uploadedAt || rec.createdAt)}</div>
                  <div className={`text-xs rounded px-2 py-1.5 border ${isDraft ? 'bg-zinc-50 border-zinc-200' : 'bg-white border-zinc-200'} flex items-center justify-between`}>
                    <span>{isDraft ? `Incomplete: ${missing.join(', ')}` : 'Complete'}</span>
                    <button onClick={() => navigate(`/wizard/edit/${rec.id}`)} className="wire-btn !py-1 !px-2 text-[11px]"><Pencil className="h-3 w-3" /> {isDraft ? 'Continue' : 'Edit'}</button>
                  </div>
                </div>

                {!isExpanded ? (
                  <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                    {[rec.lockPhoto, rec.keyPhoto, rec.placementPhoto, rec.handoverPersons?.[0]?.photo].map((p, i) => (
                      <div key={i} className="aspect-square border border-zinc-200 rounded-md bg-zinc-50 overflow-hidden flex items-center justify-center">
                        {p ? <img src={p} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-mono text-zinc-400">—</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-200 pt-3 bg-zinc-50/50">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Lock', url: rec.lockPhoto },
                        { label: 'Key', url: rec.keyPhoto },
                        { label: 'Placement', url: rec.placementPhoto, action: () => triggerPlacementChange(rec.id) },
                        { label: 'Person 1', url: rec.handoverPersons?.[0]?.photo, action: () => triggerPersonPhotoChange(rec.id, 0) },
                      ].map((it, i) => (
                        <div key={i} className="space-y-1">
                          <span className="text-[11px] font-mono">{it.label}</span>
                          <div className="aspect-video border border-zinc-200 rounded-md bg-white overflow-hidden flex items-center justify-center">
                            {it.url ? <img src={it.url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">empty</span>}
                          </div>
                          {it.action && <button onClick={it.action} disabled={isUpdating} className="w-full wire-btn !py-1 text-[11px]">{isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />} Change</button>}
                        </div>
                      ))}
                    </div>

                    <div className="wire-card p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium flex items-center gap-1"><User className="h-3 w-3" /> Details</span>
                        {editingId !== rec.id ? <button onClick={() => startEditDetails(rec)} className="wire-btn !py-1 !px-2 text-[11px]"><Pencil className="h-3 w-3" /> Edit</button> : (
                          <div className="flex gap-1">
                            <button onClick={() => saveEditDetails(rec.id)} className="wire-btn wire-btn-primary !py-1 !px-2 text-[11px]"><Save className="h-3 w-3" /> Save</button>
                            <button onClick={() => setEditingId(null)} className="wire-btn !py-1 !px-2 text-[11px]"><X className="h-3 w-3" /> Cancel</button>
                          </div>
                        )}
                      </div>
                      {editingId !== rec.id ? (
                        <div className="mt-2 text-xs font-mono space-y-1">
                          <div className="flex justify-between border-b border-dashed border-zinc-200 py-1"><span>Name</span><span className="font-medium">{rec.handoverName}</span></div>
                          <div className="flex justify-between border-b border-dashed border-zinc-200 py-1"><span>Role</span><span>{rec.handoverRole || '—'}</span></div>
                          <div className="flex justify-between py-1"><span>Keys</span><span className="border rounded px-2 bg-zinc-50">{rec.keyCount}</span></div>
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          <input value={editForm.handoverPersons?.[0]?.name || ''} onChange={(e)=>setEditForm({...editForm, handoverPersons: editForm.handoverPersons.map((p,i)=>i===0?{...p,name:e.target.value}:p)})} className="wire-input" placeholder="Name (Person 1)" />
                          <input value={editForm.handoverPersons?.[0]?.role || ''} onChange={(e)=>setEditForm({...editForm, handoverPersons: editForm.handoverPersons.map((p,i)=>i===0?{...p,role:e.target.value}:p)})} className="wire-input" placeholder="Role (Person 1)" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" min="1" value={editForm.keyCount} onChange={(e)=>setEditForm({...editForm, keyCount:e.target.value})} className="wire-input" />
                            <select value={editForm.status} onChange={(e)=>setEditForm({...editForm, status:e.target.value})} className="wire-input bg-white"><option value="active">active</option><option value="inactive">inactive</option><option value="returned">returned</option><option value="lost">lost</option></select>
                          </div>
                        </div>
                      )}
                    </div>

                    {rec.handoverPersons?.length > 0 && (
                      <div className="wire-card p-3">
                        <p className="text-xs font-medium flex items-center gap-1"><Users className="h-3 w-3" /> Persons · {rec.handoverPersons.reduce((s,p)=>s+(parseInt(p.keysGiven,10)||1),0)}/{rec.keyCount} keys</p>
                        <div className="grid sm:grid-cols-2 gap-2 mt-2">
                          {rec.handoverPersons.map((p, idx)=> (
                            <div key={idx} className="border border-zinc-200 rounded-md p-2 space-y-2 bg-white">
                              <div className="flex justify-between text-xs font-mono items-center"><span className="truncate">{p.name || 'Unnamed'} <span className="border border-zinc-900 bg-zinc-900 text-white rounded px-1 text-[10px]">{p.keysGiven||1} key{(p.keysGiven||1)>1?'s':''}</span></span><span className="border rounded px-1 text-[10px] shrink-0">{p.status}</span></div>
                              <div className="aspect-video border border-zinc-200 rounded bg-zinc-50 overflow-hidden flex items-center justify-center">
                                {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-400">no photo</span>}
                              </div>
                              <div className="flex gap-1">
                                <label className="text-[11px] font-mono flex items-center">Keys:</label>
                                <input type="number" min="1" value={p.keysGiven||1} onChange={(e)=> handlePersonKeysGivenChange(rec, idx, e.target.value)} className="w-16 border border-zinc-200 rounded px-1 py-0.5 text-xs" />
                                <span className="text-[10px] font-mono text-zinc-500 self-center">of {rec.keyCount}</span>
                              </div>
                              <button onClick={()=> triggerPersonPhotoChange(rec.id, idx)} className="w-full wire-btn !py-1 text-[11px]"><ImagePlus className="h-3 w-3" /> Change</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentUser?.role === 'admin' && <button onClick={() => handleDelete(rec.id)} className="w-full border border-red-200 text-red-600 rounded-md py-2 text-xs font-mono hover:bg-red-50 flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
                  </div>
                )}

                <button onClick={() => setExpandedRecord(isExpanded ? null : rec.id)} className="w-full py-2.5 border-t border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-mono flex items-center justify-center gap-1">
                  {isExpanded ? <><ChevronUp className="h-4 w-4" /> Hide</> : <><ChevronDown className="h-4 w-4" /> Expand</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
