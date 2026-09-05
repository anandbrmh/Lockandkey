import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminSettings, updateAdminSettings, selectAuth, selectCurrentUser } from '../features/auth/authSlice';
import { Shield, User, Mail, Save, AlertCircle, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { loading, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ name: '', email: '', adminCode: '' });
  const [success, setSuccess] = useState(null);

  useEffect(() => { dispatch(fetchAdminSettings()); }, [dispatch]);
  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '', adminCode: user.adminCode || '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    const payload = { name: form.name, email: form.email, adminCode: form.adminCode };
    // allow clearing code by sending empty string
    const result = await dispatch(updateAdminSettings(payload));
    if (result.meta.requestStatus === 'fulfilled') setSuccess('Settings updated');
  };

  if (user?.role !== 'admin') return <div className="mx-auto max-w-xl px-4 py-10 text-center text-sm">Only admin can access this page.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="wire-card p-5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Admin settings</p>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Admin Profile & Code</h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">Update your details and manage the 4-digit admin code. Staff must submit this code to appear on your dashboard. Code is stored plain (not hashed).</p>
      </div>
      {error && <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {success && <div className="border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-md text-xs flex items-center gap-2"><Check className="h-4 w-4" /> {success}</div>}
      <form onSubmit={handleSubmit} className="wire-card p-5 sm:p-6 space-y-4">
        <div>
          <label className="wire-label flex items-center gap-1"><User className="h-3 w-3" /> Name</label>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="wire-input mt-1" placeholder="Admin name" />
        </div>
        <div>
          <label className="wire-label flex items-center gap-1"><Mail className="h-3 w-3" /> Email</label>
          <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="wire-input mt-1" placeholder="admin@example.com" />
        </div>
        <div>
          <label className="wire-label flex items-center gap-1"><Shield className="h-3 w-3" /> 4-digit Admin Code <span className="text-[10px] font-mono text-zinc-500">(plain, optional)</span></label>
          <input type="text" inputMode="numeric" maxLength={4} value={form.adminCode} onChange={e=>setForm({...form,adminCode:e.target.value.replace(/\D/g,'').slice(0,4)})} className="wire-input mt-1 font-mono tracking-widest" placeholder="e.g. 1234 — leave empty to remove" />
          <p className="text-[11px] font-mono text-zinc-500 mt-1">Exactly 4 digits. Example: 8429. Staff will enter this on their onboarding.</p>
        </div>
        <button type="submit" disabled={loading} className="wire-btn wire-btn-primary"><Save className="h-4 w-4" /> {loading ? 'Saving…' : 'Save Settings'}</button>
      </form>
      <div className="wire-card p-4 bg-zinc-50 border-dashed">
        <p className="text-xs font-mono text-zinc-600"><b>Current user:</b> {user?.name} ({user?.email}) — role: {user?.role} — code: <code className="bg-white border px-1 py-0.5 rounded">{user?.adminCode || '— not set —'}</code></p>
      </div>
    </div>
  );
}
