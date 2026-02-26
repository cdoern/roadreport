# Tasks: Fix Report Pin Placement & Submit Button Visibility

**Input**: Design documents from `/specs/005-fix-report-placement/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Tests**: No test tasks generated — not explicitly requested in the feature specification.

**Organization**: Tasks grouped by user story. US1 and US2 target completely different files and can be implemented in parallel once the foundational constant is in place.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — existing Vite + TypeScript project. One baseline confirmation task.

- [x] T001 Verify baseline build and tests pass: run `npm run build && npm test && npm run lint` from repo root and confirm zero errors before any changes

---

## Phase 2: Foundational (Blocking Prerequisite for US1)

**Purpose**: Add the named threshold constant that US1's `App.tsx` change depends on.

**⚠️ NOTE**: US2 (`ReportForm.tsx`) has no dependency on this phase and may begin after T001.

- [x] T002 Add `MAP_CENTER_MATCH_THRESHOLD_M = 50` constant (with inline JSDoc comment explaining its purpose) to `src/lib/constants.ts`

**Checkpoint**: Constant is exported and available. US1 implementation tasks can now begin.

---

## Phase 3: User Story 1 — Context-Aware Report Pin Placement (Priority: P1) 🎯 MVP

**Goal**: When the user opens the report form, the initial pin is placed at the map's current visible center if the map has been panned away from their GPS location; otherwise it falls back to GPS (or DEFAULT_CENTER if GPS is unavailable).

**Independent Test**: Pan the map to a different city, tap Report — pin appears at map center. Reload and tap Report without panning — pin appears at GPS location. Both scenarios testable without US2 being implemented.

### Implementation for User Story 1

- [x] T003 [US1] Extend `MapViewHandle` interface with `getCenter(): { lat: number; lng: number } | null` and implement it on the forwarded ref in `src/components/map/MapView.tsx` (implement using `leafletMap.current.getCenter()`; return `null` if map not yet mounted)
- [x] T004 [US1] Update `openReport()` callback in `src/App.tsx` to: (1) call `mapRef.current?.getCenter()` to read map center, (2) compute Haversine distance between map center and `geo.coords` (inline, no import), (3) use GPS coords when distance ≤ `MAP_CENTER_MATCH_THRESHOLD_M` or map center is null, otherwise use map center (depends on T002, T003)

**Checkpoint**: US1 fully functional. Pan map → pin at map center. No pan → pin at GPS. GPS unavailable → pin at map center.

---

## Phase 4: User Story 2 — Submit Button Always Visible (Priority: P2)

**Goal**: The Submit button is pinned to the bottom of the form panel at all times. Fields above it scroll independently. The button is never clipped or pushed off-screen by the note textarea expansion or the mobile keyboard.

**Independent Test**: Open report form, tap "Add a note", type a long multi-line note — Submit button remains visible and tappable without dismissing the keyboard. Testable without US1 being implemented.

**ℹ️ NOTE**: This phase is independent of US1 and may be started immediately after T001 (baseline confirmation).

### Implementation for User Story 2

- [x] T005 [P] [US2] Restructure the `<form>` element layout in `src/components/report/ReportForm.tsx`: (1) add `flex-1 overflow-hidden` to the outer `<form>`, (2) wrap all field elements (condition chips, severity buttons, description textarea) in a new `<div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">` scrollable region, (3) move the Submit `<button>` outside that scrollable div into a sibling `<div className="flex-shrink-0 px-5 pb-5 pt-2 border-t border-gray-100">` sticky footer

**Checkpoint**: US2 fully functional. Submit button visible at all times during note entry regardless of keyboard or textarea size.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation pass and final lint/test validation.

- [x] T006 [P] Update `specs/005-fix-report-placement/quickstart.md` to confirm the manual test steps described match the final implementation (no rewrites needed if already accurate)
- [x] T007 Run full validation: `npm run build && npm test && npm run lint` — resolve any issues before considering the feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1 / T001)**: No dependencies — start immediately
- **Foundational (Phase 2 / T002)**: Depends on T001 — BLOCKS US1 App.tsx task (T004)
- **US1 (Phase 3)**: T003 depends on T001; T004 depends on T002 + T003
- **US2 (Phase 4 / T005)**: Depends only on T001 — can proceed in parallel with Phase 2 and Phase 3
- **Polish (Phase 5)**: Depends on T004 and T005 both complete

### User Story Dependencies

- **US1 (P1)**: Requires T002 (constant) before T004 (App.tsx). T003 (MapView.tsx) can start after T001.
- **US2 (P2)**: No dependency on US1 or foundational phase — fully independent from T001 onward.

### Task-Level Order

```
T001 → T002 → T004
T001 → T003 → T004
T001 → T005           (independent of T002/T003/T004)
T004 + T005 → T006, T007
```

### Parallel Opportunities

- **T003 and T005** can run in parallel after T001 (different files: `MapView.tsx` vs `ReportForm.tsx`)
- **T002 and T005** can run in parallel after T001 (different files: `constants.ts` vs `ReportForm.tsx`)
- **T006 and T007** can run in parallel after T004 + T005

---

## Parallel Example: US1 + US2 Together

```
After T001 completes:

  Track A (US1):
    T002 — Add constant to src/lib/constants.ts
    T003 — Add getCenter() to src/components/map/MapView.tsx
    T004 — Update openReport() in src/App.tsx  (waits for T002 + T003)

  Track B (US2, in parallel with Track A):
    T005 — Restructure layout in src/components/report/ReportForm.tsx

  Merge:
    T006, T007 — Polish + final validation
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete T001: Baseline confirmation
2. Complete T002: Add constant
3. Complete T003: Add `getCenter()` to MapView
4. Complete T004: Update `openReport()` in App.tsx
5. **STOP and VALIDATE**: Pan map, tap Report — pin at map center ✅

### Full Delivery (US1 + US2)

1. T001 → T002 + T003 (parallel) → T004
2. T005 (in parallel with T002/T003/T004)
3. T006 + T007 (parallel polish)
4. PR ready

### Single Developer (Sequential)

T001 → T002 → T003 → T004 → T005 → T006 → T007

---

## Notes

- **4 source files** modified total: `constants.ts`, `MapView.tsx`, `App.tsx`, `ReportForm.tsx`
- **No new files** created; no new dependencies added
- US1 and US2 touch entirely different parts of the codebase — zero risk of merge conflicts when worked in parallel
- The inline Haversine in T004 should be 5–6 lines; if it feels like more, something is wrong — keep it simple
- Commit after T004 (US1 complete) and after T005 (US2 complete) for clean rollback granularity
