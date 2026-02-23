# Implementation Plan: Improve Search Bar Results

**Branch**: `004-improve-search` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-improve-search/spec.md`

## Summary

The search bar returns poor results because it sends queries to the geocoding provider
with no geographic context, uses full verbose place names as labels, and does not
filter out administrative boundaries. Three targeted changes fix all three issues:
(1) pass the current map viewport as a geographic bias parameter, (2) format result
labels to the first 3 meaningful name parts, and (3) exclude country/state-level
boundary results. Total: 3 files, ~25 lines of new code, zero new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 + Vite 5 (unchanged)
**Primary Dependencies**: react-leaflet v4 (Leaflet `LatLngBounds` already available); Nominatim REST API (already in use — adding two query params)
**Storage**: N/A — no database changes
**Testing**: `npm test && npm run lint` (project command); manual browser verification per quickstart.md
**Target Platform**: Web (Vite SPA) — same as existing
**Project Type**: Web application (single-page app)
**Performance Goals**: Geocoding request latency unchanged (same provider, same debounce); label formatting is synchronous and negligible
**Constraints**: No new npm packages; Nominatim usage policy respected (300 ms debounce preserved); no backend changes
**Scale/Scope**: 3 files; ~25 lines added; zero schema changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
|------|--------|----------|
| **I. Simplicity** | ✅ PASS | 3 small file changes; no new abstractions; `formatDisplayName` is a single pure function; `getBoundsString` follows existing `MapViewHandle` imperative pattern |
| **II. Maintainability** | ✅ PASS | `formatDisplayName` has one clear purpose; `getBoundsString` name is self-descriptive; no implicit side effects |
| **III. Documentation** | ✅ PASS | `formatDisplayName` algorithm documented in quickstart.md and inline; `getBoundsString` inline comment explains format; decisions recorded in research.md |
| **IV. Code Quality** | ✅ PASS | No new dependencies; linter unaffected by logic additions; `class` field uses TypeScript interface (reserved word is allowed as object property) |

All four gates pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/004-improve-search/
├── plan.md              # This file
├── research.md          # Decisions D-001 to D-006
├── data-model.md        # Interface changes (NominatimResult, MapViewHandle, GeocodingResult)
├── quickstart.md        # Verify steps for US1/US2/US3
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── nominatim.ts           ← add class field, formatDisplayName, update parseNominatimResult
├── components/
│   ├── map/
│   │   └── MapView.tsx        ← add getBoundsString() to MapViewHandle + useImperativeHandle
│   └── search/
│       └── SearchBar.tsx      ← add viewbox+bounded params; filter boundary results
```

**Structure Decision**: Single-project web app; all changes live in `src/`. No new
files created — modifications only to three existing files.

## Implementation Approach

### Change 1 — `src/lib/nominatim.ts`

**Add to `NominatimResult` interface:**
```typescript
class: string; // e.g. "highway", "place", "boundary"
```

**Add pure function `formatDisplayName`:**
```typescript
// Split raw display_name, remove postcode parts (≥4 digit sequences),
// return first 3 remaining parts joined by ", ".
function formatDisplayName(raw: string): string
```

**Update `parseNominatimResult`:**
- Change `displayName: result.display_name` → `displayName: formatDisplayName(result.display_name)`

### Change 2 — `src/components/map/MapView.tsx`

**Add to `MapViewHandle` interface:**
```typescript
/** Current viewport as "west,south,east,north" for Nominatim viewbox param.
 *  Returns null if the map has not initialised yet. */
getBoundsString(): string | null;
```

**Add to `useImperativeHandle` implementation:**
```typescript
getBoundsString: () => {
  const b = mapRef.current?.getBounds();
  if (!b) return null;
  return `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
},
```

### Change 3 — `src/components/search/SearchBar.tsx`

**In `fetchResults`, after building the URL:**
```typescript
const viewbox = mapRef.current?.getBoundsString() ?? null;
if (viewbox) {
  url.searchParams.set('viewbox', viewbox);
  url.searchParams.set('bounded', '0'); // bias but don't restrict
}
```

**After parsing results, before `setResults`:**
```typescript
const filtered = data
  .map(parseNominatimResult)
  .filter((r) => (data[...].class) !== 'boundary');
// Concretely: filter the raw NominatimResult[] before mapping, or
// include class in GeocodingResult and filter after.
```

Simplest: filter the raw `NominatimResult[]` before mapping:
```typescript
const filtered = (data as NominatimResult[])
  .filter((r) => r.class !== 'boundary')
  .map(parseNominatimResult);
setResults(filtered);
```

## Phase Summary

| Phase | Deliverable | Scope |
|-------|-------------|-------|
| 0 | `research.md` | Root causes + design decisions D-001 to D-006 ✅ |
| 1 | `data-model.md`, `quickstart.md`, `plan.md` | Design artifacts ✅ |
| 2 | `tasks.md` | Task breakdown (via `/speckit.tasks`) |
| 3 | Code changes | 3 files (via `/speckit.implement`) |
