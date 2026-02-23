# Research: Improve Search Bar Results

**Feature**: 004-improve-search
**Date**: 2026-02-23

---

## D-001: Root Cause — No Geographic Bias in Nominatim Request

**Decision**: The current `fetchResults` in `SearchBar.tsx` sends a bare query to
Nominatim with no `viewbox` parameter. Nominatim returns results ranked globally,
so "Main St" surfaces streets from multiple countries before any local results.

**Fix**: Add a `viewbox=west,south,east,north` parameter built from the current
Leaflet map bounds at query time, plus `bounded=0` to allow global fallback when
the viewport contains no matches (per spec Assumption: "falling back to unbiased
global results is acceptable").

**Nominatim `viewbox` behaviour**: the parameter biases ranking toward the given
bounding box; `bounded=0` means results outside the box are still returned (just
ranked lower). This satisfies FR-001, FR-002, and SC-001/SC-004 while preserving
usability when the map is zoomed far out.

**Alternatives considered**:
- `bounded=1` (hard restrict to viewport) → rejected; returns zero results if the
  user zooms out far or searches for a place by name while the map shows a
  different area.
- Passing map center as a `lat`/`lon` point → Nominatim does not support a
  center-point bias; `viewbox` is the correct mechanism.

---

## D-002: Exposing Map Bounds to SearchBar

**Decision**: Extend `MapViewHandle` (in `src/components/map/MapView.tsx`) with a
`getBoundsString()` method that returns the Leaflet map's current bounding box as
a ready-to-use Nominatim `viewbox` string (`"west,south,east,north"`). `SearchBar`
calls `mapRef.current?.getBoundsString()` at query time.

**Why extend MapViewHandle rather than pass bounds as props**:
- Bounds change continuously as the user pans/zooms; a ref-based method always
  reads the live value without triggering re-renders in `SearchBar`.
- `MapViewHandle` already follows this imperative pattern for `flyToBounds`.
- Zero new props needed — `SearchBar` already receives `mapRef`.

**Alternatives considered**:
- Lifting bounds state into `App.tsx` and passing as a prop → requires `useState`
  + `moveend`/`zoomend` listeners in `App`; causes unnecessary re-renders every
  time the map moves.
- Using a React context for map bounds → premature abstraction for a single consumer.

---

## D-003: Concise Display Labels via display_name Truncation

**Decision**: Build the short result label by taking the first 3 comma-separated
parts of Nominatim's `display_name`, after filtering out pure-numeric postcode
parts. This turns:

  "Main Street, Back Bay, Boston, Suffolk County, Massachusetts, 02101, United States"
  → "Main Street, Back Bay, Boston"

  "Boston, Suffolk County, Massachusetts, United States"
  → "Boston, Suffolk County, Massachusetts"

**Why this approach**:
- Requires zero new API parameters — `display_name` is already returned.
- Handles all result types generically (roads, cities, parks, addresses).
- Postcodes are numeric-only strings with ≥4 digits; easy to filter.
- The first 3 meaningful parts are almost always sufficient to identify a place.

**Alternatives considered**:
- Building label from structured `address` fields (`road`, `city`, `state`) →
  field availability varies by country and result type; requires many fallback
  branches to cover all cases; more fragile than slicing `display_name`.
- Keeping raw `display_name` and increasing the dropdown width → changes the
  overall UI layout; still truncates on mobile; does not fix the root problem.
- Truncating to a fixed character count → cuts words mid-string; no structural
  improvement over current behaviour.

**Implementation**: add `formatDisplayName(raw: string): string` to
`src/lib/nominatim.ts` and call it from `parseNominatimResult`.

---

## D-004: Filtering Administrative Boundaries Client-Side

**Decision**: Nominatim includes a `class` field in each result. Country and
state/province results have `class: "boundary"`. Filter these out in
`fetchResults` before calling `setResults`, so they never appear in the dropdown.

**Why client-side**:
- Nominatim does not expose a "exclude class X" request parameter.
- The `featuretype` parameter could restrict to only streets/cities, but it is
  too narrow — it would exclude parks, landmarks, and named areas that are valid
  navigation targets.
- Filtering `class === "boundary"` is a single condition that removes countries,
  states, and counties while retaining roads, cities, neighbourhoods, and amenities.

**NominatimResult interface update**: add `class: string` (Nominatim calls the
JSON key `"class"` — it is a reserved word in TypeScript, so the field is typed
as `class: string` inside the interface which TypeScript allows fine).

**Alternatives considered**:
- `featuretype=street` → too restrictive; misses cities and landmarks.
- Checking `addresstype` field → not always present; `class` is more reliable.

---

## D-005: No New Dependencies

**Decision**: All three changes use only APIs already available:
- Leaflet's `LatLngBounds.getWest/South/East/North()` — already bundled via `react-leaflet`.
- `display_name.split`, `Array.filter`, `Array.slice` — standard JS.
- Nominatim's `viewbox` and `bounded` parameters — already the geocoding provider.

No new npm packages. No new Supabase queries. No backend changes.

---

## D-006: Files Changed

| File | Change |
|------|--------|
| `src/lib/nominatim.ts` | Add `class: string` to `NominatimResult`; add `formatDisplayName`; call it in `parseNominatimResult` |
| `src/components/map/MapView.tsx` | Add `getBoundsString(): string \| null` to `MapViewHandle` and `useImperativeHandle` |
| `src/components/search/SearchBar.tsx` | Add `viewbox` + `bounded=0` params; filter `class === 'boundary'` results |
