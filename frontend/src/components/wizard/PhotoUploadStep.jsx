import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPhoto, removePhoto, selectWizard } from '../../features/wizard/wizardSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import CameraCapture from './CameraCapture';
import { Camera, Upload, Trash2, RefreshCcw, Image, AlertCircle, Timer, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PhotoUploadStep({ title, description, photoKey, extraFields, browseAction }) {
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
  React.useEffect(() => { setImgError(false); }, [photoData]);
  const processPhoto = async (base64String) => {
    setErrorMsg('');
    try {
      const location = await getPosition();
      dispatch(setPhoto({ key: photoKey, photoData: base64String, timestamp: new Date().toISOString(), geolocation: location }));
    } catch (e) {
      dispatch(setPhoto({ key: photoKey, photoData: base64String, timestamp: new Date().toISOString(), geolocation: null }));
    }
  };
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorMsg('Invalid file — [ WIREFRAME: only images ]'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) processPhoto(e.target.result); };
    reader.readAsDataURL(file);
  };
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true); else if (e.type === 'dragleave') setIsDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const handleFileInputChange = (e) => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); };
  const handleRemove = () => { dispatch(removePhoto({ key: photoKey })); if (fileInputRef.current) fileInputRef.current.value = ''; };

  return (
    <div className="space-y-5">
      <div className="text-center md:text-left border-2 border-ink bg-white p-4 shadow-[3px_3px_0_0_#111] relative">
        <span className="wire-annotation">[ {photoKey} ]</span>
        <h2 className="font-display text-xl font-bold">[ {title} ]</h2>
        <p className="mt-1 font-mono text-[11px] text-zinc-600">{description}</p>
        <div className="mt-2 font-mono text-[9px] text-zinc-400 border-t border-dashed border-zinc-300 pt-1">✎ WIREFRAME — image placeholder with X — dashed = empty</div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 bg-white border-2 border-red-600 text-red-600 px-3 py-2 font-mono text-xs shadow-[2px_2px_0_0_#dc2626]">
          <AlertCircle className="h-5 w-5" /> <span>[ ERROR ] {errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {!photoData ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-8 text-center border-2 min-h-[280px] ${isDragActive ? 'bg-yellow-50 border-ink border-dashed shadow-[4px_4px_0_0_#111]' : 'bg-white border-ink border-dashed'}`}
          >
            <div className="absolute top-2 left-2 font-mono text-[9px] border border-ink bg-white px-1">[ DROPZONE ]</div>
            <div className="h-14 w-14 border-2 border-ink bg-white flex items-center justify-center relative shadow-[2px_2px_0_0_#111] mb-3">
              <div className="absolute inset-0 wire-placeholder opacity-20" />
              <Upload className="h-6 w-6 text-ink" />
            </div>
            <p className="font-mono text-sm font-bold uppercase">[ Drag & Drop image here ]</p>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">Supports JPEG, PNG, WEBP — [ WIREFRAME PLACEHOLDER ]</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button type="button" onClick={() => setShowCamera(true)} className="flex-1 wire-btn wire-btn-primary">
                <Camera className="h-4 w-4" /> [ Open Camera ]
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 wire-btn">
                <Image className="h-4 w-4" /> [ Browse File ]
              </button>
            </div>
            {browseAction && (
              <button type="button" onClick={browseAction.onClick} className="mt-3 w-full max-w-xs wire-btn !border-dashed">
                {browseAction.icon} <span>{browseAction.label}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
            <div className="absolute bottom-2 right-2 font-mono text-[8px] border border-ink bg-yellow-100 px-1">300×200 — PLACEHOLDER</div>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto w-full">
            <div className="relative overflow-hidden border-2 border-ink bg-white shadow-[3px_3px_0_0_#111] w-full aspect-video">
              {!imgError ? (
                <img src={photoData} alt={title} className="w-full h-full object-cover grayscale" onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full wire-placeholder flex flex-col items-center justify-center p-6 text-center">
                  <span className="bg-white border-2 border-ink px-2 py-1 font-mono text-xs font-bold">[ Image unavailable — X ]</span>
                  <button type="button" onClick={handleRemove} className="mt-2 wire-btn !py-1 !text-xs">Clear & Re-upload</button>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-ink text-white text-[9px] font-mono px-2 py-0.5 border border-ink">[ PREVIEW ]</div>
              <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-white/80 flex items-center justify-center gap-3 transition-opacity">
                <button type="button" onClick={() => setShowCamera(true)} className="h-10 w-10 bg-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#111]"><RefreshCcw className="h-5 w-5" /></button>
                <button type="button" onClick={handleRemove} className="h-10 w-10 bg-red-600 border-2 border-ink text-white flex items-center justify-center shadow-[2px_2px_0_0_#111]"><Trash2 className="h-5 w-5" /></button>
              </div>
              <div className="absolute bottom-2 left-2 bg-white border-2 border-ink text-[10px] font-mono px-2 py-1 flex items-center gap-1">
                <span className="h-2 w-2 bg-ink rounded-full animate-pulse" /> <Clock className="h-3 w-3" /> {metadata?.timestamp ? new Date(metadata.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </div>
            </div>
            {(photoKey === 'handoverPhoto' || photoKey === 'placementPhoto') && (
              <div className="border-2 border-ink bg-yellow-50 px-3 py-2 font-mono text-[11px] flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> [ {photoKey === 'handoverPhoto' ? 'Handover' : 'Placement'} date → AUTO by server ]
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {extraFields && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2 border-t-2 border-dashed border-zinc-300">
            {extraFields}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <CameraCapture label={title} onCapture={(base64) => processPhoto(base64)} onClose={() => setShowCamera(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
