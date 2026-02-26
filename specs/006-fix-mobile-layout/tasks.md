# Tasks: Fix Mobile Layout Crowding

**Input**: Design documents from `/specs/006-fix-mobile-layout/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story. US1 and US2 touch separate files and can be worked in parallel after Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm the bugs are reproducible before making any changes.

- [x] T001 Run `npm run dev`, open `http://localhost:5173` in Chrome DevTools at 390px width (iPhone 14 Pro preset) and confirm: (a) the SearchBar input visually overlaps or touches the Leaflet zoom ± buttons in the top-right corner, and (b) the legend/key panel at bottom-right is partially obscured by or touching the Report button at the bottom-center — both bugs must be visible before proceeding

---

## Phase 2: Foundational (Pre-Edit Verification)

**Purpose**: Read both target files to verify their current class strings match the plan before editing. These tasks have no inter-dependency and can be done in parallel.

**⚠️ CRITICAL**: Confirm the existing class strings before editing to avoid overwriting unrelated changes.

- [x] T002 [P] Read `src/components/search/SearchBar.tsx` and confirm the outer wrapper `<div>` at line 159 has the className `"absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4"` — if it differs, record the actual value before proceeding
- [x] T003 [P] Read `src/components/ui/Legend.tsx` and confirm the outermost `<div>` at line 29 has a className beginning with `"absolute bottom-8 right-3 z-[1000]"` — if it differs, record the actual value before proceeding

**Checkpoint**: File contents confirmed — implementation can now begin. US1 and US2 can proceed in parallel (separate files).

---

## Phase 3: User Story 1 — Search Without Overlap (Priority: P1) 🎯 MVP

**Goal**: On mobile (≤639px), the search bar no longer overlaps the Leaflet zoom controls at the top-right.

**Independent Test**: Open DevTools at 390px, confirm a visible gap exists between the right edge of the SearchBar input and the left edge of the Leaflet zoom buttons. Confirm the desktop layout (1280px) is unchanged.

### Implementation for User Story 1

- [x] T004 [US1] In `src/components/search/SearchBar.tsx`, replace the outer wrapper `<div>` className at line 159 with:
  ```
  "absolute top-3 left-3 right-14 z-[1000] sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full sm:max-w-sm sm:px-4"
  ```
  Mobile: `left-3` (12px from left) + `right-14` (56px from right) provides ≥12px clearance from the 54px Leaflet zoom zone. Desktop (sm:): all current classes restored exactly.

- [x] T005 [US1] Verify the change in DevTools: (a) at 390px width confirm the SearchBar right edge does not touch the Leaflet zoom buttons, (b) at 320px width confirm the same gap exists, (c) at 1280px width confirm the SearchBar is still horizontally centered and visually identical to pre-fix — no desktop regression

**Checkpoint**: US1 complete. SearchBar and zoom controls are non-overlapping on all tested mobile widths. Desktop layout confirmed unchanged.

---

## Phase 4: User Story 2 — Legend Always Visible (Priority: P2)

**Goal**: On mobile (≤639px), the legend/key panel moves to the bottom-left corner, fully clear of the Report button and activity filter chips at the bottom-center.

**Independent Test**: Open DevTools at 390px, confirm the legend is at the bottom-left corner and no part of it is covered by the Report button. Confirm the desktop layout (1280px) still shows the legend at bottom-right.

### Implementation for User Story 2

- [x] T006 [US2] In `src/components/ui/Legend.tsx`, update the outermost `<div>` className at line 29 — replace `bottom-8 right-3` with `bottom-8 left-3 sm:left-auto sm:right-3` while keeping all other existing classes (`z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 min-w-[140px]`) unchanged. The full updated className should be:
  ```
  "absolute bottom-8 left-3 z-[1000] sm:left-auto sm:right-3 bg-white/90 backdrop-blur-sm
   rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 min-w-[140px]"
  ```

- [x] T007 [US2] Verify the change in DevTools: (a) at 390px width confirm the legend appears at the bottom-left corner with no overlap from the Report button or activity filter chips, (b) at 320px width confirm the legend is still fully visible, (c) at 1280px width confirm the legend is at the bottom-right (identical to pre-fix)

**Checkpoint**: US2 complete. Legend is fully visible at bottom-left on mobile. Desktop layout confirmed unchanged.

---

## Phase 5: User Story 3 — All Controls Reachable (Priority: P3)

**Goal**: On mobile, every control is independently tappable with no adjacent-element conflicts. This phase is validation-only — no code changes.

**Independent Test**: Interact with each of the five control groups in sequence on a 390px mobile viewport and confirm each responds correctly without accidentally triggering a neighboring element.

### Validation for User Story 3

- [x] T008 [P] [US3] On a 390px viewport in DevTools, click/tap each control in this order: (1) search bar — type a query and confirm dropdown appears, (2) Leaflet zoom + — confirm map zooms in, (3) Leaflet zoom − — confirm map zooms out, (4) each activity filter chip (Running, Walking, Biking, Commuting) — confirm active state changes, (5) Report button — confirm report form opens, (6) legend — confirm it is readable (no interaction needed). Confirm each control responds in isolation.

- [x] T009 [P] [US3] On a 320px viewport (iPhone SE), repeat the same control sequence from T008 and confirm all controls remain individually operable with no overlap-induced mis-taps

- [x] T010 [P] [US3] Rotate DevTools to landscape at 568px width — confirm the `sm:` breakpoint (640px) has NOT yet activated and mobile layout is still shown; rotate to 640px — confirm desktop layout activates with centered SearchBar and bottom-right Legend; no controls overlap in either orientation

**Checkpoint**: US3 complete. All controls verified individually operable on 390px, 320px, and landscape viewports.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Lint, regression verification, and documentation sign-off.

- [x] T011 Run `npm run lint` from the repo root and confirm zero errors — no logic was changed so no new lint issues are expected; if errors appear, fix them before marking complete
- [x] T012 [P] Run `npm test` from the repo root and confirm all existing tests pass — these changes do not touch test files or component logic, only CSS class strings
- [x] T013 Follow the acceptance criteria table in `specs/006-fix-mobile-layout/quickstart.md` and mark each FR (FR-001 through FR-005) as manually verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; T002 and T003 can run in parallel
- **US1 (Phase 3)**: Depends on T002 (SearchBar read) — can start as soon as T002 is done; does not depend on US2
- **US2 (Phase 4)**: Depends on T003 (Legend read) — can start as soon as T003 is done; does not depend on US1
- **US3 (Phase 5)**: Depends on T005 (US1 verified) and T007 (US2 verified) — requires both fixes in place
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after T002 — independent of US2
- **US2 (P2)**: Unblocked after T003 — independent of US1
- **US3 (P3)**: Requires US1 and US2 complete (validation of combined state)

### Within Each User Story

- Read file (Phase 2) → Edit className → Visual verify

### Parallel Opportunities

- T002 and T003 (Phase 2 reads) can run in parallel
- T004–T005 (US1) and T006–T007 (US2) can run in parallel — separate files, no shared state
- T008, T009, T010 (US3 validation) can run in parallel
- T011 and T012 (Polish lint + test) can run in parallel

---

## Parallel Example: US1 + US2 Together

```
After Phase 2 reads complete:

Parallel track A (US1):
  T004 — Edit SearchBar.tsx className
  T005 — Visual verify SearchBar fix

Parallel track B (US2):
  T006 — Edit Legend.tsx className
  T007 — Visual verify Legend fix

Then merge: T008, T009, T010 (US3 validation)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: T002 only (read SearchBar.tsx)
3. Complete Phase 3: T004, T005
4. **STOP and VALIDATE**: SearchBar no longer overlaps zoom on mobile; desktop unchanged
5. Ship if needed — this alone eliminates the primary navigation friction on mobile

### Incremental Delivery

1. Phase 1 + T002 + T003 → Confirmed file state
2. Phase 3 (US1) → SearchBar fixed, independently testable → Can ship
3. Phase 4 (US2) → Legend fixed, independently testable → Can ship
4. Phase 5 (US3) → Full holistic validation → Ship
5. Phase 6 → Polish and sign-off

### Parallel Team Strategy

With two developers:

1. Both complete Phase 1 and Phase 2 (T001, T002, T003)
2. Once Phase 2 done:
   - Developer A: US1 (T004, T005)
   - Developer B: US2 (T006, T007)
3. Both join for Phase 5 (US3 validation) and Phase 6 (Polish)

---

## Notes

- [P] = different files or independent verification steps — safe to run in parallel
- [Story] label maps each task to its user story for traceability
- Both code changes are one-line className replacements — no logic, no new imports, no new components
- Desktop layout is restored by `sm:` prefixed Tailwind classes — Tailwind breakpoints are 640px (sm), which correctly covers tablet and desktop
- Lint is expected to pass without changes since only string literals are modified
- If lint fails unexpectedly, run `npm run lint -- --fix` as a first step
