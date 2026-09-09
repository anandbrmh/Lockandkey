import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetWizard } from '../../features/wizard/wizardSlice';
import { Plus, Check } from 'lucide-react';

export default function SuccessAnimation({ onReset }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleReset = () => { if(onReset) onReset(); else dispatch(resetWizard()); navigate('/wizard'); };
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#f8f9fb]">
      <div className="w-full max-w-sm wire-card p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-transparent to-sky-50/30 pointer-events-none" />
        <div className="relative">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900">Created successfully</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">Your handover has been documented and saved.</p>
          <div className="mt-6">
            <button onClick={handleReset} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-black shadow-sm transition-colors">
              <Plus className="h-4 w-4" /> Create New
            </button>
            <p className="mt-3 text-xs text-zinc-400">Ready for next handover</p>
          </div>
        </div>
      </div>
    </div>
  );
}
