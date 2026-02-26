# Research: Fix Report Pin Placement & Submit Button Visibility

**Branch**: `005-fix-report-placement` | **Date**: 2026-02-25

No NEEDS CLARIFICATION markers existed in the spec. Research focused on confirming the correct technical approach for each change against the existing codebase.

---

## Decision 1: How to read the map's current center at form-open time

**Question**: The `MapViewHandle` currently exposes `flyToBounds` and `getBoundsString`. Neither directly returns the center point as lat/lng. How should `openReport()` in App.tsx get the map's current center?

**Decision**: Add `getCenter(): { lat: number; lng: number } | null` to `MapViewHandle` in `MapView.tsx`, implemented via `leafletMap.current.getCenter()`.

**Rationale**:
- `mapRef` (a `RefObject<MapViewHandle>`) is already available in `App.tsx` and already wired to `<MapView>` — no new prop threading or context needed.
- Leaflet's `map.getCenter()` is synchronous, stable, and returns a `LatLng` — exactly what we need.
- Extending the existing handle (rather than adding a new hook or context) keeps the map interface in one place and follows the existing pattern.

**Alternatives considered**:
- *Tracking map center in React state via `moveend` event*: Would cause re-renders on every pan — unnecessary overhead for a value only read at form-open time.
- *Reading from `getBoundsString()` and computing midpoint*: Works but is a workaround; `getCenter()` is the direct API.
- *New `useMapCenter()` hook*: Overkill — this value is only needed at one point in App.tsx, not continuously.

---

## Decision 2: How to determine whether the map "has been scrolled away" from the user's GPS location

**Question**: The spec requires the pin to use GPS when the map is on the user's location, and map center otherwise. What threshold distinguishes "user is looking at their location" from "user has scrolled away"?

**Decision**: Compare the Euclidean distance between `map.getCenter()` and `geo.coords` using an inline Haversine calculation. Use a threshold of **50 metres** (`MAP_CENTER_MATCH_THRESHOLD_M = 50`), stored in `constants.ts`.

**Rationale**:
- 50 m is tight enough that it only matches when the user has not deliberately panned the map. GPS accuracy on mobile is typically 5–20 m for a stationary user; the map initializes to DEFAULT_CENTER on first load (Boston), which will not be within 50 m of any real user unless they happen to be in Boston. After a successful geolocation fix, the app calls `flyTo` on the user's location, keeping the two in sync.
- The Haversine formula is 5 lines of arithmetic and requires no library import. It's appropriate for this precision (sub-kilometre distances).
- Storing the threshold as a named constant (not a magic number) makes it discoverable and adjustable without searching the code.

**Alternatives considered**:
- *No threshold — always use map center*: Fails when the user opens the app, GPS loads, and they haven't panned — the map is centered on DEFAULT_CENTER (Boston), not their GPS location. Correct behavior here is to use GPS.
- *Track a `hasBeenPanned` boolean flag*: More explicit but adds state and event wiring. The distance comparison achieves the same result without new state.
- *100 m or 200 m threshold*: Higher thresholds risk incorrectly using GPS for users who have panned a short distance intentionally.

---

## Decision 3: How to fix the submit button disappearing when note textarea is open

**Question**: The form is `max-h-[44vh] overflow-hidden`. When the note textarea expands or the mobile keyboard raises the viewport, content at the bottom (the submit button) is clipped. What layout pattern should fix this?

**Decision**: Restructure the `<form>` element into a flex column with two children: (1) a `flex-1 overflow-y-auto` scrollable region containing the fields, and (2) a `flex-shrink-0` footer div containing the submit button. The outer panel already enforces `max-h-[44vh]`.

**Rationale**:
- This is the canonical "sticky-footer within a constrained container" pattern in CSS Flexbox. It is widely understood, requires zero JavaScript, and has full cross-browser support.
- The submit button becomes structurally impossible to scroll out of view because it is a sibling of the scroll container, not a child inside it.
- The fields area gains internal scroll, so users can still reach all fields on small screens even when the textarea is expanded.
- No new CSS utility classes are needed — Tailwind already includes `flex-1`, `overflow-y-auto`, `flex-shrink-0`.

**Alternatives considered**:
- *`position: sticky; bottom: 0` on the submit button*: Unreliable inside `overflow: hidden` containers — sticky positioning requires a scrollable parent, not a clipped one.
- *JavaScript scroll-into-view on textarea focus*: Fragile across mobile browsers; doesn't solve the root layout problem.
- *Increase `max-h` to give more room*: Doesn't fix the issue; just defers the clip point. Also reduces visible map area.
- *`overflow-y: auto` on the entire form*: Would make the header and submit button scroll away with the fields — not desired.

---

## Summary Table

| Decision | Chosen Approach | Files Affected |
|----------|----------------|----------------|
| Get map center | Add `getCenter()` to `MapViewHandle` | `MapView.tsx` |
| "Scrolled away" threshold | Inline Haversine, 50 m constant | `App.tsx`, `constants.ts` |
| Submit button fix | Flex column split: scrollable fields + fixed footer | `ReportForm.tsx` |
