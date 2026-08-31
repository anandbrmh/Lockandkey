import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../features/records/recordsSlice';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { gsap } from 'gsap';
import { KeyRound, FileText, ChevronRight, Activity, Users, Lock, LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { stats: liveStats } = useSelector((s) => s.records);
  const titleRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchStats());
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (titleRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.anim-hero-tag', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5 })
        .fromTo('.anim-hero-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
        .fromTo('.anim-hero-desc', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .fromTo('.anim-hero-btns', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .fromTo('.anim-stat-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, '-=0.2');
    }
  }, []);

  const stats = [
    { label: 'Total Tracked Locks', count: liveStats ? String(liveStats.totalActiveLocks ?? liveStats.totalRecords ?? 0) : '—', icon: Lock, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/40' },
    { label: 'Keys handed today', count: liveStats ? String(liveStats.keysHandedOutToday ?? 0) : '—', icon: KeyRound, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Top recipient', count: liveStats?.topHandoverRecipients?.[0]?.name || (liveStats ? '—' : '—'), icon: Users, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  ];

  return (
    <div ref={containerRef} className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Background radial glow blur patterns */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-amber-600/10 blur-[120px] pointer-events-none z-0" />

      {/* Hero Body */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Animated Badge */}
        <div ref={titleRef} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold text-xs border border-primary-100 dark:border-primary-900/30 mb-6 anim-hero-tag">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          <span>VAULT SECURITY PROTOCOL 2.0</span>
        </div>

        {/* Hero Title */}
        <h1 className="anim-hero-title text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-6xl max-w-3xl leading-none">
          Document Handover Events <br />
          <span className="bg-gradient-to-r from-primary-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            With High Auditable Precision
          </span>
        </h1>

        {/* Hero Description */}
        <p className="anim-hero-desc mt-6 text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
          Log every lock handover instance with high-definition photo verification, key count tallies, and recipient directory details.
        </p>

        {/* Primary Buttons */}
        <div className="anim-hero-btns mt-8 flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-xs sm:max-w-none">
          <button
            onClick={() => navigate('/wizard')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-95 text-base"
          >
            <span>Document New Handover</span>
            <ChevronRight className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => navigate('/history')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold py-4 px-8 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-sm transition-all"
          >
            <FileText className="h-5 w-5" />
            <span>Audit History Logs</span>
          </button>
        </div>

        {/* Auth CTA — Login + Register, horizontal on desktop (md), stacked on mobile */}
        {!isAuthenticated && (
          <div className="anim-hero-btns mt-6 flex flex-col sm:flex-row items-center gap-3 w-full justify-center max-w-xs sm:max-w-none">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold py-3.5 px-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
            >
              <LogIn className="h-5 w-5 text-primary-600" />
              <span>Login</span>
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 px-8 rounded-2xl shadow-md transition-all"
            >
              <UserPlus className="h-5 w-5" />
              <span>Register</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards Section */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="anim-stat-card glass-panel p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-sm flex items-center gap-4 text-left"
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                    {stat.count}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
