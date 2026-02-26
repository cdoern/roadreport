# Implementation Plan: Fix Mobile Layout Crowding

**Branch**: `006-fix-mobile-layout` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-fix-mobile-layout/spec.md`

## Summary

On narrow mobile screens, two layout collisions exist: (1) the search bar extends into the top-right zone where Leaflet's zoom controls live, and (2) the legend panel at bottom-right overlaps the Report button centered at the bottom. Desktop is unaffected. The fix is two targeted responsive-class changes — one to the SearchBar container and one to the Legend container — that shift each element to a non-colliding position on mobile while restoring the current desktop layout at the `sm:` (640px+) breakpoint. No new dependencies, no new components, no data model changes.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18
**Primary Dependencies**: Tailwind CSS 3 (responsive utility classes), react-leaflet v4 (Leaflet zoom control default positioning)
**Storage**: N/A — layout-only change, no data persistence
**Testing**: `npm test && npm run lint`
**Target Platform**: Web (mobile browsers ≤767px and desktop 768px+), PWA (iOS Safari, Android Chrome)
**Project Type**: Web (Vite SPA)
**Performance Goals**: No render or paint regressions; no new layout reflows on desktop
**Constraints**: Desktop layout must be pixel-identical to current; no controls may be removed or hidden on mobile; no new npm dependencies; changes confined to 2 source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Simplicity** | PASS | Two one-line class-string changes; no new abstractions, helpers, or components |
| **Maintainability** | PASS | Responsive Tailwind classes are self-descriptive; no implicit state introduced |
| **Documentation** | PASS | Both changed components have existing docstrings; no new architectural decisions required; quickstart.md updated |
| **Code Quality** | PASS | Lint/format enforced by existing CI; no logic changes, so no new test surface |

No violations — Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-mobile-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (affected files only)

```text
src/
└── components/
    ├── search/
    │   └── SearchBar.tsx     # Change: outer div positioning classes (line 159)
    └── ui/
        └── Legend.tsx        # Change: container positioning classes (line 29)
```

**Structure Decision**: Single-project web app. Only two component files require modification. No new files created.

## Phase 0: Research

See [research.md](./research.md) for full findings. Summary:

- **Zoom control position**: Leaflet's default zoom control is anchored at top-right. No code change needed to zoom control itself — SearchBar is repositioned on mobile instead.
- **Tailwind mobile-first**: Base (unprefixed) classes apply to all sizes; `sm:` overrides from 640px up. This is the correct mechanism to implement the mobile-only changes.
- **Legend repositioning**: Moving legend to bottom-left on mobile is safe — no other element occupies bottom-left on any screen size.
- **SearchBar repositioning**: Left-anchored with right-14 inset on mobile provides ≥12px clearance from the 54px Leaflet zoom zone (44px control + 10px offset). Desktop layout fully restored at sm:.

## Phase 1: Design

### Data Model

N/A — this feature involves no data entities, schema changes, or persistence.

### API Contracts

N/A — this feature involves no API endpoints, RPCs, or external service changes.

### Layout Change Specification

#### Change 1: SearchBar outer container (SearchBar.tsx line 159)

**Before:**
```
absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4
```

**After:**
```
absolute top-3 left-3 right-14 z-[1000]
sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full sm:max-w-sm sm:px-4
```

**Mobile behavior (< 640px):**
- Anchored left at 12px (`left-3`) and right at 56px from viewport edge (`right-14`)
- `right-14` (56px) clears the Leaflet zoom zone (44px control + 10px CSS offset = 54px from right edge)
- Slight top adjustment from 16px to 12px (`top-4` → `top-3`) to better align with zoom control top
- No container padding needed — the `px-4` on the `<input>` element itself provides internal text padding

**Desktop behavior (≥ 640px):**
- All `sm:` classes fully restore the current centered layout
- `sm:right-auto` cancels the mobile `right-14`
- `sm:-translate-x-1/2` with `sm:left-1/2` restores center-anchoring
- Zero visual change on desktop

#### Change 2: Legend container (Legend.tsx line 29)

**Before:**
```
absolute bottom-8 right-3 z-[1000] bg-white/90 ...
```

**After:**
```
absolute bottom-8 left-3 z-[1000] sm:left-auto sm:right-3 bg-white/90 ...
```

**Mobile behavior (< 640px):**
- Moved to bottom-left (`left-3` = 12px from left edge, `bottom-8` = 32px from bottom)
- No other element occupies bottom-left: zoom controls are top-right (default Leaflet), ActivityFilter and ReportButton are centered
- Legend is fully visible and unobstructed

**Desktop behavior (≥ 640px):**
- `sm:left-auto` cancels mobile `left-3`
- `sm:right-3` restores current bottom-right position
- Zero visual change on desktop

### Clearance Verification (390px viewport)

| Element | Zone (mobile) | Overlap risk? |
|---------|--------------|---------------|
| SearchBar | x: 12–334, y: 12–52 | — |
| Leaflet zoom (top-right default) | x: 336–380, y: 10–80 | None — 12px gap |
| Legend (after fix) | x: 12–152, y: bottom 32–~120 | None — opposite corner from all buttons |
| ActivityFilter | x: ~115–275, y: bottom 112–144 | None — vertically above, horizontally centered |
| ReportButton | x: ~135–255, y: bottom 24–68 | None — center, no bottom-left conflict |

### Verification on 320px Viewport (iPhone SE)

| Element | Zone | Overlap risk? |
|---------|------|---------------|
| SearchBar | x: 12–264, y: 12–52 | None — right-14 = 56px inset, zoom at x: 266–310 → 2px gap |
| Leaflet zoom | x: 266–310, y: 10–80 | None |
| Legend | x: 12–152, y: bottom 32–~120 | None |

> **Note**: On 320px the gap between SearchBar and zoom is ~2px — visually acceptable but tight. If closer clearance is desired, `right-16` (64px) could be used instead of `right-14`. This is a judgment call left to implementation; `right-14` satisfies FR-001 (no overlap).
