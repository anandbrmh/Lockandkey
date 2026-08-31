import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, selectAuth } from '../features/auth/authSlice';
import { KeyRound, Mail, Lock, User, UserCog, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser(form));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/wizard');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="glass-panel p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-black text-slate-800 dark:text-white">Create account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Staff / Admin access</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Name</label>
            <input type="text" required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="John Doe" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</label>
            <input type="email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="staff@example.com" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Min 6 chars" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> Role</label>
            <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50">
            {loading ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            <span>{loading ? 'Creating...' : 'Register'}</span>
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Already have account? <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold">Login</Link></p>
      </div>
    </div>
  );
}
