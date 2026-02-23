import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

// Green circle icon — avoids the Vite/Leaflet default-icon URL issue.
const REPORT_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:28px; height:28px;
    background:#16a34a; border:3px solid white;
    border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.45);
    cursor:grab;
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface DraggablePinProps {
  /** Whether the pin is currently visible on the map. */
  active: boolean;
  /** Starting latitude (usually from GPS). Only used when `active` first becomes true. */
  lat: number | null;
  /** Starting longitude. Only used when `active` first becomes true. */
  lng: number | null;
  /** Called whenever the user finishes dragging the pin to a new position. */
  onPositionChange: (lat: number, lng: number) => void;
}

/**
 * Adds a draggable Leaflet marker to the map while `active` is true.
 * Lives inside `<MapContainer>` (rendered via MapContent) so that `useMap()`
 * is available.  Position is initialised from `lat`/`lng` when activated;
 * subsequent GPS updates do NOT move the marker so the user's manual
 * adjustments are preserved.
 */
export function DraggablePin({ active, lat, lng, onPositionChange }: DraggablePinProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  // Keep callback ref stable so the dragend listener always calls the latest version.
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    if (!active) {
      // Remove marker when form closes.
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    // Already exists — don't reinitialise (would override user drag).
    if (markerRef.current) return;

    // No GPS yet — wait for next render when lat/lng are available.
    if (lat === null || lng === null) return;

    markerRef.current = L.marker([lat, lng], {
      draggable: true,
      icon: REPORT_ICON,
      title: 'Drag to set the exact report location',
    }).addTo(map);

    markerRef.current.on('dragend', () => {
      const pos = markerRef.current!.getLatLng();
      onPositionChangeRef.current(pos.lat, pos.lng);
    });

    // Pan map smoothly to show the pin.
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [active, lat, lng, map]);

  // Always remove on unmount.
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  return null;
}
