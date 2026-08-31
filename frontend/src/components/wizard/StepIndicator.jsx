import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Camera, Key, MapPin, User, CheckCircle } from 'lucide-react';

export default function StepIndicator({ currentStep }) {
  const steps = [
    { label: 'Lock', icon: Camera },
    { label: 'Key', icon: Key },
    { label: 'Placement', icon: MapPin },
    { label: 'Handover', icon: User },
    { label: 'Review', icon: CheckCircle },
  ];

  const progressRef = useRef(null);

  useEffect(() => {
    // Animate stepper bar fill using GSAP
    if (progressRef.current) {
      const percentage = (currentStep / (steps.length - 1)) * 100;
      gsap.to(progressRef.current, {
        width: `${percentage}%`,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }, [currentStep, steps.length]);

  return (
    <div className="w-full">
      {/* Mobile Compact Progress Bar */}
      <div className="block md:hidden mb-6">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
          <span>STEP {currentStep + 1} OF {steps.length}</span>
          <span className="text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider">
            {steps[currentStep].label} PHOTO
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-primary-600 to-amber-500 rounded-full"
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Desktop Gorgeous Timeline Stepper */}
      <div className="hidden md:block relative mb-12">
        {/* Track Bar background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full" />
        
        {/* Fill Bar (GSAP targeted) */}
        <div
          ref={progressRef}
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary-600 to-amber-500 -translate-y-1/2 rounded-full"
          style={{ width: '0%' }}
        />

        {/* Step Nodes */}
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 z-10 ${
                    isCompleted
                      ? 'bg-gradient-to-tr from-primary-600 to-amber-600 border-transparent text-white shadow-md shadow-primary-500/20'
                      : isActive
                      ? 'bg-white dark:bg-slate-900 border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400 ring-4 ring-primary-500/10 dark:ring-primary-400/10 font-bold scale-110 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`mt-2 text-xs font-semibold tracking-wide uppercase transition-colors duration-300 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
