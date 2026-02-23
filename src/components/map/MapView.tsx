import 'leaflet/dist/leaflet.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { FlyToBoundsOptions, LatLngBoundsExpression, Map as LeafletMap } from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../lib/constants';

// -------------------------
// Public handle type exposed via forwardRef
// -------------------------

export interface MapViewHandle {
  /** Animate the map to show the given bounds — used by SearchBar (T031). */
  flyToBounds(bounds: LatLngBoundsExpression, options?: FlyToBoundsOptions): void;
}

// -------------------------
// Internal helper components
// -------------------------

/** Captures the Leaflet Map instance into a ref after MapContainer mounts. */
function MapRefCapture({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

/** Listens for tile-load errors and calls the onTileError callback. */
function TileErrorListener({ onTileError }: { onTileError: () => void }) {
  useMapEvents({ tileerror: onTileError });
  return null;
}

// -------------------------
// MapView
// -------------------------

interface MapViewProps {
  /** Called once when any map tile fails to load (e.g. user is offline). */
  onTileError: () => void;
  /** Components rendered inside MapContainer (HeatmapOverlay, ConditionPopup, etc.) */
  children?: React.ReactNode;
}

/**
 * Full-viewport Leaflet map built with react-leaflet.
 *
 * The containing `<div>` is `aria-hidden="true"` so the map canvas is
 * invisible to screen readers.  All interactive UI (SearchBar, ReportButton,
 * Legend, ActivityFilter) is rendered in overlay DOM nodes outside this
 * component, where assistive technology can reach them normally.
 *
 * A `MapViewHandle` ref is forwarded so that `SearchBar` can call
 * `flyToBounds` after a Nominatim result is selected.
 */
export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { onTileError, children },
  ref
) {
  const mapRef = useRef<LeafletMap | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      flyToBounds: (bounds, options) => {
        mapRef.current?.flyToBounds(bounds, options);
      },
    }),
    []
  );

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="absolute inset-0"
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <MapRefCapture mapRef={mapRef} />
        <TileErrorListener onTileError={onTileError} />
        {children}
      </MapContainer>
    </div>
  );
});
