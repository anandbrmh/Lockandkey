import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectWizard } from '../../features/wizard/wizardSlice';
import { gsap } from 'gsap';
import { Calendar, User, Briefcase, Phone, Hash, Key, CheckSquare } from 'lucide-react';

export default function ReviewSubmit({ onSubmit, isSubmitting }) {
  const wizardState = useSelector(selectWizard);
  const containerRef = useRef(null);

  const {
    lockPhoto,
    keyPhoto,
    keyCount,
    placementPhoto,
    handoverPhoto,
    handoverName,
    handoverRole,
    handoverContact,
    metadata
  } = wizardState;

  useEffect(() => {
    // GSAP staggered reveal on review panels
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll('.reveal-item');
      gsap.fromTo(
        items,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  const photos = [
    { label: 'Lock Photo', src: lockPhoto, meta: metadata.lockPhoto },
    { label: `Key Photo (${keyCount} ${keyCount === 1 ? 'key' : 'keys'})`, src: keyPhoto, meta: metadata.keyPhoto },
    { label: 'Placement Photo', src: placementPhoto, meta: metadata.placementPhoto },
    { label: 'Handover Photo', src: handoverPhoto, meta: metadata.handoverPhoto },
  ];

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Title */}
      <div className="text-center md:text-left reveal-item">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl">
          Review & Submit Record
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please confirm all details are correct before saving to the system.
          </p>
          <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-800 dark:text-primary-350 font-bold text-xs border border-primary-200 dark:border-primary-900/30">
            <Key className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
            <span>Total Handovers: {keyCount} {keyCount === 1 ? 'Key' : 'Keys'}</span>
          </div>
        </div>
      </div>

      {/* Grid of Photos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-item">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col"
          >
            <div className="aspect-square w-full overflow-hidden bg-slate-900 relative">
              {photo.src ? (
                <img
                  src={photo.src}
                  alt={photo.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Missing</div>
              )}
            </div>
            
            <div className="p-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                {photo.label}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {photo.meta?.timestamp
                  ? new Date(photo.meta.timestamp).toLocaleTimeString()
                  : 'N/A'}
              </p>
              {photo.meta?.geolocation && (
                <p className="text-[9px] text-primary-600 dark:text-primary-400 mt-0.5 flex items-center gap-0.5 truncate font-medium">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {photo.meta.geolocation.latitude.toFixed(4)}, {photo.meta.geolocation.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Handover Details */}
        <div className="reveal-item p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-250/60 dark:border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
            <span>Handover Person</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Name
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{handoverName}</span>
            </div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Designation
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{handoverRole}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Contact
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {handoverContact || <span className="italic text-slate-400">Not Provided</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Lock State Details */}
        <div className="reveal-item p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-250/60 dark:border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
            <Key className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
            <span>Key Records</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Handed Over
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-extrabold text-sm border border-primary-100 dark:border-primary-900/30">
                {keyCount} {keyCount === 1 ? 'Key' : 'Keys'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Log Timestamp</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-350">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wide text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-505 bg-amber-500 animate-pulse" />
                Awaiting Upload
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="reveal-item pt-4 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-650 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:scale-100"
        >
          {isSubmitting ? (
            <>
              <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
              <span>Submitting Records...</span>
            </>
          ) : (
            <span>Submit to Vault</span>
          )}
        </button>
      </div>
    </div>
  );
}
