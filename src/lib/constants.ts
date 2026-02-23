/** Zoom level → ST_SnapToGrid cell size in degrees.
 *  Entries are checked from lowest to highest; the first matching zoom wins. */
export const ZOOM_CELL_SIZES: { maxZoom: number; cellDeg: number }[] = [
  { maxZoom: 5,        cellDeg: 1.0   }, // ~111 km
  { maxZoom: 8,        cellDeg: 0.25  }, // ~28 km
  { maxZoom: 11,       cellDeg: 0.05  }, // ~5.5 km
  { maxZoom: 13,       cellDeg: 0.01  }, // ~1.1 km
  { maxZoom: Infinity, cellDeg: 0.005 }, // ~550 m (street level)
];

/** Recency decay half-life for weather-environmental conditions (ice, snow, mud, etc.). */
export const WEATHER_HALF_LIFE_DAYS = 1.5;

/** Recency decay half-life for structural conditions (pothole, crack, etc.). */
export const STRUCTURAL_HALF_LIFE_DAYS = 7.0;

/** Heatmap polling interval in milliseconds (90 seconds). */
export const POLL_INTERVAL_MS = 90_000;

/** GPS accuracy threshold in metres — warn user if accuracy is worse than this. */
export const GPS_ACCURACY_THRESHOLD_METERS = 50;

/** Maximum rows returned by get_heatmap_cells RPC (egress budget guard). */
export const MAX_HEATMAP_ROWS = 500;

/** Default map centre when geolocation is denied or unavailable (Boston, MA). */
export const DEFAULT_CENTER: [number, number] = [42.3601, -71.0589];

/** Default map zoom level on first load. */
export const DEFAULT_ZOOM = 13;

/** Minimum report count in a HeatmapCell before it is considered reliable.
 *  Cells below this threshold display a "low data" visual indicator. */
export const LOW_DATA_THRESHOLD = 3;

/** Debounce delay (ms) before resetting the heatmap poll timer on Realtime INSERT. */
export const REALTIME_DEBOUNCE_MS = 5_000;
