import { useState, useCallback, useRef } from 'react';

/**
 * useCamera - handles getUserMedia with proper cleanup
 * Fixed: stopCamera no longer depends on stream state to avoid infinite re-renders
 * Works alongside react-webcam (CameraCapture now uses react-webcam), but kept for fallback / other usages
 */
export const useCamera = () => {
  const [stream, setStream] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // prompt | granted | denied | failed
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facingMode = 'environment') => {
    stopCamera();
    setErrorMsg('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('failed');
      setErrorMsg('Camera access is not supported by your browser. Try using the Browse / Gallery button or use a modern browser (Chrome, Safari, Firefox).');
      return null;
    }

    // Must be secure context (HTTPS) except localhost
    if (!window.isSecureContext) {
      setPermissionStatus('failed');
      setErrorMsg('Camera requires HTTPS. Please open this site via HTTPS or use localhost. Upload via Browse as fallback.');
      return null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        // iOS requires explicit play()
        await videoRef.current.play().catch(() => {});
      }
      return mediaStream;
    } catch (error) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMsg('Camera permission denied. Click the lock/info icon in your address bar → Site settings → Camera → Allow, then reload.');
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        setPermissionStatus('failed');
        setErrorMsg('No camera found. This device has no camera or it is in use by another app.');
      } else if (error.name === 'NotReadableError') {
        setPermissionStatus('failed');
        setErrorMsg('Camera is already in use by another app. Close other apps using the camera and try again.');
      } else {
        setPermissionStatus('failed');
        setErrorMsg(`Camera error: ${error.message || 'Unable to access camera.'}`);
      }
      return null;
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  return {
    videoRef,
    stream,
    permissionStatus,
    errorMsg,
    startCamera,
    stopCamera,
    capturePhoto,
  };
};
