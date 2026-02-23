// leaflet.heat is a side-effect plugin — importing it adds L.heatLayer to the
// Leaflet namespace.  Types live in src/types/leaflet-heat.d.ts.
import 'leaflet.heat';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { HeatmapCell } from '../../types';

// Gradient thresholds match the Legend component's green→yellow→red scale.
// Values are normalised intensity (avg_score / 3, so 0 = best, 1 = worst).
const HEAT_GRADIENT: Record<number, string> = {
  0.4: '#22c55e',  // green  — good
  0.65: '#eab308', // yellow — fair
  1.0: '#ef4444',  // red    — poor
};

/** Compute leaflet.heat radius and blur from current zoom level. */
function zoomToHeatOptions(zoom: number): { radius: number; blur: number } {
  return {
    radius: Math.max(8, Math.round(12 + (zoom - 10) * 2.5)),
    blur:   Math.max(6, Math.round(10 + (zoom - 10) * 2)),
  };
}

/** Only call redraw when the map canvas has a real size (avoids IndexSizeError). */
function safeRedraw(heat: L.HeatLayer, map: L.Map) {
  const { x, y } = map.getSize();
  if (x > 0 && y > 0) heat.redraw();
}

interface HeatmapOverlayProps {
  cells: HeatmapCell[];
}

/**
 * Renders a leaflet.heat layer inside the react-leaflet MapContainer.
 *
 * Each `HeatmapCell` is mapped to a `[lat, lng, intensity]` tuple where
 * `intensity = avg_score / 3` (normalised to 0–1).
 *
 * The radius and blur are recomputed on every `zoomend` event so the overlay
 * stays visually coherent across zoom levels.
 */
export function HeatmapOverlay({ cells }: HeatmapOverlayProps) {
  const map = useMap();
  const heatRef = useRef<L.HeatLayer | null>(null);

  // Create the heat layer once — deferred until the map container is sized.
  // leaflet.heat calls canvas.getImageData() on addTo(), which throws
  // IndexSizeError if the canvas is still 0×0 at mount time.
  useEffect(() => {
    function initLayer() {
      const { radius, blur } = zoomToHeatOptions(map.getZoom());
      heatRef.current = L.heatLayer([], {
        minOpacity: 0.3,
        gradient: HEAT_GRADIENT,
        radius,
        blur,
      }).addTo(map);
    }

    // If the map already has dimensions, initialise immediately.
    // Otherwise wait for the 'load' event (fires once tiles + size are ready).
    const { x, y } = map.getSize();
    if (x > 0 && y > 0) {
      initLayer();
    } else {
      map.once('load', initLayer);
    }

    return () => {
      map.off('load', initLayer);
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map]);

  // Update heat layer data whenever cells change.
  useEffect(() => {
    if (!heatRef.current) return;
    const points: L.HeatLatLngTuple[] = cells.map((c) => [
      c.cell_lat,
      c.cell_lng,
      c.avg_score / 3, // normalise 0–3 → 0–1
    ]);
    heatRef.current.setLatLngs(points);
    safeRedraw(heatRef.current, map);
  }, [cells, map]);

  // Recompute radius/blur on zoom so the overlay scales naturally.
  useEffect(() => {
    function onZoomEnd() {
      if (!heatRef.current) return;
      heatRef.current.setOptions(zoomToHeatOptions(map.getZoom()));
      safeRedraw(heatRef.current, map);
    }
    map.on('zoomend', onZoomEnd);
    return () => { map.off('zoomend', onZoomEnd); };
  }, [map]);

  // This component manages a Leaflet layer directly — no DOM output needed.
  return null;
}
