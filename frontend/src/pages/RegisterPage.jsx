import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, selectAuth } from '../features/auth/authSlice';
import { KeyRound, Mail, Lock, User, UserCog, AlertCircle, Pencil } from 'lucide-react';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser(form));
    if (result.meta.requestStatus === 'fulfilled') navigate('/wizard');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-zinc-500 mb-3">
        <span className="border-2 border-ink bg-yellow-100 px-2 py-0.5 rotate-[0.6deg]">PAGE — REGISTER 05</span>
        <span>┄ 400px FORM ┄</span>
      </div>

      <div className="wire-card p-6 sm:p-8 bg-white relative">
        <div className="wire-tape" />
        <span className="wire-annotation">REGISTER</span>

        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="h-14 w-14 bg-white border-2 border-ink flex items-center justify-center shadow-[3px_3px_0_0_#111] rotate-[0.8deg] relative">
            <div className="absolute inset-0 wire-placeholder opacity-10" />
            <KeyRound className="h-6 w-6 text-ink" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold">Create account</h1>
          <p className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">[ Staff / Admin access — wireframe ]</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-white border-2 border-red-600 text-red-600 px-3 py-2 font-mono text-xs shadow-[2px_2px_0_0_#dc2626]">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="wire-label"><User className="h-3.5 w-3.5" /> [ NAME ]</label>
            <input type="text" required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="wire-input mt-1" placeholder="John Doe — HANDWRITTEN PLACEHOLDER" />
          </div>
          <div>
            <label className="wire-label"><Mail className="h-3.5 w-3.5" /> [ EMAIL ]</label>
            <input type="email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="wire-input mt-1" placeholder="staff@example.com" />
          </div>
          <div>
            <label className="wire-label"><Lock className="h-3.5 w-3.5" /> [ PASSWORD — min 6 ]</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="wire-input mt-1" placeholder="Min 6 chars — ••••••" />
          </div>
          <div>
            <label className="wire-label"><UserCog className="h-3.5 w-3.5" /> [ ROLE ] — select</label>
            <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} className="wire-input mt-1 bg-white">
              <option value="staff">[ STAFF ]</option>
              <option value="admin">[ ADMIN ]</option>
            </select>
            <div className="font-mono text-[9px] text-zinc-400 mt-1">✎ dropdown — 2px border, sketch shadow</div>
          </div>
          <button disabled={loading} className="w-full wire-btn wire-btn-primary !py-3">
            {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Pencil className="h-4 w-4" />}
            <span>{loading ? 'Creating...' : '[ Register ] →'}</span>
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-xs"><span className="bg-zinc-100 border border-ink px-1">Already have account?</span> <Link to="/login" className="underline decoration-2 font-bold">[ Login ]</Link></p>

        <div className="mt-4 border-2 border-dashed border-ink bg-yellow-50 p-2 font-mono text-[10px]">
          <span className="bg-ink text-white px-1">NOTE</span> Wireframe: all inputs 44px min, labels uppercase, buttons hard shadow.
        </div>
      </div>
    </div>
  );
}
