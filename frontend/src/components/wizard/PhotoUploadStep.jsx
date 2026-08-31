import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPhoto, removePhoto, selectWizard } from '../../features/wizard/wizardSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import CameraCapture from './CameraCapture';
import { Camera, Upload, Trash2, RefreshCcw, Image, AlertCircle, Timer, Clock, Users, FolderSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PhotoUploadStep({
  title,
  description,
  photoKey,
  extraFields,
  browseAction, // { label, icon, onClick } - for existing person/location browse
}) {
  const dispatch = useDispatch();
  const wizardState = useSelector(selectWizard);
  const photoData = wizardState[photoKey];
  const metadata = wizardState.metadata[photoKey];

  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imgError, setImgError] = useState(false);
  
  const { getPosition } = useGeolocation();

  // Reset img error when photoData changes
  React.useEffect(() => { setImgError(false); }, [photoData]);

  // Handle setting photo + metadata
  const processPhoto = async (base64String) => {
    setErrorMsg('');
    try {
      // Trigger geolocation search immediately
      const location = await getPosition();
      
      dispatch(
        setPhoto({
          key: photoKey,
          photoData: base64String,
          timestamp: new Date().toISOString(),
          geolocation: location,
        })
      );
    } catch (e) {
      console.error(e);
      // Still set the photo even if geolocation fails
      dispatch(
        setPhoto({
          key: photoKey,
          photoData: base64String,
          timestamp: new Date().toISOString(),
          geolocation: null,
        })
      );
    }
  };

  // Convert uploaded file to base64
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file type. Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        processPhoto(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    dispatch(removePhoto({ key: photoKey }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Desc */}
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-100 dark:border-red-950/40">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload/Camera Zone Card */}
      <div className="grid grid-cols-1 gap-6">
        {!photoData ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`dashed-dropzone relative flex flex-col items-center justify-center p-8 text-center border-2 border-transparent transition-all min-h-[300px] ${
              isDragActive
                ? 'dashed-dropzone-active bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'bg-white dark:bg-slate-900/60 shadow-sm'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 mb-4 shadow-inner">
              <Upload className="h-6 w-6" />
            </div>

            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
              Drag & Drop your image here
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Supports JPEG, PNG, WEBP (max 10MB)
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-primary-500/10 transition-all hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Camera className="h-4.5 w-4.5" />
                <span>Open Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all"
              >
                <Image className="h-4.5 w-4.5" />
                <span>Browse File</span>
              </button>
            </div>

            {browseAction && (
              <button
                type="button"
                onClick={browseAction.onClick}
                className="mt-3 w-full max-w-xs flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all hover:bg-primary-50 dark:hover:bg-primary-950/30"
              >
                {browseAction.icon || <FolderSearch className="h-4.5 w-4.5" />}
                <span>{browseAction.label}</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto w-full">
            <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group shadow-md w-full aspect-video">
              {!imgError ? (
                <img
                  src={photoData}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 p-6 text-center">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-60" />
                  <p className="text-xs font-bold">Image unavailable</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">File was deleted or URL expired. Please re-upload.</p>
                  <button type="button" onClick={handleRemove} className="mt-3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300">Clear & Re-upload</button>
                </div>
              )}

              {/* Hover Action Overlay */}
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-xl transition-colors shadow-sm focus:outline-none"
                  title="Retake image"
                >
                  <RefreshCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-xl transition-colors shadow-md focus:outline-none"
                  title="Delete image"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Reused badge */}
              {metadata?.reused && (
                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <FolderSearch className="h-3 w-3" /> Reused — no new upload
                </div>
              )}
              {/* Micro Metadata Indicator (Bottom Left) */}
              <div className="absolute bottom-3 left-3 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-white/5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {metadata?.timestamp ? new Date(metadata.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            {/* System-auto date note for handover/placement */}
            {(photoKey === 'handoverPhoto' || photoKey === 'placementPhoto') && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <Timer className="h-3.5 w-3.5" />
                <span>{photoKey === 'handoverPhoto' ? 'Handover' : 'Placement'} date/time will be set automatically by server on upload — no manual input needed</span>
              </div>
            )}
            {photoKey === 'handoverPhoto' && metadata?.timestamp && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <Clock className="h-3 w-3" />
                <span>Client capture: {new Date(metadata.timestamp).toLocaleString()} — server will overwrite with system time on submit</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extra Step Form Fields (Rendered if provided) */}
      <AnimatePresence>
        {extraFields && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="pt-2"
          >
            {extraFields}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Camera Capture Overlays */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <CameraCapture
              label={title}
              onCapture={(base64) => processPhoto(base64)}
              onClose={() => setShowCamera(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
