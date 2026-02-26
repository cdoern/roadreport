import { useCallback, useEffect, useRef, useState } from 'react';
import { parseNominatimResult } from '../../lib/nominatim';
import type { GeocodingResult, NominatimResult } from '../../lib/nominatim';
import type { MapViewHandle } from '../map/MapView';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 300;
const LISTBOX_ID = 'rr-search-listbox';

interface SearchBarProps {
  /** Ref to the map — used to call `flyToBounds` after a result is selected. */
  mapRef: React.RefObject<MapViewHandle | null>;
}

/**
 * Location search bar backed by the Nominatim geocoding API.
 *
 * Implements the ARIA 1.2 combobox pattern:
 * - `role="combobox"` on the `<input>` element
 * - `role="listbox"` + `role="option"` on the dropdown list
 * - `aria-activedescendant` tracks keyboard selection
 *
 * Keyboard shortcuts:
 * - **ArrowDown / ArrowUp** — move through suggestions
 * - **Enter** — select highlighted suggestion and fly to it
 * - **Escape** — close dropdown and clear input
 *
 * Rate-limiting: 300 ms debounce before the first request is sent; an
 * `AbortController` cancels in-flight requests when the query changes.
 * The `Referer` header identifies the app to the Nominatim service per the
 * OSM usage policy.
 */
export function SearchBar({ mapRef }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** True once a fetch has completed — gates the "No results found" message. */
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Dropdown is only shown after at least one fetch has completed AND the
  // input is non-empty — "show nothing while typing" requirement.
  const isOpen = hasSearched && query.trim().length > 0;

  // ── T031: Nominatim fetch ───────────────────────────────────────────────

  const fetchResults = useCallback(async (q: string) => {
    // Cancel previous in-flight request.
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const url = new URL(NOMINATIM_SEARCH_URL);
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '5');
      url.searchParams.set('addressdetails', '1');

      // Bias results toward the current map viewport without hard-restricting
      // to it (bounded=0 allows global fallback when no local results exist).
      const viewbox = mapRef.current?.getBoundsString() ?? null;
      if (viewbox) {
        url.searchParams.set('viewbox', viewbox);
        url.searchParams.set('bounded', '0');
      }

      const res = await fetch(url.toString(), {
        headers: { Referer: window.location.origin },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Nominatim returned HTTP ${res.status}`);

      const data = (await res.json()) as NominatimResult[];
      // Exclude administrative boundaries (countries, states, counties) which
      // are not useful navigation targets for road-condition reporting.
      const filtered = data
        .filter((r) => r.class !== 'boundary')
        .map(parseNominatimResult);
      setResults(filtered);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // expected on fast typing
      setResults([]);
    } finally {
      setHasSearched(true);
    }
  }, [mapRef]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => void fetchResults(value.trim()), DEBOUNCE_MS);
  }

  // ── T031: keyboard navigation ───────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          selectResult(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
    }
  }

  // ── T032: map navigation on result select ───────────────────────────────

  function selectResult(result: GeocodingResult) {
    mapRef.current?.flyToBounds(result.bounds, { maxZoom: 15 });
    closeDropdown();
  }

  function closeDropdown() {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setActiveIndex(-1);
  }

  // Cleanup pending timers and requests on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="absolute top-3 left-3 right-14 z-[1000] sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full sm:max-w-sm sm:px-4">
      <div className="relative">
        <input
          type="search"
          role="combobox"
          aria-label="Search for a location"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? LISTBOX_ID : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `rr-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for a location…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl bg-white/95 backdrop-blur-sm
                     border border-gray-200 px-4 py-2.5 text-sm text-gray-800
                     shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500
                     placeholder:text-gray-400"
        />

        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1
                       bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {results.length > 0 ? (
              <ul
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Location suggestions"
                className="py-1"
              >
                {results.map((result, i) => (
                  <li
                    key={result.placeId}
                    id={`rr-option-${i}`}
                    role="option"
                    aria-selected={activeIndex === i}
                    onMouseDown={(e) => {
                      // Use mousedown (not click) to fire before the input's blur.
                      e.preventDefault();
                      selectResult(result);
                    }}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors
                                truncate max-w-full
                                ${
                                  activeIndex === i
                                    ? 'bg-green-50 text-green-800'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                    title={result.displayName}
                  >
                    {result.displayName}
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="px-4 py-3 text-sm text-gray-400 text-center">
                No results found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
