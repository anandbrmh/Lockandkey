import { useState, useCallback, useRef } from 'react';

export const useCamera = () => {
  const [stream, setStream] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt', 'granted', 'denied', 'failed'
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async (facingMode = 'environment') => {
    stopCamera(); // Stop any existing streams first
    setErrorMsg('');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('failed');
      setErrorMsg('Camera access is not supported by your browser.');
      return null;
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setPermissionStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        videoRef.current.play().catch(e => {
          console.error("Video play failed:", e);
        });
      }
      return mediaStream;
    } catch (error) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMsg('Camera permission denied. Please allow camera access in your settings.');
      } else {
        setPermissionStatus('failed');
        setErrorMsg(`Camera error: ${error.message}`);
      }
      return null;
    }
  }, [stopCamera]);

  const capturePhoto = useCallback((aspectRatio = 4 / 3) => {
    if (!videoRef.current || !stream) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Use video actual resolutions
    const videoWidth = video.videoWidth || video.clientWidth || 640;
    const videoHeight = video.videoHeight || video.clientHeight || 480;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontally if front camera (optional, but standard)
    // For environment camera we don't flip.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Base64 data url
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl;
  }, [stream]);

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
