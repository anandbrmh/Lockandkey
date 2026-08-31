import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser';
        setError(err);
        resolve(null);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          let userFriendlyError = 'Could not get location';
          if (err.code === 1) {
            userFriendlyError = 'Location permission denied';
          } else if (err.code === 2) {
            userFriendlyError = 'Location position unavailable';
          } else if (err.code === 3) {
            userFriendlyError = 'Location request timed out';
          }
          setError(userFriendlyError);
          setLoading(false);
          resolve(null); // Resolve with null so flow is not interrupted
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }, []);

  return {
    loading,
    coords,
    error,
    getPosition,
  };
};
