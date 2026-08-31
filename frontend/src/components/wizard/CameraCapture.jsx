import React, { useEffect, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { X, Camera, RotateCw, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CameraCapture({ label, onCapture, onClose }) {
  const {
    videoRef,
    stream,
    permissionStatus,
    errorMsg,
    startCamera,
    stopCamera,
    capturePhoto,
  } = useCamera();

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [capturedData, setCapturedData] = useState(null);

  // Initialize camera stream
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      setCapturedData(photo);
    }
  };

  const handleRetake = () => {
    setCapturedData(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedData) {
      onCapture(capturedData);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md">
        <h3 className="text-base font-semibold tracking-wide uppercase">
          Capture: <span className="text-primary-400 font-bold">{label}</span>
        </h3>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Stream Live Preview */}
        {!capturedData && permissionStatus === 'granted' && (
          <div className="relative w-full h-full max-w-lg max-h-[70vh] flex items-center justify-center bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder Target Graphic overlay */}
            <div className="absolute inset-6 border border-white/20 pointer-events-none rounded-2xl flex items-center justify-center">
              <div className="w-10 h-10 border-t-2 border-l-2 border-primary-500 absolute top-0 left-0 rounded-tl-lg" />
              <div className="w-10 h-10 border-t-2 border-r-2 border-primary-500 absolute top-0 right-0 rounded-tr-lg" />
              <div className="w-10 h-10 border-b-2 border-l-2 border-primary-500 absolute bottom-0 left-0 rounded-bl-lg" />
              <div className="w-10 h-10 border-b-2 border-r-2 border-primary-500 absolute bottom-0 right-0 rounded-br-lg" />
              <div className="h-px w-8 bg-primary-500/30" />
              <div className="w-px h-8 bg-primary-500/30 absolute" />
            </div>
          </div>
        )}

        {/* Captured Freeze Image Preview */}
        {capturedData && (
          <div className="relative w-full h-full max-w-lg max-h-[70vh] flex items-center justify-center bg-slate-950">
            <img
              src={capturedData}
              alt="Captured Frame"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
              ✓ Ready to Use
            </div>
          </div>
        )}

        {/* Permission Pending / Error States */}
        {!capturedData && permissionStatus !== 'granted' && (
          <div className="px-6 text-center max-w-md flex flex-col items-center">
            {permissionStatus === 'denied' ? (
              <>
                <div className="h-16 w-16 bg-red-950/50 border border-red-500 text-red-500 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="h-8 w-8 animate-pulse" />
                </div>
                <h4 className="text-xl font-bold text-red-400 mb-2">Camera Access Blocked</h4>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Permission to access the camera was denied. To resolve this, click the lock icon in your URL bar and switch Camera permissions to "Allow", then reload the page.
                </p>
                <div className="space-y-3 w-full">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Retry Permission Request
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 px-4 rounded-xl transition-all"
                  >
                    Cancel and Upload File Instead
                  </button>
                </div>
              </>
            ) : permissionStatus === 'failed' ? (
              <>
                <div className="h-16 w-16 bg-yellow-950/50 border border-yellow-500 text-yellow-500 rounded-full flex items-center justify-center mb-6">
                  <HelpCircle className="h-8 w-8" />
                </div>
                <h4 className="text-xl font-bold text-yellow-400 mb-2">Hardware Access Error</h4>
                <p className="text-slate-400 text-sm mb-6">{errorMsg || 'No active camera could be initialized on this hardware.'}</p>
                <button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 px-4 rounded-xl transition-all"
                >
                  Go Back & Upload Manually
                </button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 border-4 border-t-primary-500 border-primary-900/30 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-sm">Awaiting user camera permission prompt...</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Camera Controls Footer bar */}
      <div className="bg-slate-950 py-6 px-8 flex justify-center items-center gap-12 border-t border-slate-900">
        {!capturedData && permissionStatus === 'granted' && (
          <>
            {/* Flip Camera Control */}
            <button
              onClick={toggleFacingMode}
              className="p-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors hover:text-white"
              title="Switch camera"
            >
              <RotateCw className="h-6 w-6" />
            </button>

            {/* Shutter Circle Button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleCapture}
              className="h-18 w-18 shutter-btn rounded-full bg-white flex items-center justify-center focus:outline-none ring-offset-4 ring-offset-black hover:scale-105 transition-all"
            >
              <div className="h-14 w-14 rounded-full border-2 border-slate-950 bg-white" />
            </motion.button>

            {/* Spacer */}
            <div className="w-13 h-13" />
          </>
        )}

        {capturedData && (
          <div className="flex gap-4 w-full max-w-md">
            <button
              onClick={handleRetake}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 py-3.5 px-6 rounded-xl font-semibold border border-slate-800 transition-colors"
            >
              Retake Photo
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
            >
              Confirm Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
