# Implementation Plan: Fix Heatmap Location Accuracy

**Branch**: `003-fix-heatmap-accuracy` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-heatmap-accuracy/spec.md`

## Summary

Heat markers on the map appear offset from where reports were actually submitted, and
drift to different positions when the user zooms in. Root cause: the `get_heatmap_cells`
SQL function returns `ST_SnapToGrid` corner coordinates as the displayed position instead
of the geographic centroid of the actual reports in each cell.

**Fix**: In the `get_heatmap_cells` function, separate the grouping key
(`ST_SnapToGrid` snap coordinates) from the display coordinates (`AVG` of actual
lat/lng). Deliver as a single new SQL migration. Zero frontend changes.

## Technical Context

**Language/Version**: PostgreSQL 15 (Supabase) + PostGIS 3; TypeScript 5 / React 18 (no changes)
**Primary Dependencies**: PostGIS `ST_SnapToGrid`, `ST_X`, `ST_Y`, `AVG()` — all already in use
**Storage**: Supabase PostgreSQL — `condition_reports` table (no schema change); `get_heatmap_cells` RPC updated
**Testing**: `npm test && npm run lint` (project command); manual browser verification
**Target Platform**: Supabase cloud (production migration) + local Supabase CLI (dev)
**Project Type**: Web application (Vite SPA + Supabase backend)
**Performance Goals**: Heatmap refresh must remain ≤ current baseline (no new queries; same 500-row LIMIT)
**Constraints**: Single migration file; `CREATE OR REPLACE FUNCTION` (idempotent); no schema changes; no new npm packages
**Scale/Scope**: One SQL function; one new migration file; zero frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
|------|--------|----------|
| **I. Simplicity** | ✅ PASS | Single SQL function update; one new migration file; zero frontend changes; no new dependencies or abstractions |
| **II. Maintainability** | ✅ PASS | `snap_lng/snap_lat` vs `actual_lng/actual_lat` naming makes the distinction explicit; inline comment explains the centroid rationale |
| **III. Documentation** | ✅ PASS | `quickstart.md` updated; inline SQL comments added; architectural decision recorded in `research.md` |
| **IV. Code Quality** | ✅ PASS | No TypeScript changes so linter is unaffected; SQL uses only standard aggregate functions; `CREATE OR REPLACE` is idempotent |

All four gates pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-heatmap-accuracy/
├── plan.md              # This file
├── research.md          # Root-cause analysis and design decisions (D-001 to D-007)
├── data-model.md        # Entity impact (HeatmapCell interface — unchanged)
├── quickstart.md        # Developer guide for applying and verifying the fix
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
supabase/migrations/
├── 001_initial_schema.sql          # Unchanged
└── 002_fix_heatmap_accuracy.sql    # NEW — updated get_heatmap_cells RPC

src/                                # Unchanged (all files)
```

**Structure Decision**: Single new migration file in the existing `supabase/migrations/`
directory. No source tree changes. This is the smallest possible footprint for a
production-safe SQL function replacement.

## Implementation Approach

### The Change (SQL only)

In `scored` CTE — add two columns that preserve actual coordinates through to aggregation:
- `ST_X(location::geometry) AS actual_lng`
- `ST_Y(location::geometry) AS actual_lat`

(The existing `ST_SnapToGrid` columns are renamed to `snap_lng` / `snap_lat` to clarify
their role as grouping keys, not display values.)

In `aggregated` CTE:
- `GROUP BY snap_lng, snap_lat` (unchanged aggregation logic)
- `AVG(actual_lng) AS cell_lng` (replaces the passed-through snap coordinate)
- `AVG(actual_lat) AS cell_lat` (replaces the passed-through snap coordinate)

All other columns (`report_count`, `avg_score`, `top_condition`, `latest_report_at`)
are unchanged. The `SELECT` list at the end and the function return type are unchanged.

### Why This Fully Resolves Both Symptoms

**Offset symptom**: A single isolated report's centroid is its exact submitted coordinate.
No more grid-corner shift.

**Zoom-drift symptom**: The centroid of a group of reports is independent of the grid
origin and cell size. Crossing a zoom threshold regroups reports (expected fine-grain
behaviour) but no longer shifts each group's display coordinate.

## Phase Summary

| Phase | Deliverable | Scope |
|-------|-------------|-------|
| 0 | `research.md` | Root cause analysis, design decisions D-001 to D-007 ✅ |
| 1 | `data-model.md`, `quickstart.md`, `plan.md` | Design artifacts ✅ |
| 2 | `tasks.md` | Task breakdown (via `/speckit.tasks`) |
| 3 | `supabase/migrations/002_fix_heatmap_accuracy.sql` | Implementation (via `/speckit.implement`) |
