# Implementation Plan: Fix Report Pin Placement & Submit Button Visibility

**Branch**: `005-fix-report-placement` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-fix-report-placement/spec.md`

## Summary

Two focused UX fixes to the report-submission flow. Currently, opening the report form always places the initial pin at the user's GPS location (or DEFAULT_CENTER), ignoring the map's current viewport. Additionally, the report form's submit button can be clipped off-screen when the note textarea is expanded or when a mobile keyboard appears. This plan corrects both behaviors with minimal, targeted changes to three existing source files and no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18
**Primary Dependencies**: react-leaflet v4 / Leaflet (already installed; no new dependencies needed)
**Storage**: N/A — no schema or data model changes
**Testing**: `npm test` (Vitest, existing test suite)
**Target Platform**: Web PWA (mobile-first; Chrome/Safari on iOS and Android)
**Performance Goals**: No new performance requirements; changes are pure behavior and CSS layout
**Constraints**: Form panel capped at `max-h-[44vh]`; map must remain interactive while form is open; no new npm dependencies; offline-capable PWA must continue to function
**Scale/Scope**: 3 existing files modified (`MapView.tsx`, `App.tsx`, `ReportForm.tsx`); no new files required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Simplicity** | ✅ PASS | Changes confined to 3 files; no new abstractions, hooks, or dependencies. `getCenter()` added to existing `MapViewHandle` interface (one method, one concrete need). |
| **II. Maintainability** | ✅ PASS | Each change has a single, nameable purpose. `openReport` reads the map center and compares to GPS — explicit and self-descriptive. Form layout uses standard CSS flex sticky pattern. |
| **III. Documentation** | ✅ PASS | `getCenter()` method will include JSDoc. `quickstart.md` will document the updated pin-placement behavior. No new architectural decision (no new patterns introduced). |
| **IV. Code Quality** | ✅ PASS | No silent failures. The map center comparison uses a clear threshold constant. No dead code introduced. Existing lint/test pipeline unchanged. |

**Complexity Tracking**: No violations — no table required.

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-report-placement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A — no data model changes (omitted)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A — no API changes (omitted)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── map/
│   │   └── MapView.tsx          # Add getCenter() to MapViewHandle + implementation
│   └── report/
│       └── ReportForm.tsx       # Fix submit button sticky layout
├── App.tsx                      # Update openReport() to use map-center-aware pin placement
├── lib/
│   └── constants.ts             # Add MAP_CENTER_MATCH_THRESHOLD_M constant
└── [all other files unchanged]
```

**Structure Decision**: Single project (existing Vite SPA). No new directories. All changes are in-place modifications to existing files.

## Phase 0: Research

See [research.md](./research.md) for full findings. All technical questions resolved — no NEEDS CLARIFICATION items.

**Key decisions**:
1. **Pin placement logic**: Use `map.getCenter()` (native Leaflet) to read the current viewport center at form-open time. Compare distance to GPS using the Haversine formula (inline, ~5 lines — no library). If distance ≤ threshold (50 m), use GPS. If distance > threshold or GPS unavailable, use map center.
2. **Submit button fix**: Restructure the `ReportForm` inner layout into a flex column where the scrollable fields area takes `flex-1 overflow-y-auto` and the submit button lives in a sibling `flex-shrink-0` div pinned to the bottom. This is the standard "sticky footer in a constrained panel" CSS pattern.

## Phase 1: Design

### Change 1 — `MapView.tsx`: Expose `getCenter()`

Extend the existing `MapViewHandle` interface with one method:

```
getCenter(): { lat: number; lng: number } | null
```

Implementation: call `mapInstanceRef.current.getCenter()` (Leaflet's built-in method) and return `{ lat, lng }`. Return `null` if the map has not mounted yet.

This is the only change to `MapView.tsx`. The existing `flyToBounds` and `getBoundsString` methods are untouched.

### Change 2 — `constants.ts`: Add threshold constant

```
MAP_CENTER_MATCH_THRESHOLD_M = 50
```

Defines the radius (in metres) within which the map center is considered "at the user's location." Using a named constant (not a magic number) satisfies the Code Quality principle.

### Change 3 — `App.tsx`: Update `openReport()`

Current logic (simplified):
```
lat = geo.coords.latitude ?? DEFAULT_CENTER[0]
lng = geo.coords.longitude ?? DEFAULT_CENTER[1]
```

New logic:
```
mapCenter = mapRef.current?.getCenter() ?? null

if GPS available AND mapCenter available AND distance(GPS, mapCenter) <= threshold:
    use GPS coords          // map is looking at the user's location
else if mapCenter available:
    use mapCenter           // map is looking elsewhere
else:
    use GPS coords ?? DEFAULT_CENTER   // fallback (map not yet mounted)
```

The distance calculation is an inline Haversine (5 lines). No import needed.

### Change 4 — `ReportForm.tsx`: Fix submit button layout

Current structure (simplified):
```
<div max-h-[44vh] overflow-hidden flex flex-col>
  <header />                        ← fixed
  <form flex flex-col gap-4 px-5>   ← all fields + submit button
    [fields...]
    <button>Submit</button>          ← gets clipped when content overflows
  </form>
</div>
```

New structure:
```
<div max-h-[44vh] overflow-hidden flex flex-col>
  <header />                                ← fixed
  <form flex flex-col flex-1 overflow-hidden>
    <div flex-1 overflow-y-auto px-5 py-4 gap-4>   ← scrollable fields area
      [fields...]
    </div>
    <div flex-shrink-0 px-5 pb-5 pt-2 border-t>    ← sticky submit footer
      <button>Submit</button>
    </div>
  </form>
</div>
```

The submit button is now a sibling of the scrollable content, not a child. It cannot be scrolled out of view. The `border-t` separator visually anchors it as a persistent action footer.
