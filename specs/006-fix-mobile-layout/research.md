# Research: Fix Mobile Layout Crowding

**Feature**: 006-fix-mobile-layout
**Date**: 2026-02-25

## Finding 1: Leaflet Zoom Control Default Position

**Decision**: Leave Leaflet zoom controls at their default top-right position; reposition SearchBar on mobile instead.

**Rationale**: Moving the zoom control (via `zoomControl={false}` + `<ZoomControl position="bottomleft" />`) would change the desktop experience, which the user confirmed looks good and must not regress. Repositioning the SearchBar on mobile is a zero-risk desktop change: `sm:` Tailwind classes fully restore the desktop layout at 640px+.

**Alternatives considered**:
- Move zoom to `bottomleft` on all screens — rejected: changes desktop UX with no user request to do so.
- Hide zoom on mobile — rejected: FR-005 requires all controls remain accessible on mobile.
- Use JavaScript window width detection to conditionally render zoom position — rejected: unnecessary complexity; pure CSS achieves the goal.

---

## Finding 2: Tailwind CSS Mobile-First Breakpoints

**Decision**: Use unprefixed (mobile) Tailwind classes for the mobile layout and `sm:` (640px+) prefixed classes to restore desktop layout.

**Rationale**: Tailwind is mobile-first. Base classes (no prefix) apply to all screen sizes. The `sm:` prefix applies from 640px up. This means mobile-specific positioning is expressed without a prefix and desktop positions are expressed with `sm:`. This is the idiomatic Tailwind approach — no media-query boilerplate, no JavaScript.

**Alternatives considered**:
- CSS `@media` in a stylesheet — rejected: project uses Tailwind utilities throughout; mixing raw CSS would break consistency.
- JavaScript `useWindowSize` hook to switch class names — rejected: unnecessary complexity and causes hydration flicker; CSS handles this purely.

---

## Finding 3: Safe Position for Legend on Mobile

**Decision**: Move Legend to bottom-left (`left-3 bottom-8`) on mobile.

**Rationale**: Analysis of all component positions on a 390px viewport confirms bottom-left is entirely unoccupied on mobile:
- Zoom controls: top-right (Leaflet default)
- SearchBar: top, left-aligned after fix
- ActivityFilter: bottom-center at 112px from bottom
- ReportButton: bottom-center at 24px from bottom

Legend at `left-3 bottom-8` (12px from left, 32px from bottom) has no vertical or horizontal conflict with any of these elements.

**Alternatives considered**:
- Move Legend above ActivityFilter (bottom ~160px) — rejected: pushes legend into mid-screen, looks awkward and unanchored.
- Collapse Legend to icon-only on mobile with tap-to-expand — rejected: added complexity (state, animation) beyond what the spec requires; FR-005 says controls must be accessible, not that they must be in the same layout zone.
- Top-right on mobile — rejected: Leaflet zoom controls occupy top-right; would create a new conflict.

---

## Finding 4: SearchBar Container Positioning Strategy

**Decision**: Replace center-anchor (`left-1/2 -translate-x-1/2 w-full max-w-sm px-4`) with left-right anchor (`left-3 right-14`) on mobile.

**Rationale**: Left-right anchoring (`left-3 right-14`) directly expresses "fill this horizontal range" without width or transform calculations. `right-14` = 56px from the right edge provides a 2–12px buffer over Leaflet's zoom zone (which occupies 54px from the right edge: 44px wide control + 10px CSS offset). The input element retains its own `px-4` for internal text padding, so no visible spacing is lost inside the search field.

**Clearance calculation**:
- Screen 390px: SearchBar right edge = 390 − 56 = 334px. Zoom left edge = 390 − 10 − 34 = 346px. Gap = 12px. ✓
- Screen 320px: SearchBar right edge = 320 − 56 = 264px. Zoom left edge = 320 − 10 − 34 = 276px. Gap = 12px. ✓

**Alternatives considered**:
- `max-w-[240px]` on mobile — rejected: arbitrary magic number, doesn't adapt to intermediate widths like 360px phones.
- `pr-14` asymmetric padding while keeping center-anchor — rejected: creates visually off-center input within a centered container; confusing to read.
- Moving SearchBar below zoom controls (`top-16`) — rejected: reduces visible map area and puts search in an unexpected location.

---

## Finding 5: No New Dependencies Required

**Decision**: Zero new npm packages needed.

**Rationale**: The fix is two Tailwind class-string changes. Tailwind CSS 3 is already installed and configured. No new Leaflet APIs, React hooks, or third-party libraries are involved.
