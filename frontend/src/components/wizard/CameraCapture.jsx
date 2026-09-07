import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { X, RotateCw, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CameraCapture({ label, onCapture, onClose }) {
  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) | user (front)
  const [capturedData, setCapturedData] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // prompt | granted | denied | failed
  const [errorMsg, setErrorMsg] = useState('');
  const [isMirrored, setIsMirrored] = useState(false);

  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const handleUserMedia = useCallback(() => {
    setPermissionStatus('granted');
    setErrorMsg('');
    setIsMirrored(facingMode === 'user');
  }, [facingMode]);

  const handleUserMediaError = useCallback((err) => {
    console.error('Webcam error:', err);
    const name = err?.name || '';
    const msg = err?.message || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('Permission denied')) {
      setPermissionStatus('denied');
      setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and reload.');
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      setPermissionStatus('failed');
      setErrorMsg('No camera found on this device or camera is unavailable.');
    } else if (name === 'NotReadableError') {
      setPermissionStatus('failed');
      setErrorMsg('Camera is in use by another app. Close other apps and try again.');
    } else if (!window.isSecureContext) {
      setPermissionStatus('failed');
      setErrorMsg('Camera requires HTTPS. Please use HTTPS or localhost.');
    } else {
      setPermissionStatus('failed');
      setErrorMsg(msg || 'Unable to access camera. Try uploading via Gallery/Browse instead.');
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedData(imageSrc);
    }
  }, []);

  const handleRetake = () => {
    setCapturedData(null);
  };

  const handleConfirm = () => {
    if (capturedData) {
      onCapture(capturedData);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setCapturedData(null);
    setPermissionStatus('prompt');
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
          aria-label="Close camera"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* Live Preview via react-webcam */}
        {!capturedData && permissionStatus !== 'denied' && permissionStatus !== 'failed' && (
          <div className="relative w-full h-full max-w-lg max-h-[70vh] flex items-center justify-center bg-slate-950">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.85}
              videoConstraints={videoConstraints}
              mirrored={isMirrored}
              playsInline
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-full object-cover"
              style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
            />
            {/* Viewfinder overlay - only show when granted */}
            {permissionStatus === 'granted' && (
              <div className="absolute inset-6 border border-white/20 pointer-events-none rounded-2xl flex items-center justify-center">
                <div className="w-10 h-10 border-t-2 border-l-2 border-primary-500 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-10 h-10 border-t-2 border-r-2 border-primary-500 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-10 h-10 border-b-2 border-l-2 border-primary-500 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-10 h-10 border-b-2 border-r-2 border-primary-500 absolute bottom-0 right-0 rounded-br-lg" />
                <div className="h-px w-8 bg-primary-500/30" />
                <div className="w-px h-8 bg-primary-500/30 absolute" />
              </div>
            )}
            {/* Loading state while prompting */}
            {permissionStatus === 'prompt' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="h-12 w-12 border-4 border-t-primary-500 border-white/20 rounded-full animate-spin mb-4" />
                <p className="text-slate-300 text-sm">Requesting camera permission...</p>
                <p className="text-slate-500 text-xs mt-1">Please allow camera access when prompted</p>
              </div>
            )}
          </div>
        )}

        {/* Captured Freeze Preview */}
        {capturedData && (
          <div className="relative w-full h-full max-w-lg max-h-[70vh] flex items-center justify-center bg-slate-950">
            <img src={capturedData} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              ✓ Ready to Use
            </div>
          </div>
        )}

        {/* Permission Denied / Failed */}
        {!capturedData && (permissionStatus === 'denied' || permissionStatus === 'failed') && (
          <div className="px-6 text-center max-w-md flex flex-col items-center">
            {permissionStatus === 'denied' ? (
              <>
                <div className="h-16 w-16 bg-red-950/50 border border-red-500 text-red-500 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="h-8 w-8 animate-pulse" />
                </div>
                <h4 className="text-xl font-bold text-red-400 mb-2">Camera Access Blocked</h4>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  Permission to access the camera was denied.
                </p>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  Click the lock icon in your URL bar → Site settings → Camera → Allow, then reload. On iOS Safari: Settings → Safari → Camera → Allow.
                </p>
                <div className="space-y-3 w-full">
                  <button
                    onClick={() => {
                      setPermissionStatus('prompt');
                      // force re-mount by toggling facingMode
                      setFacingMode((p) => p);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Retry Permission
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 px-4 rounded-xl transition-all"
                  >
                    Cancel and Upload File Instead
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="h-16 w-16 bg-yellow-950/50 border border-yellow-500 text-yellow-500 rounded-full flex items-center justify-center mb-6">
                  <HelpCircle className="h-8 w-8" />
                </div>
                <h4 className="text-xl font-bold text-yellow-400 mb-2">Camera Unavailable</h4>
                <p className="text-slate-400 text-sm mb-1">{errorMsg || 'No active camera could be initialized.'}</p>
                <p className="text-slate-500 text-xs mb-6">
                  {!window.isSecureContext
                    ? 'Camera needs HTTPS. Use Browse/Gallery to upload instead.'
                    : 'Try uploading via Gallery/Browse, or check if another app is using the camera.'}
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 px-4 rounded-xl transition-all"
                >
                  Go Back & Upload Manually
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="bg-slate-950 py-6 px-8 flex justify-center items-center gap-12 border-t border-slate-900">
        {!capturedData && permissionStatus === 'granted' && (
          <>
            <button
              onClick={toggleFacingMode}
              className="p-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors hover:text-white"
              title="Switch camera (front/back)"
              aria-label="Switch camera"
            >
              <RotateCw className="h-6 w-6" />
            </button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleCapture}
              className="h-[72px] w-[72px] rounded-full bg-white flex items-center justify-center focus:outline-none ring-2 ring-white/20 ring-offset-4 ring-offset-black hover:scale-105 transition-all"
              aria-label="Take photo"
            >
              <div className="h-14 w-14 rounded-full border-2 border-slate-950 bg-white" />
            </motion.button>

            <div className="w-[52px] h-[52px]" aria-hidden />
          </>
        )}

        {capturedData && (
          <div className="flex gap-4 w-full max-w-md">
            <button
              onClick={handleRetake}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 py-3.5 px-6 rounded-xl font-semibold border border-slate-800 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
            >
              Confirm Photo
            </button>
          </div>
        )}

        {!capturedData && permissionStatus !== 'granted' && (
          <p className="text-slate-500 text-xs text-center">
            If camera fails, use <span className="text-slate-300 font-medium">Browse / Gallery</span> to upload
          </p>
        )}
      </div>
    </div>
  );
}
