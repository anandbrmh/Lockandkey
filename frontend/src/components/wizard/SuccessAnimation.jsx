import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetWizard } from '../../features/wizard/wizardSlice';
import { History, Plus } from 'lucide-react';

export default function SuccessAnimation({ onReset }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleReset = () => { if(onReset) onReset(); else dispatch(resetWizard()); navigate('/wizard'); };
  const handleHistory = () => { if(onReset) onReset(); else dispatch(resetWizard()); navigate('/history'); };
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md wire-card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border border-zinc-900 flex items-center justify-center bg-white">✓</div>
        <h2 className="mt-4 text-lg font-semibold">Saved</h2>
        <p className="mt-1 text-xs font-mono text-zinc-500">Handover documented.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={handleHistory} className="flex-1 wire-btn text-xs"><History className="h-3.5 w-3.5" /> History</button>
          <button onClick={handleReset} className="flex-1 wire-btn wire-btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> New</button>
        </div>
      </div>
    </div>
  );
}
