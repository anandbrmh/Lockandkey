import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../features/records/recordsSlice';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { KeyRound, FileText, Lock, Users, LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { stats: liveStats } = useSelector((s) => s.records);

  useEffect(() => { if (isAuthenticated) dispatch(fetchStats()); }, [isAuthenticated, dispatch]);

  const stats = [
    { label: 'Total locks', value: liveStats ? String(liveStats.totalActiveLocks ?? liveStats.totalRecords ?? 0) : '—', icon: Lock },
    { label: 'Keys handed today', value: liveStats ? String(liveStats.keysHandedOutToday ?? 0) : '—', icon: KeyRound },
    { label: 'Top recipient', value: liveStats?.topHandoverRecipients?.[0]?.name || (liveStats ? '—' : '—'), icon: Users },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* hero */}
      <div className="text-center max-w-2xl mx-auto">
  
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold leading-tight">
          Document handover events with precision
        </h1>
        <p className="mt-3 text-sm text-zinc-600 font-mono">
          Log every lock handover with photos, key count and recipient. Minimal, auditable, fast.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/wizard')} className="wire-btn wire-btn-primary">New handover</button>
          <button onClick={() => navigate('/history')} className="wire-btn"><FileText className="h-4 w-4" /> View history</button>
        </div>
        {!isAuthenticated && (
          <div className="mt-4 flex gap-2 justify-center">
            <button onClick={() => navigate('/login')} className="wire-btn text-xs"><LogIn className="h-3.5 w-3.5" /> Login</button>
            <button onClick={() => navigate('/register')} className="wire-btn wire-btn-primary text-xs"><UserPlus className="h-3.5 w-3.5" /> Register</button>
          </div>
        )}
      </div>

      {/* stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="wire-card p-4 flex items-center gap-3">
              <span className="h-9 w-9 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-none truncate">{s.value}</div>
                <div className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
