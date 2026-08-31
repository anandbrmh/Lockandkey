import React from 'react';
import LockKeyUploadWizard from '../components/wizard/LockKeyUploadWizard';

export default function WizardPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-300 py-6">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-primary-600/5 blur-[100px] pointer-events-none z-0" />
      <div className="relative z-10">
        <LockKeyUploadWizard />
      </div>
    </div>
  );
}
