import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../features/records/recordsSlice';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { gsap } from 'gsap';
import { KeyRound, FileText, ChevronRight, Activity, Users, Lock, LogIn, UserPlus, Pencil, Ruler, Eye } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { stats: liveStats } = useSelector((s) => s.records);
  const titleRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchStats());
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (titleRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.fromTo('.anim-hero-tag', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 })
        .fromTo('.anim-hero-title', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.2')
        .fromTo('.anim-stat', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, '-=0.3');
    }
  }, []);

  const stats = [
    { label: 'TOTAL TRACKED LOCKS', count: liveStats ? String(liveStats.totalActiveLocks ?? liveStats.totalRecords ?? 0) : '?', icon: Lock, note: 'A' },
    { label: 'KEYS HANDED TODAY', count: liveStats ? String(liveStats.keysHandedOutToday ?? 0) : '?', icon: KeyRound, note: 'B' },
    { label: 'TOP RECIPIENT', count: liveStats?.topHandoverRecipients?.[0]?.name || (liveStats ? '—' : '?'), icon: Users, note: 'C' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* blueprint header annotation */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-zinc-500">
          <span className="border border-ink px-2 py-0.5 bg-yellow-100 rotate-[-0.5deg]">WIREFRAME — HOME 01</span>
          <span className="hidden sm:inline">┄┄┄ 1200px CONTAINER ┄┄┄</span>
          <span className="ml-auto flex items-center gap-1"><Ruler className="h-3 w-3" /> 24px GRID</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col items-center">
        {/* annotation arrows */}
        <div className="hidden lg:block absolute left-2 top-20 font-mono text-[10px] text-zinc-400 rotate-[-2deg]">← 48px margin</div>
        <div className="hidden lg:block absolute right-2 top-20 font-mono text-[10px] text-zinc-400 rotate-[1deg]">margin 48px →</div>

        <div ref={titleRef} className="w-full max-w-3xl flex flex-col items-center text-center">
          <div className="anim-hero-tag inline-flex items-center gap-2 bg-white border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0_0_#111] rotate-[-0.6deg] mb-6">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Vault Security Protocol — V2.0 — WIREFRAME</span>
            <span className="bg-ink text-white text-[8px] px-1.5 py-0.5 ml-1">DRAFT</span>
          </div>

          <h1 className="anim-hero-title font-display text-[34px] sm:text-[54px] font-bold leading-[0.95] tracking-tight text-ink">
            <span className="inline-block border-2 border-ink bg-white px-2 py-1 rotate-[-0.4deg] shadow-[4px_4px_0_0_#111]">Document</span>
            <span className="block mt-2">Handover Events</span>
            <span className="block mt-2 font-mono text-[13px] font-bold tracking-[0.2em] uppercase bg-yellow-200 border-y-2 border-ink px-2 py-1 inline-block rotate-[0.4deg]">
              With Auditable Precision ✎
            </span>
          </h1>

          <p className="mt-6 font-mono text-[13px] leading-relaxed text-zinc-600 max-w-xl border-l-2 border-ink pl-4 text-left bg-white/60">
            <span className="bg-ink text-white px-1 text-[10px]">NOTE</span> Log every lock handover with photo verification, key count & recipient directory. <span className="underline decoration-wavy">Low-fi blueprint</span> — final visuals to be designed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button onClick={() => navigate('/wizard')} className="wire-btn wire-btn-primary text-base !px-8 !py-4">
              <Pencil className="h-5 w-5" /> Document New Handover
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/history')} className="wire-btn !px-8 !py-4 bg-white">
              <FileText className="h-5 w-5" /> Audit History Logs
            </button>
          </div>

          {!isAuthenticated && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full justify-center max-w-md">
              <button onClick={() => navigate('/login')} className="flex-1 wire-btn">
                <LogIn className="h-4 w-4" /> [ Login ]
              </button>
              <button onClick={() => navigate('/register')} className="flex-1 wire-btn bg-ink text-white">
                <UserPlus className="h-4 w-4" /> [ Register ]
              </button>
            </div>
          )}

          {/* redline annotation */}
          <div className="mt-6 flex items-center gap-2 font-mono text-[10px] text-red-500">
            <span className="h-px w-6 bg-red-500" /> <Eye className="h-3 w-3" /> WIREFRAME: All colors are placeholder — final palette TBD <span className="h-px w-6 bg-red-500" />
          </div>
        </div>

        {/* Stats as wireframe cards */}
        <div className="w-full max-w-5xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="anim-stat wire-card p-4 flex items-center gap-4 bg-white relative wire-wobble">
                <span className="wire-annotation">0{idx + 1}</span>
                <div className="h-12 w-12 border-2 border-ink bg-zinc-50 flex items-center justify-center relative">
                  <div className="absolute inset-0 wire-placeholder opacity-10" />
                  <Icon className="h-6 w-6 text-ink" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold leading-none">{s.count}</div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">[ {s.label} ]</div>
                </div>
                <div className="ml-auto font-mono text-[9px] border border-dashed border-ink px-1.5 py-1 bg-yellow-50">
                  {s.note} — BOX
                </div>
              </div>
            );
          })}
        </div>

        {/* blueprint footer measurements */}
        <div className="w-full mt-8 flex justify-between font-mono text-[9px] text-zinc-400 border-t-2 border-dashed border-zinc-300 pt-2">
          <span>← 0</span>
          <span>WIREFRAME GRID — 24px — LOW FIDELITY</span>
          <span>1200 →</span>
        </div>
      </div>
    </div>
  );
}
