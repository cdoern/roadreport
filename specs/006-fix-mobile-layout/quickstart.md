# Quickstart: Fix Mobile Layout Crowding

**Branch**: `006-fix-mobile-layout`
**Date**: 2026-02-25

## What Was Changed

Two responsive class-string changes — no logic, no new files, no new dependencies:

| File | Line | Change |
|------|------|--------|
| `src/components/search/SearchBar.tsx` | 159 | SearchBar outer div: centered → left-anchored with right-inset on mobile |
| `src/components/ui/Legend.tsx` | 29 | Legend container: bottom-right → bottom-left on mobile |

Desktop layout (640px+) is identical to pre-fix.

## Testing the Fix

### 1. Browser DevTools (quickest)

1. `npm run dev`
2. Open `http://localhost:5173` in Chrome/Firefox
3. Open DevTools → Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
4. Select **iPhone 14 Pro** (390×844) or type a custom width

**Check search bar:**
- The search input should be left-anchored, leaving the zoom ± buttons fully visible at the top-right
- There should be a visible gap between the right edge of the search input and the left edge of the zoom control

**Check legend:**
- The legend/key panel should be at the **bottom-left** of the screen
- The Report button at the bottom-center should have no overlap with the legend

5. Switch device to **iPhone SE** (375×667) — repeat checks
6. Switch device to **Desktop** (1280×800) — confirm layout is identical to original (search centered, legend bottom-right)

### 2. Physical Device

1. Deploy to Vercel preview or run `npm run build && npm run preview` then access from phone
2. Open the app in Safari (iOS) or Chrome (Android) in portrait mode
3. Verify search bar and zoom buttons do not touch or overlap
4. Verify legend is visible at bottom-left without any overlap from the Report button

### 3. Landscape Orientation

1. Rotate phone to landscape (568px–844px wide range)
2. At 640px+ the `sm:` breakpoint activates and desktop layout is applied — confirm centered search and bottom-right legend
3. At widths below 640px in landscape, mobile layout applies — confirm no overlaps in the narrower landscape view

## Acceptance Criteria Quick Reference

| FR | Test | Pass condition |
|----|------|----------------|
| FR-001 | 390px viewport, portrait | SearchBar right edge does not touch zoom control left edge |
| FR-001 | 320px viewport, portrait | Same |
| FR-002 | 390px viewport, portrait | Legend fully visible, not covered by Report button |
| FR-003 | 390px, tap each control | Each control activates independently |
| FR-004 | 1280px desktop | Layout pixel-identical to pre-fix |
| FR-005 | 390px, all controls visible | Search, zoom, filter, report, legend all on screen |

## Running Lint

```bash
npm run lint
```

Zero errors expected — no logic changes were made.
