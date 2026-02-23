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
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    /** ISO 3166-2 region code, e.g. "US-MA". Split on '-' to get abbreviation. */
    'ISO3166-2-lvl4'?: string;
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
 * Builds a postal-style display label from a Nominatim result.
 *
 * Uses structured address fields (returned because addressdetails=1 is set)
 * to produce labels like "55 Gates Street, South Boston, MA 02127".
 *
 * Field selection:
 *   street   = house_number + road  (or just road)
 *   locality = suburb ?? city ?? town ?? village  (skips neighbourhood — too granular)
 *   region   = state abbreviation (from ISO3166-2-lvl4) + postcode
 *
 * Falls back to splitting display_name when address fields are unavailable.
 */
function formatDisplayName(result: NominatimResult): string {
  const addr = result.address;

  if (addr) {
    const street =
      addr.house_number && addr.road
        ? `${addr.house_number} ${addr.road}`
        : addr.road;

    // suburb (e.g. "South Boston") is preferred over city ("Boston") because
    // it's more recognisable; skip neighbourhood which is too granular.
    const locality = addr.suburb ?? addr.city ?? addr.town ?? addr.village;

    // ISO3166-2-lvl4 is "US-MA", "US-NY", etc. — strip the country prefix.
    const stateAbbr = addr['ISO3166-2-lvl4']?.split('-')[1] ?? addr.state;
    const region =
      stateAbbr && addr.postcode
        ? `${stateAbbr} ${addr.postcode}`
        : (stateAbbr ?? addr.postcode);

    const parts = [street, locality, region].filter(Boolean) as string[];
    if (parts.length >= 2) return parts.join(', ');
  }

  // Fallback: parse display_name when address object is absent.
  const parts = result.display_name
    .split(', ')
    .filter((p) => !/^\d{4,}$/.test(p.trim()));
  if (parts.length >= 2 && /^\d+$/.test(parts[0].trim())) {
    parts.splice(0, 2, `${parts[0]} ${parts[1]}`);
  }
  return parts.slice(0, 3).join(', ') || result.display_name;
}

/**
 * Converts a raw Nominatim result into the app's `GeocodingResult` type.
 */
export function parseNominatimResult(result: NominatimResult): GeocodingResult {
  const [south, north, west, east] = result.boundingbox.map(parseFloat);
  return {
    placeId: result.place_id,
    displayName: formatDisplayName(result),
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}
