# Tasks: Fix Heatmap Location Accuracy

**Input**: Design documents from `/specs/003-fix-heatmap-accuracy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: All three user stories (P1, P2, P3) share the same single SQL migration
as their implementation. Foundational phase writes and applies the migration; each user
story phase validates one distinct acceptance criterion independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm the current build and lint baseline before any changes.

- [x] T001 Run `npm run lint && npm run build` in repo root and confirm zero errors before writing any new files

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Write and apply the SQL migration that all three user stories depend on. No user story verification can begin until this phase is complete.

**⚠️ CRITICAL**: US1, US2, and US3 validations all depend on this migration being live.

- [x] T002 Create `supabase/migrations/002_fix_heatmap_accuracy.sql` using `CREATE OR REPLACE FUNCTION get_heatmap_cells` with the following changes vs `001_initial_schema.sql`:
  - In the `scored` CTE: rename the two `ST_SnapToGrid` columns from `cell_lng`/`cell_lat` to `snap_lng`/`snap_lat`, and add two new columns `ST_X(location::geometry) AS actual_lng` and `ST_Y(location::geometry) AS actual_lat` that carry the raw report coordinates
  - In the `aggregated` CTE: change `GROUP BY cell_lng, cell_lat` to `GROUP BY snap_lng, snap_lat`; change the output columns to `AVG(actual_lng) AS cell_lng` and `AVG(actual_lat) AS cell_lat` (centroid instead of grid corner)
  - All other columns (`report_count`, `avg_score`, `top_condition`, `latest_report_at`), the function signature, and the RETURNS TABLE definition are **unchanged**
  - Add an inline SQL comment on the `AVG(actual_lng)` line explaining: "Display position is the centroid of actual report coordinates; snap coordinates are used for grouping only"

- [ ] T003 Apply the migration to the active Supabase instance — run `supabase db push` (local CLI) or paste `supabase/migrations/002_fix_heatmap_accuracy.sql` into the Supabase SQL Editor and execute

**Checkpoint**: Migration is live — all three user story verifications can now proceed in parallel.

---

## Phase 3: User Story 1 — Individual Report Appears at Correct Location (Priority: P1) 🎯 MVP

**Goal**: A single isolated report's heat marker appears at the submitted pin location, not offset by a block or more.

**Independent Test**: Submit one report at a recognizable landmark (e.g., a specific intersection). Zoom to max zoom (level 14+). Confirm the heat marker is visually at the pin, not offset by tens of meters or more.

- [ ] T004 [US1] Verify single-report accuracy in the browser: submit one report at a known pin location with no other reports nearby; wait for heatmap to refresh; zoom to maximum zoom level; confirm the heat marker appears at the submitted coordinates and not at a shifted grid position

---

## Phase 4: User Story 2 — Heat Markers Remain Stable When Zooming (Priority: P2)

**Goal**: Heat markers do not jump or drift when the user zooms between levels.

**Independent Test**: Observe a heat marker at zoom 10–12. Zoom in to 14–16 in several steps. The marker should remain anchored to the same geographic position at each step.

- [ ] T005 [US2] Verify zoom stability in the browser: identify a visible heat marker at a low zoom level (10–12); zoom in progressively to level 14–16, crossing at least two zoom thresholds; confirm the heat marker stays anchored to the same geographic coordinates and does not jump or drift at any threshold

---

## Phase 5: User Story 3 — Clustered Reports Display at Geographic Center (Priority: P3)

**Goal**: When multiple reports fall within the same aggregation cell, the heat marker appears near the geographic center of those reports, not at an arbitrary grid corner.

**Independent Test**: Submit 3 reports at slightly different positions within a 50-metre area. Confirm the heat marker is visually centered among those positions.

- [ ] T006 [US3] Verify cluster centroid in the browser: submit 3 reports at pin locations that are within approximately 50 metres of each other; wait for heatmap refresh; zoom in; confirm the single resulting heat marker appears within the bounding area of the three submitted pins and is not offset to one corner

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation confirmation and final quality check.

- [x] T007 Confirm the inline comment in `supabase/migrations/002_fix_heatmap_accuracy.sql` on the `AVG(actual_lng)` / `AVG(actual_lat)` lines clearly explains the centroid rationale (non-obvious business logic per Constitution §III)
- [x] T008 Confirm `specs/003-fix-heatmap-accuracy/quickstart.md` accurately reflects the migration application steps from T003 (update the file if any step diverged during implementation)
- [x] T009 Run `npm run lint && npm run build` to confirm zero regressions after all changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS all user story verifications**
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion; all three can proceed in parallel once T003 is done
- **Polish (Phase 6)**: Depends on all user story verifications passing

### User Story Dependencies

- **US1 (P1)**: Depends on T003 (migration applied) — no dependency on US2 or US3
- **US2 (P2)**: Depends on T003 (migration applied) — no dependency on US1 or US3
- **US3 (P3)**: Depends on T003 (migration applied) — no dependency on US1 or US2

### Parallel Opportunities

- T004, T005, T006 (story verifications) can all run in parallel once T003 is complete
- T007 and T008 (polish) can run in parallel

---

## Parallel Example: After Migration Is Applied

```bash
# Once T003 is done, all three validations can start simultaneously:
Task: "T004 [US1] Verify single-report accuracy in browser"
Task: "T005 [US2] Verify zoom stability in browser"
Task: "T006 [US3] Verify cluster centroid in browser"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003) — migration written and applied
3. Complete Phase 3: US1 (T004) — verify individual report accuracy
4. **STOP and VALIDATE**: Can demo accurate single-report placement
5. Continue to US2/US3 if validation passes

### Incremental Delivery

1. T001: Baseline confirmed
2. T002–T003: Migration live → all stories can be verified
3. T004: Individual accuracy confirmed (MVP)
4. T005: Zoom stability confirmed
5. T006: Cluster centroid confirmed
6. T007–T009: Polish complete → ready to merge

---

## Notes

- The single SQL migration (T002) resolves all three user stories simultaneously
- No TypeScript / frontend files change — lint/build checks are regression guards only
- `supabase/migrations/002_fix_heatmap_accuracy.sql` uses `CREATE OR REPLACE FUNCTION` — safe to re-run if needed
- Verification tasks (T004–T006) are manual browser checks; no automated test framework is added (none requested in spec)
- Commit after T003 (migration file added) and after T009 (polish complete)
