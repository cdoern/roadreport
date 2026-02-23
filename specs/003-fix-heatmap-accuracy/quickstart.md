# Developer Quickstart: Fix Heatmap Location Accuracy

**Feature**: 003-fix-heatmap-accuracy
**Branch**: `003-fix-heatmap-accuracy`

---

## What Changed

The `get_heatmap_cells` Supabase RPC previously returned the `ST_SnapToGrid` corner
point as each cell's displayed coordinates. This caused heat markers to appear offset
from actual report locations by up to half the cell diameter, and to jump position
when crossing zoom-level thresholds. The fix changes the display coordinates to the
geographic centroid (average lat/lng) of the actual reports in each cell.

**Files changed**: one new SQL migration only.

```
supabase/migrations/
└── 002_fix_heatmap_accuracy.sql   ← CREATE OR REPLACE FUNCTION get_heatmap_cells
```

No frontend files changed.

---

## Applying the Migration

### Local / Development (supabase CLI)

```bash
supabase db push
# or
supabase migration up
```

### Production (Supabase SQL Editor)

Copy the contents of `supabase/migrations/002_fix_heatmap_accuracy.sql` and run it in
the Supabase SQL Editor. The function uses `CREATE OR REPLACE` so it is safe to re-run.

---

## Verifying the Fix

1. Submit a report at a known map landmark (e.g., a specific intersection).
2. Wait for the heatmap to refresh (or trigger by submitting — the `refetchTrigger`
   fires immediately after submission).
3. At zoom level 14+, the heat marker should be visually aligned with the pin location.
4. Zoom in and out through several levels — the marker should remain anchored to the
   same geographic position without drifting.

---

## Why ST_SnapToGrid Is Still Used

`ST_SnapToGrid` is retained as the **GROUP BY key** so that nearby reports are still
aggregated into a single heat point per zoom level. Removing it would return one dot per
report at all zoom levels, which is unreadable and exceeds the 500-row egress cap. The
snap grid is now used solely for grouping; the displayed position is the centroid of
each group's actual coordinates.

---

## No Frontend Changes Required

The `HeatmapCell` TypeScript interface, `useHeatmapData` hook, and `HeatmapOverlay`
component all remain unchanged. The RPC returns the same column names and row shape —
only the numeric values of `cell_lng` and `cell_lat` change to be more accurate.
