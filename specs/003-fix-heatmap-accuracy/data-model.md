# Data Model: Fix Heatmap Location Accuracy

**Feature**: 003-fix-heatmap-accuracy
**Date**: 2026-02-22

---

## Summary

No schema changes. No new tables, columns, indexes, or stored types. This feature
modifies only the computation inside the `get_heatmap_cells` PostgreSQL function.

---

## Existing Entity: HeatmapCell (unchanged interface)

The `HeatmapCell` TypeScript interface and the columns returned by `get_heatmap_cells`
are unchanged:

| Column            | Type        | Meaning (unchanged)                                      |
|-------------------|-------------|----------------------------------------------------------|
| `cell_lng`        | FLOAT       | **Now**: centroid longitude of reports in cell. Before: grid-corner longitude. |
| `cell_lat`        | FLOAT       | **Now**: centroid latitude of reports in cell. Before: grid-corner latitude.   |
| `report_count`    | BIGINT      | Number of reports in the aggregation cell (unchanged).   |
| `avg_score`       | FLOAT       | Decay-weighted average severity 0–3 (unchanged).         |
| `top_condition`   | TEXT        | Most common condition type in cell (unchanged).          |
| `latest_report_at`| TIMESTAMPTZ | Timestamp of most recent report in cell (unchanged).     |

### What changes in the value of cell_lng / cell_lat

**Before**: The displayed coordinates were the result of `ST_SnapToGrid` — a point on a
fixed grid aligned to multiples of `cell_deg` from the coordinate origin (0, 0).

**After**: The displayed coordinates are `AVG(actual_lng)` / `AVG(actual_lat)` —
the geographic centroid of the actual submitted report positions in that cell. For a
single isolated report, this is the exact submitted coordinate.

---

## Internal SQL Changes (implementation detail — for reference only)

The `scored` CTE gains two extra projected columns (`actual_lng`, `actual_lat`) that
carry the real report coordinates through to the aggregation step. The `aggregated`
CTE groups on the snap coordinates (unchanged) but displays the average actual
coordinates. The function signature and return type are completely unchanged.

---

## New Internal State

None. No frontend state additions. No new `useState`, `useRef`, or context values.
