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
  /** Nominatim result class, e.g. "highway", "place", "boundary". Used to
   *  filter out administrative-only regions (countries, states, counties). */
  class: string;
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
 * Builds a concise display label from a raw Nominatim display_name string.
 *
 * Algorithm: split on ', ', remove pure-numeric postcode parts (4+ digits),
 * return the first 3 remaining parts joined with ', '.
 * Example: "Main Street, Back Bay, Boston, Suffolk County, MA, 02101, US"
 *       → "Main Street, Back Bay, Boston"
 */
function formatDisplayName(raw: string): string {
  const parts = raw.split(', ').filter((p) => !/^\d{4,}$/.test(p.trim()));
  return parts.slice(0, 3).join(', ') || raw;
}

/**
 * Converts a raw Nominatim result into the app's `GeocodingResult` type.
 */
export function parseNominatimResult(result: NominatimResult): GeocodingResult {
  const [south, north, west, east] = result.boundingbox.map(parseFloat);
  return {
    placeId: result.place_id,
    displayName: formatDisplayName(result.display_name),
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}
