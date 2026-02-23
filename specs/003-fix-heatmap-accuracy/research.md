# Research: Fix Heatmap Location Accuracy

**Feature**: 003-fix-heatmap-accuracy
**Date**: 2026-02-22

---

## D-001: Root Cause — ST_SnapToGrid Returns Grid Corner, Not Centroid

**Decision**: The primary bug is in `get_heatmap_cells`. The `scored` CTE computes
`ST_SnapToGrid(location::geometry, cell_deg)` and aliases those snapped coordinates as
`cell_lng` / `cell_lat`. The `aggregated` CTE then passes those through as the display
position unchanged. This means the rendered heat point is always at a grid corner — a
multiple of `cell_deg` from the (0, 0) origin — not at the actual location of any report.

**Impact at each zoom band:**

| Zoom | cell_deg | Max position error |
|------|----------|--------------------|
| ≤5   | 1.0°     | ~111 km            |
| ≤8   | 0.25°    | ~28 km             |
| ≤11  | 0.05°    | ~5.6 km            |
| ≤13  | 0.01°    | ~1.1 km            |
| ≥14  | 0.005°   | ~560 m             |

Even at max zoom a report can appear over half a kilometre from where it was submitted.

**Rationale**: The `ST_SnapToGrid` return value was used for convenience (it was already
computed for the GROUP BY key), but it is the wrong value for display purposes.

**Alternatives considered**:
- Keep as-is and accept the error → rejected (user-visible and trust-breaking).
- Use `ST_Centroid(ST_Collect(location::geometry))` → functionally equivalent to
  `AVG(actual_lng) / AVG(actual_lat)` for point geometries but adds unnecessary
  geometry overhead; plain `AVG()` is simpler and faster.

---

## D-002: Fix — Return Average Actual Coordinates as Display Position

**Decision**: Separate the grouping key from the display coordinates:
- **Grouping key**: `snap_lng / snap_lat` from `ST_SnapToGrid` (unchanged, preserves
  spatial-index performance).
- **Display position**: `AVG(actual_lng) / AVG(actual_lat)` — the geographic centroid
  of all reports in the cell.

A single isolated report therefore displays at its exact submitted coordinates. A cluster
displays at the weighted center of its members.

**Rationale**: This is the minimum change that fully resolves both the offset problem
(D-001) and the zoom-drift problem (D-003) while touching zero frontend code and
introducing zero new SQL complexity.

**Alternatives considered**:
- `ST_Centroid(ST_Collect(...))` — equivalent result, more complex, slower for points.
- `PERCENTILE_CONT(0.5)` median — more outlier-robust but not warranted here; average
  is correct and sufficient for this use case.

---

## D-003: Zoom Drift — Same Root Cause, Same Fix

**Decision**: The "moves around as you zoom" symptom is a direct consequence of D-001.
When `cell_deg` changes at a zoom threshold, the grid-corner positions shift because
they are computed against a fixed (0, 0) origin with a different step size. Using actual
average coordinates (D-002) eliminates this: the centroid of a stable set of reports
does not depend on grid origin or cell size.

**Residual behaviour** (expected and acceptable): At zoom thresholds, aggregation
groupings can change (reports that were in one cell at zoom 11 may split into two cells
at zoom 13). This is correct zoom-level behaviour — the user is seeing finer granularity
— not a position error.

---

## D-004: Delivery — New Migration File, Not Edit-in-Place

**Decision**: Deliver the fix as `supabase/migrations/002_fix_heatmap_accuracy.sql`
containing only `CREATE OR REPLACE FUNCTION get_heatmap_cells(...)`. Do not modify
`001_initial_schema.sql`.

**Rationale**: Supabase applies migrations sequentially; editing a previously applied
migration does not re-run it in production. A standalone migration file is the correct
and idiomatic approach. `CREATE OR REPLACE FUNCTION` is idempotent — safe to run
multiple times.

**Alternatives considered**:
- Edit `001_initial_schema.sql` → incorrect for production (migration already applied).
- New table/view → unnecessary complexity; the RPC contract is unchanged.

---

## D-005: Frontend — Zero Changes Required

**Decision**: The `HeatmapCell` TypeScript interface, the `useHeatmapData` hook, and
`HeatmapOverlay` component all remain unchanged. The RPC returns the same column names
(`cell_lng`, `cell_lat`, `report_count`, `avg_score`, `top_condition`,
`latest_report_at`) and the same row shape. Only the values of `cell_lng` / `cell_lat`
change — they now reflect accurate centroids instead of grid corners.

**Rationale**: The spec explicitly requires no UI changes and no new dependencies (FR-006,
Assumptions). Keeping the surface area of the change minimal reduces regression risk.

---

## D-006: No New Dependencies

**Decision**: No new npm packages or Postgres extensions required. The fix uses
`AVG()` — a standard SQL aggregate already in use in the function — and plain
`ST_X` / `ST_Y` decomposition already used elsewhere in the same query.

---

## D-007: Performance — No Degradation Expected

**Decision**: The fix adds two extra column projections (`actual_lng`, `actual_lat`)
to the `scored` CTE and changes two `AVG()` targets in `aggregated`. The query plan
remains identical in structure: one `ST_Within` spatial scan, one `GROUP BY`, one
`ORDER BY avg_score DESC LIMIT 500`. No additional joins, subqueries, or index changes.

**Validation**: The function is marked `STABLE` and is already limited to 500 rows.
No change to the 500-row cap or the 90-second client-side cache TTL is needed.
