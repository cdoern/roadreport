-- =============================================================
-- RoadReport — Migration 002: Fix Heatmap Location Accuracy
-- =============================================================
--
-- Problem: get_heatmap_cells returned ST_SnapToGrid corner points as the
-- displayed heat-marker position. Those corners are multiples of cell_deg
-- from the coordinate origin (0, 0), NOT the actual location of any report.
-- At max zoom (cell_deg = 0.005°) this caused up to ~560 m of offset.
-- Crossing zoom thresholds changed cell_deg, shifting all grid corners and
-- making heat markers visibly "jump" when zooming in.
--
-- Fix: Separate the grouping key (snap coordinates, unchanged) from the
-- display position (centroid of actual report coordinates in each cell).
-- A single isolated report now displays at its exact submitted coordinates.
-- A cluster displays at the geographic centre of its member reports.
--
-- The function signature, RETURNS TABLE definition, and all other columns
-- (report_count, avg_score, top_condition, latest_report_at) are unchanged.
-- No frontend code changes are required.
-- =============================================================

CREATE OR REPLACE FUNCTION get_heatmap_cells(
  zoom_level INT,
  sw_lng     FLOAT,
  sw_lat     FLOAT,
  ne_lng     FLOAT,
  ne_lat     FLOAT
)
RETURNS TABLE (
  cell_lng         FLOAT,
  cell_lat         FLOAT,
  report_count     BIGINT,
  avg_score        FLOAT,
  top_condition    TEXT,
  latest_report_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    -- Select the ST_SnapToGrid cell size based on current zoom level.
    -- Matches ZOOM_CELL_SIZES in src/lib/constants.ts.
    SELECT CASE
      WHEN zoom_level <= 5  THEN 1.0
      WHEN zoom_level <= 8  THEN 0.25
      WHEN zoom_level <= 11 THEN 0.05
      WHEN zoom_level <= 13 THEN 0.01
      ELSE                       0.005
    END AS cell_deg
  ),
  scored AS (
    SELECT
      -- Snap coordinates used as the GROUP BY key only — not displayed.
      -- These align reports into a zoom-adaptive grid for aggregation.
      ST_X(ST_SnapToGrid(location::geometry, (SELECT cell_deg FROM params))) AS snap_lng,
      ST_Y(ST_SnapToGrid(location::geometry, (SELECT cell_deg FROM params))) AS snap_lat,

      -- Actual submitted coordinates carried through for centroid computation.
      ST_X(location::geometry) AS actual_lng,
      ST_Y(location::geometry) AS actual_lat,

      condition_type,
      submitted_at,
      -- Exponential recency decay.
      -- half_life = 1.5 days for weather-environmental, 7.0 for structural.
      severity * EXP(
        -LN(2)
        / CASE
            WHEN condition_type IN ('ice','snow','mud','flooding','standing_water')
              THEN 1.5   -- weather-environmental half-life (days)
            ELSE 7.0     -- structural half-life (days)
          END
        * EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 86400.0
      ) AS decay_score
    FROM condition_reports, params
    WHERE ST_Within(
      location::geometry,
      ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
    )
  ),
  aggregated AS (
    SELECT
      -- Display position is the centroid of actual report coordinates in this
      -- cell, not the grid-corner snap coordinate.  For a single isolated
      -- report this equals its exact submitted location.  For a cluster it is
      -- the geographic average of all member report positions.
      AVG(actual_lng)                AS cell_lng,
      AVG(actual_lat)                AS cell_lat,

      COUNT(*)                       AS report_count,
      AVG(decay_score)               AS avg_score,
      -- Most common condition type in this cell (tie-break: alphabetical).
      MODE() WITHIN GROUP (ORDER BY condition_type) AS top_condition,
      MAX(submitted_at)                              AS latest_report_at
    FROM scored
    GROUP BY snap_lng, snap_lat   -- aggregate by grid cell; display by centroid
  )
  SELECT
    cell_lng::FLOAT,
    cell_lat::FLOAT,
    report_count,
    avg_score::FLOAT,
    top_condition,
    latest_report_at
  FROM aggregated
  -- Egress guard: cap rows returned to MAX_HEATMAP_ROWS (500).
  ORDER BY avg_score DESC
  LIMIT 500;
$$;
