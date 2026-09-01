import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, selectAuth } from '../features/auth/authSlice';
import { KeyRound, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (result.meta.requestStatus === 'fulfilled') {
      const role = result.payload?.user?.role;
      // Staff users must complete staff profile before wizard — redirect to onboarding
      if (role === 'staff') {
        // Check staff completion via API before deciding
        try {
          const api = (await import('../app/api')).default;
          const { data } = await api.get('/staff/check');
          if (!data?.completed) navigate('/staff/complete');
          else navigate('/wizard');
        } catch {
          navigate('/staff/complete');
        }
      } else {
        navigate('/wizard');
      }
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="wire-card p-6 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="h-10 w-10 border border-zinc-900 rounded-md flex items-center justify-center bg-white"><KeyRound className="h-5 w-5" /></span>
          <h1 className="mt-3 text-xl font-semibold">Welcome back</h1>
          <p className="text-xs font-mono text-zinc-500">Login to continue</p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <label className="wire-label flex items-center gap-1"><Mail className="h-3 w-3" /> Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="wire-input mt-1" placeholder="you@example.com" />
          </div>
          <div>
            <label className="wire-label flex items-center gap-1"><Lock className="h-3 w-3" /> Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="wire-input mt-1" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="w-full wire-btn wire-btn-primary">
            {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs font-mono">
          No account? <Link to="/register" className="underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
