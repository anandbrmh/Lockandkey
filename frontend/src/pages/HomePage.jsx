import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../features/records/recordsSlice';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSlice';
import { KeyRound, Lock, Users, LogIn, UserPlus, Plus, ArrowRight, Home as HomeIcon, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const { stats: liveStats } = useSelector((s) => s.records);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => { if (isAuthenticated) dispatch(fetchStats()); }, [isAuthenticated, dispatch]);

  const totalLocks = liveStats ? String(liveStats.totalActiveLocks ?? liveStats.totalRecords ?? 0) : '—';
  const keysToday = liveStats ? String(liveStats.keysHandedOutToday ?? 0) : '—';
  const topRecipient = liveStats?.topHandoverRecipients?.[0]?.name || '—';

  return (
    <div className="min-h-screen bg-[#f8f9fb] w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8 space-y-4 sm:space-y-6">
        {/* Hero — fully responsive */}
        <div className="wire-card p-4 sm:p-6 lg:p-7 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/60 via-transparent to-violet-50/40 pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5 xl:gap-8">
            <div className="min-w-0 flex-1 max-w-full xl:max-w-[560px]">
              <div className="inline-flex flex-wrap items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm text-[11px] sm:text-xs font-medium text-zinc-600 max-w-full">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          
                <span className="h-3 w-px bg-zinc-200 hidden sm:block shrink-0" />
                <span className="text-zinc-400 truncate hidden sm:inline">Lock & Key</span>
              </div>
          
              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                {isAdmin ? (
                  <button onClick={() => navigate('/wizard')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-black shadow-sm">
                    <Plus className="h-4 w-4 shrink-0" /> Create New
                  </button>
                ) : (
                  <button onClick={() => navigate('/login')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-black shadow-sm">
                    <LogIn className="h-4 w-4 shrink-0" /> Get started
                  </button>
                )}
                <button onClick={() => navigate('/locks-directory')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  View Locks <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>

            {/* Stats strip — responsive: stack on very small, 3 cols on mobile, row on desktop */}
            <div className="w-full xl:w-[320px] shrink-0 grid grid-cols-3 xl:grid-cols-1 gap-0 divide-x xl:divide-x-0 xl:divide-y divide-zinc-100 bg-white xl:bg-transparent rounded-2xl xl:rounded-none border xl:border-0 border-zinc-200 overflow-hidden">
              <div className="flex flex-col items-center xl:flex-row xl:items-center gap-1.5 sm:gap-2 xl:gap-3 py-3 sm:py-3.5 xl:py-4 px-1 sm:px-2 xl:px-0">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="text-center xl:text-left min-w-0">
                  <div className="text-base sm:text-xl font-semibold leading-none text-zinc-900">{totalLocks}</div>
                  <div className="text-[9px] sm:text-[11px] font-semibold tracking-widest uppercase text-zinc-400 mt-1">Total Locks</div>
                </div>
              </div>
              <div className="flex flex-col items-center xl:flex-row xl:items-center gap-1.5 sm:gap-2 xl:gap-3 py-3 sm:py-3.5 xl:py-4 px-1 sm:px-2 xl:px-0">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="text-center xl:text-left min-w-0">
                  <div className="text-base sm:text-xl font-semibold leading-none text-zinc-900">{keysToday}</div>
                  <div className="text-[9px] sm:text-[11px] font-semibold tracking-widest uppercase text-zinc-400 mt-1">Keys Today</div>
                </div>
              </div>
              <div className="flex flex-col items-center xl:flex-row xl:items-center gap-1.5 sm:gap-2 xl:gap-3 py-3 sm:py-3.5 xl:py-4 px-1 sm:px-2 xl:px-0">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-center xl:text-left min-w-0 w-full">
                  <div className="text-xs sm:text-sm font-semibold leading-tight truncate text-zinc-900 mx-auto xl:mx-0 max-w-[70px] sm:max-w-[90px] xl:max-w-[150px]">{topRecipient}</div>
                  <div className="text-[9px] sm:text-[11px] font-semibold tracking-widest uppercase text-zinc-400 mt-1 truncate">Top Recipient</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto wire-btn text-sm justify-center"><LogIn className="h-4 w-4" /> Login</button>
            <button onClick={() => navigate('/register')} className="w-full sm:w-auto wire-btn wire-btn-primary text-sm justify-center"><UserPlus className="h-4 w-4" /> Register</button>
          </div>
        )}

        {/* Navigation grid — responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 px-1">Navigate</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Home */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group text-left wire-card p-4 sm:p-5 flex flex-row sm:flex-col gap-4 sm:gap-4 items-center sm:items-start hover:shadow-md hover:border-zinc-300 transition-all bg-white relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none hidden sm:block" />
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-sm relative shrink-0">
                <HomeIcon className="h-5 w-5" />
              </div>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <div className="text-[15px] font-semibold text-zinc-900">Home</div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed hidden sm:block">Dashboard overview — you are here</div>
                <div className="text-xs text-zinc-500 sm:hidden truncate">Dashboard overview</div>
              </div>
              <div className="hidden sm:inline-flex mt-auto items-center gap-1 text-xs font-medium text-sky-600">
                Current <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 sm:hidden shrink-0 ml-auto" />
            </button>

            {/* Create New */}
            <button onClick={() => navigate('/wizard')} className="group text-left wire-card p-4 sm:p-5 flex flex-row sm:flex-col gap-4 sm:gap-4 items-center sm:items-start hover:shadow-md hover:border-zinc-300 transition-all bg-white relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none hidden sm:block" />
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm relative group-hover:scale-105 transition-transform shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <div className="text-[15px] font-semibold text-zinc-900 flex flex-wrap items-center gap-1.5">Create New <span className="text-[10px] leading-none px-1.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold tracking-widest">NEW</span></div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed hidden sm:block">New handover with photos</div>
                <div className="text-xs text-zinc-500 sm:hidden truncate">New handover</div>
              </div>
              <div className="hidden sm:inline-flex mt-auto items-center gap-1 text-xs font-medium text-zinc-900 group-hover:gap-1.5 transition-all">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 sm:hidden shrink-0 ml-auto" />
            </button>

            {/* Locks */}
            <button onClick={() => navigate('/locks-directory')} className="group text-left wire-card p-4 sm:p-5 flex flex-row sm:flex-col gap-4 sm:gap-4 items-center sm:items-start hover:shadow-md hover:border-zinc-300 transition-all bg-white relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none hidden sm:block" />
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-violet-500 text-white flex items-center justify-center shadow-sm relative group-hover:scale-105 transition-transform shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <div className="text-[15px] font-semibold text-zinc-900">Locks</div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed hidden sm:block">{totalLocks} records · photos & keys</div>
                <div className="text-xs text-zinc-500 sm:hidden truncate">{totalLocks} records</div>
              </div>
              <div className="hidden sm:inline-flex mt-auto items-center gap-1 text-xs font-medium text-zinc-900 group-hover:gap-1.5 transition-all">
                View <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 sm:hidden shrink-0 ml-auto" />
            </button>

            {/* Users */}
            <button onClick={() => navigate('/assigned-users')} className="group text-left wire-card p-4 sm:p-5 flex flex-row sm:flex-col gap-4 sm:gap-4 items-center sm:items-start hover:shadow-md hover:border-zinc-300 transition-all bg-white relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none hidden sm:block" />
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-sm relative group-hover:scale-105 transition-transform shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <div className="text-[15px] font-semibold text-zinc-900">Users</div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed hidden sm:block">Assigned users & handovers</div>
                <div className="text-xs text-zinc-500 sm:hidden truncate">Assigned users</div>
              </div>
              <div className="hidden sm:inline-flex mt-auto items-center gap-1 text-xs font-medium text-zinc-900 group-hover:gap-1.5 transition-all">
                View <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 sm:hidden shrink-0 ml-auto" />
            </button>
          </div>
        </div>

      
      </div>
    </div>
  );
}
