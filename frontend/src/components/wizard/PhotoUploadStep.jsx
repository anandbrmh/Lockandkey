import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPhoto, removePhoto, selectWizard } from '../../features/wizard/wizardSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import CameraCapture from './CameraCapture';
import { Camera, Upload, Trash2, RefreshCcw, AlertCircle, Clock } from 'lucide-react';
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
    } catch { dispatch(setPhoto({ key: photoKey, photoData: base64String, timestamp: new Date().toISOString(), geolocation: null })); }
  };
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorMsg('Only images allowed'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) processPhoto(e.target.result); };
    reader.readAsDataURL(file);
  };
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true); else if (e.type === 'dragleave') setIsDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); };

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg bg-white p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs font-mono text-zinc-500">{description}</p>
      </div>

      {errorMsg && <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs"><AlertCircle className="h-4 w-4" /> {errorMsg}</div>}

      {!photoData ? (
        <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 text-center border rounded-lg min-h-[220px] ${isDragActive ? 'bg-zinc-50 border-zinc-900 border-dashed' : 'bg-white border-dashed border-zinc-300'}`}>
          <span className="h-10 w-10 border border-zinc-200 rounded-md bg-zinc-50 flex items-center justify-center"><Upload className="h-5 w-5 text-zinc-500" /></span>
          <p className="mt-3 text-xs font-mono font-medium">Drag & drop image</p>
          <p className="text-[11px] font-mono text-zinc-500">JPEG, PNG, WEBP</p>
          <div className="mt-4 flex gap-2 w-full max-w-xs">
            <button type="button" onClick={() => setShowCamera(true)} className="flex-1 wire-btn wire-btn-primary text-xs"><Camera className="h-3.5 w-3.5" /> Camera</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 wire-btn text-xs"><Upload className="h-3.5 w-3.5" /> Browse</button>
          </div>
          {browseAction && <button type="button" onClick={browseAction.onClick} className="mt-2 w-full max-w-xs wire-btn text-xs border-dashed">{browseAction.label}</button>}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      ) : (
        <div className="max-w-md mx-auto w-full space-y-2">
          <div className="relative overflow-hidden border border-zinc-200 rounded-lg bg-white aspect-video flex items-center justify-center">
            {!imgError ? <img src={photoData} alt={title} className="w-full h-full object-cover" onError={() => setImgError(true)} /> : <span className="text-xs font-mono text-zinc-500">Image unavailable</span>}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-white/80 flex items-center justify-center gap-2 transition-opacity">
              <button type="button" onClick={() => setShowCamera(true)} className="h-9 w-9 bg-white border border-zinc-900 rounded-md flex items-center justify-center"><RefreshCcw className="h-4 w-4" /></button>
              <button type="button" onClick={() => { dispatch(removePhoto({ key: photoKey })); if(fileInputRef.current) fileInputRef.current.value=''; }} className="h-9 w-9 bg-zinc-900 text-white rounded-md flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 border border-zinc-200 rounded px-2 py-1 bg-white"><Clock className="h-3 w-3" /> {metadata?.timestamp ? new Date(metadata.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}</div>
        </div>
      )}

      <AnimatePresence>
        {extraFields && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 border-t border-dashed border-zinc-200">{extraFields}</motion.div>}
      </AnimatePresence>
      {showCamera && <div className="fixed inset-0 z-50"><CameraCapture label={title} onCapture={(b)=>processPhoto(b)} onClose={() => setShowCamera(false)} /></div>}
    </div>
  );
}
