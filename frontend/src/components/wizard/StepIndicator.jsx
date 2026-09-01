import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Camera, Key, MapPin, User, CheckCircle } from 'lucide-react';

export default function StepIndicator({ currentStep }) {
  const steps = [
    { label: 'Lock', icon: Camera, note: '01' },
    { label: 'Key', icon: Key, note: '02' },
    { label: 'Place', icon: MapPin, note: '03' },
    { label: 'Handover', icon: User, note: '04' },
    { label: 'Review', icon: CheckCircle, note: '05' },
  ];

  const progressRef = useRef(null);

  useEffect(() => {
    if (progressRef.current) {
      const percentage = (currentStep / (steps.length - 1)) * 100;
      gsap.to(progressRef.current, { width: `${percentage}%`, duration: 0.5, ease: 'power2.out' });
    }
  }, [currentStep, steps.length]);

  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="block md:hidden mb-6">
        <div className="flex justify-between items-center font-mono text-[10px] font-bold uppercase tracking-widest mb-2">
          <span className="border-2 border-ink bg-white px-2 py-0.5">STEP {currentStep + 1} / {steps.length}</span>
          <span className="border-2 border-ink bg-ink text-white px-2 py-0.5">[{steps[currentStep].label}]</span>
        </div>
        <div className="w-full h-3 bg-white border-2 border-ink relative overflow-hidden">
          <div ref={progressRef} className="h-full bg-ink" style={{ width: '0%' }} />
          <div className="absolute inset-0 flex justify-between px-1 items-center">
            {steps.map((_, i) => <div key={i} className="w-px h-full bg-ink opacity-20" />)}
          </div>
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] text-zinc-500">
          <span>0</span><span>WIREFRAME — 5 STEPS</span><span>100</span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block relative mb-10">
        <div className="absolute top-1/2 left-0 w-full h-[3px] bg-white border border-ink -translate-y-1/2" />
        <div ref={progressRef} className="absolute top-1/2 left-0 h-[3px] bg-ink -translate-y-1/2" style={{ width: '0%' }} />
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div className={`h-11 w-11 flex items-center justify-center border-2 bg-white relative ${isCompleted ? 'bg-ink text-white border-ink shadow-[2px_2px_0_0_#111]' : isActive ? 'bg-yellow-100 border-ink shadow-[3px_3px_0_0_#111] rotate-[1deg] scale-110' : 'border-dashed border-ink text-zinc-400 bg-zinc-50'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 bg-ink text-white text-[8px] font-mono px-1 border border-ink">{step.note}</span>
                </div>
                <span className={`font-mono text-[10px] font-bold uppercase tracking-widest border px-1.5 py-0.5 ${isActive ? 'bg-ink text-white border-ink' : isCompleted ? 'bg-white border-ink text-ink' : 'bg-transparent border-transparent text-zinc-400'}`}>
                  [{step.label}]
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between font-mono text-[9px] text-zinc-400">
          <span>← START</span><span>[ WIREFRAME STEPPER — 2px SOLID, DASHED = PENDING ]</span><span>REVIEW →</span>
        </div>
      </div>
    </div>
  );
}
