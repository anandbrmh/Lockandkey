import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  const sizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <Loader2 className={`${sizeClasses[size] || sizeClasses.medium} animate-spin text-primary-600 dark:text-primary-400`} />
        <div className="absolute inset-0 rounded-full border border-primary-200 dark:border-primary-900 opacity-20 animate-ping"></div>
      </div>
      {message && (
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
