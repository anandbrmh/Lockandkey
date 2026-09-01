import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, selectAuth } from '../features/auth/authSlice';
import { KeyRound, Mail, Lock, LogIn, AlertCircle, Eye, Pencil } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (result.meta.requestStatus === 'fulfilled') navigate('/wizard');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {/* blueprint header */}
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-zinc-500 mb-3">
        <span className="border-2 border-ink bg-yellow-100 px-2 py-0.5 rotate-[-0.5deg]">PAGE — LOGIN 04</span>
        <span>┄ 400px FORM ┄</span>
      </div>

      <div className="wire-card p-6 sm:p-8 bg-white relative">
        <div className="wire-tape" />
        <span className="wire-annotation">LOGIN</span>

        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="h-14 w-14 bg-white border-2 border-ink flex items-center justify-center relative shadow-[3px_3px_0_0_#111] rotate-[-1deg]">
            <div className="absolute inset-0 wire-placeholder opacity-10" />
            <KeyRound className="h-6 w-6 text-ink" />
            <span className="absolute -bottom-1 -right-1 bg-ink text-white text-[7px] px-1 font-mono">ICON</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">[ Login to manage lock records ]</p>
          <div className="mt-2 h-px w-24 bg-ink" />
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-white border-2 border-red-600 text-red-600 px-3 py-2 font-mono text-xs shadow-[2px_2px_0_0_#dc2626]">
            <AlertCircle className="h-4 w-4" /> {error}
            <span className="ml-auto text-[9px] border border-red-600 px-1">ERROR</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="wire-label"><Mail className="h-3.5 w-3.5" /> [ EMAIL ] — required</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="wire-input mt-1" placeholder="admin@lockkey.local — PLACEHOLDER" />
            <div className="font-mono text-[9px] text-zinc-400 mt-1">✎ field • 44px min-height • focus → yellow</div>
          </div>
          <div>
            <label className="wire-label"><Lock className="h-3.5 w-3.5" /> [ PASSWORD ]</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="wire-input mt-1" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="w-full wire-btn wire-btn-primary !py-3">
            {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-4 w-4" />}
            <span>{loading ? 'Signing in...' : '[ Login ] →'}</span>
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
          <span className="h-px flex-1 bg-zinc-300" /> <Eye className="h-3 w-3" /> WIREFRAME: DASHED PLACEHOLDER FOR IMAGE <span className="h-px flex-1 bg-zinc-300" />
        </div>

        <p className="mt-4 text-center font-mono text-xs">
          <span className="bg-yellow-100 border border-ink px-1">No account?</span> <Link to="/register" className="underline decoration-2 underline-offset-4 font-bold">[ Register ]</Link>
        </p>

        <div className="mt-6 border-2 border-dashed border-zinc-300 p-3 bg-zinc-50 font-mono text-[10px] leading-relaxed">
          <span className="bg-ink text-white px-1">ANNOTATION</span> Low-fi: inputs are 2px solid, buttons have 4px hard shadow. Hover moves 1px.
        </div>
      </div>

      <div className="mt-3 flex justify-between font-mono text-[9px] text-zinc-400">
        <span>← 400px</span><span>WIREFRAME — NOT FINAL — 24px GRID</span><span>400px →</span>
      </div>
    </div>
  );
}
