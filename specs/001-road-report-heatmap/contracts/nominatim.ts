/**
 * contracts/nominatim.ts
 *
 * TypeScript types for the Nominatim geocoding API (OpenStreetMap).
 * Nominatim is free, requires no API key, and is used for the search bar (US3).
 *
 * Base URL: https://nominatim.openstreetmap.org
 * Endpoint: GET /search?q={query}&format=json&limit=5&addressdetails=1
 *
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *   - MUST set a descriptive User-Agent or Referer header identifying your app.
 *   - MUST NOT send more than 1 request per second.
 *   - For production use, self-hosting or a commercial provider is recommended.
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Query parameters for a Nominatim search request.
 *
 * @example
 *   const params: NominatimSearchParams = {
 *     q: 'Beacon Hill, Boston',
 *     format: 'json',
 *     limit: 5,
 *     addressdetails: 1,
 *   };
 *   const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params as any)}`;
 */
export interface NominatimSearchParams {
  /** Free-form location query (neighborhood, street, address, city) */
  q: string;
  format: 'json';
  /** Maximum number of results to return (1–50) */
  limit?: number;
  /** Include structured address breakdown in results */
  addressdetails?: 0 | 1;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/**
 * A single result item from the Nominatim /search endpoint.
 * Only the fields used by RoadReport are typed here; the full response
 * contains additional fields (osm_type, osm_id, class, type, importance, etc.).
 */
export interface NominatimResult {
  /** Unique Nominatim place ID */
  place_id: number;
  /** Human-readable display name for the result */
  display_name: string;
  /** Latitude of the result centroid as a string (parse with parseFloat) */
  lat: string;
  /** Longitude of the result centroid as a string (parse with parseFloat) */
  lon: string;
  /**
   * Bounding box of the result: [south, north, west, east] as strings.
   * Use to animate the map to fit the result's extent rather than just pan to centroid.
   */
  boundingbox: [string, string, string, string];
  /** Structured address components (present when addressdetails=1) */
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

/** Full response from GET /search — an array of results */
export type NominatimSearchResponse = NominatimResult[];

// ---------------------------------------------------------------------------
// Parsed result (internal app type)
// ---------------------------------------------------------------------------

/**
 * Simplified geocoding result used internally after parsing the Nominatim response.
 * Numeric lat/lng are pre-parsed for direct use with Leaflet.
 */
export interface GeocodingResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
  /** Leaflet-compatible bounds: [[south, west], [north, east]] */
  bounds: [[number, number], [number, number]];
}

// ---------------------------------------------------------------------------
// Helper: parse NominatimResult → GeocodingResult
// ---------------------------------------------------------------------------

/**
 * Converts a raw Nominatim result into the app's internal GeocodingResult type.
 *
 * @param result - Raw item from Nominatim /search response
 * @returns Parsed GeocodingResult with numeric coordinates and Leaflet-ready bounds
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
