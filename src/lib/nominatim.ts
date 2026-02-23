/**
 * Nominatim geocoding types and parser.
 *
 * Mirrors `specs/001-road-report-heatmap/contracts/nominatim.ts` within the
 * `src/` compilation root so Vite can bundle it.  Both files must stay in sync.
 *
 * API: GET https://nominatim.openstreetmap.org/search
 * Policy: https://operations.osmfoundation.org/policies/nominatim/
 *   — Set Referer or User-Agent on every request.
 *   — Max 1 request / second (enforced by 300 ms debounce in SearchBar).
 */

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  /**
   * Bounding box: [south, north, west, east] as decimal-degree strings.
   * Use to flyToBounds rather than just panning to the centroid.
   */
  boundingbox: [string, string, string, string];
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export type NominatimSearchResponse = NominatimResult[];

/**
 * Simplified geocoding result used inside the app after parsing the raw API
 * response.  All coordinates are numeric and ready for Leaflet.
 */
export interface GeocodingResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
  /** Leaflet-compatible bounds: [[south, west], [north, east]] */
  bounds: [[number, number], [number, number]];
}

/**
 * Converts a raw Nominatim result into the app's `GeocodingResult` type.
 */
export function parseNominatimResult(result: NominatimResult): GeocodingResult {
  const [south, north, west, east] = result.boundingbox.map(parseFloat);
  return {
    placeId: result.place_id,
    displayName: result.display_name,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}
