import React from 'react';
import { Camera, Key, MapPin, User, CheckCircle } from 'lucide-react';

export default function StepIndicator({ currentStep }) {
  const steps = [
    { label: 'Lock', icon: Camera },
    { label: 'Key', icon: Key },
    { label: 'Place', icon: MapPin },
    { label: 'Handover', icon: User },
    { label: 'Review', icon: CheckCircle },
  ];
  const pct = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* progress bar */}
      <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-1">
        <span>Step {currentStep + 1} / {steps.length}</span><span>{steps[currentStep].label}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-100 border border-zinc-200 rounded-full overflow-hidden">
        <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 hidden md:flex justify-between">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs ${done ? 'bg-zinc-900 text-white border-zinc-900' : active ? 'bg-white border-zinc-900 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-400'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className={`text-[11px] font-mono ${active ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
