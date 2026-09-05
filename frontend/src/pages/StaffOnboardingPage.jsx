import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Trash2, User, Mail, Phone, Building, MapPin, Briefcase, ShieldCheck, AlertCircle, Check, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { selectCurrentUser } from '../features/auth/authSlice';
import { fetchStaffProfile, completeStaffProfile, selectStaff } from '../features/staff/staffSlice';
import { useCamera } from '../hooks/useCamera';

export default function StaffOnboardingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const { profile, completed, saving, error, loading } = useSelector(selectStaff);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    contactNumber: '',
    department: '',
    designation: '',
    roleTitle: '',
    address: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef(null);
  const { videoRef, canvasRef, startCamera, stopCamera, capturePhoto, isActive } = useCamera();

  useEffect(() => { dispatch(fetchStaffProfile()); }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || user?.name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || profile.contactNumber || '',
        contactNumber: profile.contactNumber || profile.phone || '',
        department: profile.department || '',
        designation: profile.designation || '',
        roleTitle: profile.roleTitle || '',
        address: profile.address || '',
      });
      if (profile.photo?.url || profile.imageUrl) setPhotoPreview(profile.photo?.url || profile.imageUrl);
    } else if (user) {
      setForm(f => ({ ...f, name: user.name || '', email: user.email || '' }));
    }
  }, [profile, user]);

  // If already completed, allow navigation but show completed state
  useEffect(() => {
    if (completed && profile) {
      // optional auto-redirect after 1s handled via UI button
    }
  }, [completed, profile]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    const dataUrl = capturePhoto();
    if (!dataUrl) return;
    setPhotoPreview(dataUrl);
    // convert dataUrl to file
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `staff-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setPhotoFile(file);
    setShowCamera(false);
    stopCamera();
  };

  const clearPhoto = () => { setPhotoPreview(null); setPhotoFile(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
    if (photoFile) fd.append('image', photoFile);
    const result = await dispatch(completeStaffProfile(fd));
    if (result.meta.requestStatus === 'fulfilled' && result.payload?.completed) {
      navigate('/wizard');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="wire-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Staff onboarding</p>
            <h1 className="text-xl font-semibold">Complete your staff profile</h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">Staff users must complete this before accessing handover tools. This collects all remaining schema fields (identity + contact + placement).</p>
          </div>
          <span className={`shrink-0 text-xs font-mono border rounded px-2 py-1 ${completed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{completed ? 'Completed' : 'Incomplete'}</span>
        </div>
        {completed && (
          <div className="mt-3 flex items-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-md text-xs">
            <Check className="h-4 w-4" /> Profile completed — you can continue to wizard.
            <button onClick={() => navigate('/wizard')} className="ml-auto wire-btn wire-btn-primary text-xs py-1">Go to Wizard <ArrowRight className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>
      )}

      <form onSubmit={handleSubmit} className="wire-card p-5 sm:p-6 space-y-6">
        {/* Photo section — covers staff imageUrl / photo sub-schema */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Staff Photo <span className="text-[11px] font-mono text-zinc-500">(imageUrl / photo.url + fileId)</span></h2>
          {!photoPreview ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCamera(true)} className="wire-btn wire-btn-primary text-xs"><Camera className="h-3.5 w-3.5" /> Camera</button>
              <button type="button" onClick={() => fileRef.current?.click()} className="wire-btn text-xs"><Upload className="h-3.5 w-3.5" /> Upload file</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }} />
            </div>
          ) : (
            <div className="relative max-w-sm border border-zinc-200 rounded-md overflow-hidden">
              <img src={photoPreview} alt="staff preview" className="w-full aspect-[4/3] object-cover" />
              <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 h-7 w-7 bg-white border border-zinc-200 rounded-md flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {showCamera && (
            <div className="border border-zinc-200 rounded-md p-3 bg-zinc-50 space-y-2">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded bg-black aspect-video" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={async () => { await startCamera(); }} className="wire-btn text-xs" disabled={isActive}>Start</button>
                <button type="button" onClick={handleCameraCapture} className="wire-btn wire-btn-primary text-xs" disabled={!isActive}>Capture</button>
                <button type="button" onClick={() => { stopCamera(); setShowCamera(false); }} className="wire-btn text-xs">Close</button>
              </div>
            </div>
          )}
          <p className="text-[11px] font-mono text-zinc-500">Stored as <code>Staff.photo.url</code> + <code>fileId</code> + <code>uploadedAt</code> and <code>imageUrl/imageFileId</code> for backward compat. 5MB max.</p>
        </section>

        <div className="border-t border-zinc-200" />

        {/* Identity — covers Staff.name, email, User linkage */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Identity</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="wire-label flex items-center gap-1"><User className="h-3 w-3" /> Name *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className="wire-input mt-1" placeholder="Full name" />
            </div>
            <div>
              <label className="wire-label flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required className="wire-input mt-1 bg-zinc-50" placeholder="staff@example.com" />
              <p className="text-[11px] font-mono text-zinc-500">Defaults from login; can be corrected here.</p>
            </div>
          </div>
        </section>

        {/* Contact — Staff phone, contactNumber, address */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4" /> Contact (remaining schema)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="wire-label flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</label>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="wire-input mt-1" placeholder="e.g. +91 98..." />
            </div>
            <div>
              <label className="wire-label flex items-center gap-1"><Phone className="h-3 w-3" /> Contact Number (alt)</label>
              <input value={form.contactNumber} onChange={e=>setForm({...form,contactNumber:e.target.value})} className="wire-input mt-1" placeholder="Alternate" />
            </div>
          </div>
          <div>
            <label className="wire-label flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</label>
            <textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows={2} className="wire-input mt-1" placeholder="Street, city, etc." />
          </div>
        </section>

        {/* Org — department/designation/roleTitle — covers Staff extended fields */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Building className="h-4 w-4" /> Organization</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="wire-label flex items-center gap-1"><Building className="h-3 w-3" /> Department</label>
              <input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} className="wire-input mt-1" placeholder="e.g. Operations" />
            </div>
            <div>
              <label className="wire-label flex items-center gap-1"><Briefcase className="h-3 w-3" /> Designation</label>
              <input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} className="wire-input mt-1" placeholder="e.g. Supervisor" />
            </div>
            <div>
              <label className="wire-label flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Role Title</label>
              <input value={form.roleTitle} onChange={e=>setForm({...form,roleTitle:e.target.value})} className="wire-input mt-1" placeholder="e.g. Field Staff" />
            </div>
          </div>
          <p className="text-[11px] font-mono text-zinc-500">Maps to <code>Staff.department</code>, <code>designation</code>, <code>roleTitle</code>. Completing these marks <code>profileCompleted=true</code> and unlocks wizard/history.</p>
        </section>

        {/* Explainer for schemas — what staff unlocks */}
        <section className="border border-dashed border-zinc-300 rounded-md p-3 bg-zinc-50 space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wide">What this unlocks</h3>
          <ul className="text-xs font-mono text-zinc-600 list-disc pl-4 space-y-1">
            <li><b>LockKeyRecord</b>: lockPhoto, keyPhoto, placementPhoto, handoverPhoto, keyCount, handoverPersons (name/role/contact/status/keysGiven/photo), location (lat/lng), status — via <code>/wizard</code></li>
            <li><b>Staff Directory</b>: name, designation, contactNumber, photo — reused in handover assignments</li>
            <li><b>SavedLocation</b>: label, lat/lng, description, photo — reused in placement</li>
          </ul>
          <p className="text-[11px] font-mono text-zinc-500">After completing this staff page you are redirected to the wizard which collects all LockKeyRecord fields. Staff profile ensures image + contact are on file for handovers.</p>
        </section>

        <div className="flex gap-2 pt-2 border-t border-zinc-200">
          <button type="submit" disabled={saving || loading} className="wire-btn wire-btn-primary">
            {saving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Saving…' : completed ? 'Update & Continue' : 'Complete & Continue'}
          </button>
          <button type="button" onClick={() => navigate('/wizard')} className="wire-btn text-xs" disabled={!completed}>Skip to wizard</button>
        </div>
      </form>
    </div>
  );
}
