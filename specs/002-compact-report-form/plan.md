# Implementation Plan: Compact Report Form Redesign

**Branch**: `002-compact-report-form` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-compact-report-form/spec.md`

## Summary

Redesign `ReportForm.tsx` to occupy ≤44% of the viewport so the map remains visible and interactive while a report is being filed. Replace the tall vertical stack (select dropdown + stacked radio buttons + textarea) with compact horizontal controls: a scrollable chip row for condition type, a 3-segment horizontal button group for severity, and a collapsible note field. No backend, type, hook, or API changes.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18
**Primary Dependencies**: Vite 5, Tailwind CSS 3, focus-trap-react (already installed), Leaflet / react-leaflet v4
**Storage**: N/A — form state is transient; Supabase submission logic unchanged
**Testing**: `npm test` (Vitest) + `npm run lint` (ESLint + TypeScript)
**Target Platform**: Mobile web PWA (iOS Safari, Android Chrome) + desktop browser
**Project Type**: Single web application (SPA)
**Performance Goals**: Form open/close animation ≤ 300ms (CSS transition already present); all form fields accessible without scrolling
**Constraints**: Must preserve WCAG 2.4.3 (FocusTrap, focus return), `aria-modal` dialog role, Escape key dismiss, and all existing submission/error-handling behaviour
**Scale/Scope**: Single component change — `src/components/report/ReportForm.tsx` only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity** | ✅ PASS | One file changed. No new abstractions, no new dependencies. Horizontal layout utilities already available in Tailwind. Collapsible note = one `useState` boolean. |
| **Documentation** | ✅ PASS | Docstring in `ReportForm.tsx` updated. `quickstart.md` updated. No new architectural decisions requiring an ADR (this is a layout-only change). |
| **Code Quality** | ✅ PASS | Linter and TypeScript must pass before merge. FocusTrap, accessibility role, and keyboard handling preserved verbatim. |
| **Maintainability** | ✅ PASS | Component SRP unchanged — one component, one responsibility. State shape is minimally extended (one new boolean). No dead code introduced. |

**Post-design re-check**: All gates still pass. No violations found. Complexity Tracking table is empty (no violations).

## Project Structure

### Documentation (this feature)

```text
specs/002-compact-report-form/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions
├── data-model.md        # Phase 1 — entity reference
├── quickstart.md        # Phase 1 — developer guide
└── tasks.md             # Phase 2 — /speckit.tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── report/
│       └── ReportForm.tsx    ← only file modified
├── hooks/                    (unchanged)
├── lib/                      (unchanged)
└── types/                    (unchanged)
```

**Structure Decision**: Single-project SPA. Only `ReportForm.tsx` is modified. No new files, no new directories.

## Phase 0: Research

Complete. See [research.md](./research.md) for all decision records. Summary:

| # | Decision | Outcome |
|---|----------|---------|
| D-001 | Panel height | `max-h-[44vh]`, no internal scroll |
| D-002 | Condition type control | Horizontal scrollable chip row |
| D-003 | Severity control | Horizontal 3-segment button group |
| D-004 | Description field | Collapsible "Add note" toggle |
| D-005 | Location display | Single compact line (icon + coords); retain accuracy badge |
| D-006 | FocusTrap | Unchanged — `allowOutsideClick: true` already passes map taps |
| D-007 | Files changed | `ReportForm.tsx` only |
| D-008 | Dependencies | None added |

All NEEDS CLARIFICATION items: **none**.

## Phase 1: Design & Contracts

### Layout Specification

The redesigned form is a fixed bottom panel with three zones:

```
┌─────────────────────────────────────────┐  ← drag handle (8px, decorative)
│  📍 37.77453, -122.41940    [×]          │  ← header: location + close button
│  ⚠ GPS low (45m) — drag pin to adjust   │  ← optional accuracy badge (1 line)
├─────────────────────────────────────────┤
│  Condition ──────────────────────────   │
│  [ Ice ][ Snow ][ Mud ][ Pothole ] →    │  ← horizontal scrollable chip row
│                                         │
│  Severity                               │
│  [  1 – Mild  ][  2 – Fair  ][ 3 – Severe ]  │  ← 3-segment button group
│                                         │
│  + Add note (optional)                  │  ← collapsed by default
├─────────────────────────────────────────┤
│  [ Submit Report ]                      │  ← full-width primary button
└─────────────────────────────────────────┘
        ≤ 44vh total
```

### Chip Row Grouping

```
── Weather ──────────────────────────────────────────
[ Ice ] [ Snow ] [ Mud ] [ Flooding ] [ Standing water ]

── Structural ───────────────────────────────────────
[ Pothole ] [ Crack ] [ Uneven ] [ Missing section ]
[ Debris ] [ Broken glass ] [ Poor lighting ]
[ Construction ] [ Congestion ]
```

All in one horizontally scrollable row with a category label separator between the two groups.

### State Shape (complete)

```typescript
// Existing (unchanged)
conditionType: ConditionType | ''
severity: 1 | 2 | 3 | null
description: string
isSubmitting: boolean

// New
noteExpanded: boolean   // controls description field visibility
```

### Scrollbar hiding (CSS-only, no new dependency)

```css
/* Applied to the chip row container via Tailwind arbitrary properties */
overflow-x: auto;
scrollbar-width: none;          /* Firefox */
-ms-overflow-style: none;       /* IE/Edge */
/* ::webkit-scrollbar { display: none } via Tailwind [&::-webkit-scrollbar]:hidden */
```

### Accessibility (preserved verbatim)

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the panel → unchanged
- `FocusTrap` with `allowOutsideClick: true`, `escapeDeactivates: false` → unchanged
- `onKeyDown` Escape handler → unchanged
- `initialFocus: '#report-form-close-btn'` → unchanged
- Chip row: each chip is a `<button type="button">` with `aria-pressed` state
- Severity: `<fieldset>` + `<legend>` wrapping three `<button type="button">` with `aria-pressed`
- Note toggle: `<button type="button" aria-expanded={noteExpanded}>`

### No API Contracts

This feature has no new endpoints, RPC calls, or Supabase schema changes. The existing `supabase.from('condition_reports').insert(payload)` call is unchanged.

## Implementation Tasks (preview — see tasks.md)

1. Replace panel height: remove `max-h-[70vh]` overflow wrapper; constrain outer `<div>` to `max-h-[44vh]`
2. Implement chip row for condition type (14 chips, 2 groups, horizontal scroll, `aria-pressed`)
3. Implement 3-segment severity button group (replaces radio fieldset)
4. Implement collapsible note field (`noteExpanded` state, "Add note" toggle button, `aria-expanded`)
5. Compact location display (icon + coords on one line; accuracy badge directly below)
6. Remove "Drag the pin to adjust" instruction paragraph
7. Smoke-test: open form, pan map, verify ≥50% map visible; submit; verify no data loss on pan
8. Lint + TypeScript check pass
9. Update `quickstart.md` (already done above)
