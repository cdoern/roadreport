import { useEffect, useRef, useState } from 'react';

export interface GeolocationState {
  coords: GeolocationCoordinates | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  loading: boolean;
}

const NOT_SUPPORTED_ERROR: GeolocationPositionError = {
  code: 2,
  message: 'Geolocation is not supported by this browser.',
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
};

const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

/**
 * Continuously watches the device's GPS position using
 * `navigator.geolocation.watchPosition`.  The watcher is cleaned up
 * automatically when the consuming component unmounts.
 *
 * @returns An object with the current geolocation state:
 *   - `coords`   — The full `GeolocationCoordinates` object (includes lat/lng, altitude, etc.)
 *   - `accuracy` — Horizontal accuracy in metres (shortcut from `coords.accuracy`)
 *   - `error`    — Any `GeolocationPositionError` raised by the browser; null otherwise
 *   - `loading`  — `true` until the first position or error arrives
 */
export function useGeolocation(): GeolocationState {
  // Initialise with the unsupported error immediately if geolocation is absent,
  // so no effect-based setState is needed for that branch.
  const [state, setState] = useState<GeolocationState>(
    isSupported
      ? { coords: null, accuracy: null, error: null, loading: true }
      : { coords: null, accuracy: null, error: NOT_SUPPORTED_ERROR, loading: false }
  );

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSupported) return; // state already reflects unsupported, no work needed

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coords: position.coords,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState((prev) => ({ ...prev, error, loading: false }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return state;
}
