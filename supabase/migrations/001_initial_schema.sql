-- =============================================================
-- RoadReport — Initial Schema Migration
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- =============================================================

-- -------------------------
-- Extensions
-- -------------------------

CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_cron is available on Supabase Pro/Team tiers.
-- The nightly cleanup schedule at the bottom requires it.
-- Comment out the cron.schedule() call if running on free tier.
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- -------------------------
-- Enum-style CHECK helpers
-- -------------------------

-- Condition types split into weather-environmental (fast decay: 1.5-day half-life)
-- and structural (slow decay: 7.0-day half-life).
-- Stored as TEXT + CHECK rather than a Postgres ENUM so adding new values
-- is a simple migration (no ENUM ALTER).

-- -------------------------
-- Table: condition_reports
-- -------------------------

CREATE TABLE IF NOT EXISTS condition_reports (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PostGIS geography point: geography(Point,4326) stores lat/lng as WGS-84.
  -- Inserted as WKT: 'POINT(longitude latitude)' — note: longitude first.
  location       GEOGRAPHY(Point, 4326) NOT NULL,

  -- All valid condition types (weather-environmental + structural).
  condition_type TEXT            NOT NULL
    CHECK (condition_type IN (
      -- Weather-environmental (fast decay)
      'ice', 'snow', 'mud', 'flooding', 'standing_water',
      -- Structural (slow decay)
      'pothole', 'crack', 'uneven_surface', 'missing_section',
      'debris', 'broken_glass', 'poor_lighting', 'construction', 'congestion'
    )),

  -- 1 = good/mild, 2 = fair, 3 = poor/severe
  severity       SMALLINT        NOT NULL CHECK (severity BETWEEN 1 AND 3),

  -- Optional free-text description; capped at 280 characters.
  description    TEXT            CHECK (char_length(description) <= 280),

  -- Browser-generated UUID stored in sessionStorage.
  -- Not linked to any user account; used for rate-limiting only.
  session_token  TEXT            NOT NULL,

  -- Optional activity context the reporter was engaged in.
  activity_context TEXT
    CHECK (activity_context IN ('running', 'walking', 'biking', 'commuting')),

  -- Community upvotes; incremented via increment_upvote() RPC.
  upvotes        INTEGER         NOT NULL DEFAULT 0,

  submitted_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------
-- Indexes
-- -------------------------

-- Spatial index for ST_Within / ST_DWithin queries in get_heatmap_cells.
CREATE INDEX IF NOT EXISTS idx_condition_reports_location
  ON condition_reports USING GIST (location);

-- Used for ORDER BY submitted_at DESC in decay scoring and cleanup.
CREATE INDEX IF NOT EXISTS idx_condition_reports_submitted_at
  ON condition_reports (submitted_at DESC);

-- Composite index for rate-limit trigger: count rows by session_token in last hour.
CREATE INDEX IF NOT EXISTS idx_condition_reports_session_submitted
  ON condition_reports (session_token, submitted_at DESC);


-- -------------------------
-- Rate-limit trigger
-- -------------------------

CREATE OR REPLACE FUNCTION enforce_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count reports from this session_token in the last rolling hour.
  SELECT COUNT(*)
    INTO recent_count
    FROM condition_reports
   WHERE session_token = NEW.session_token
     AND submitted_at  > NOW() - INTERVAL '1 hour';

  -- Hard limit: 30 reports per session token per hour.
  -- The exception code 'RATE_LIMIT_EXCEEDED' is caught by the frontend
  -- to display the appropriate user-facing error message.
  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED'
      USING DETAIL = 'Maximum 30 reports per hour per session.',
            HINT   = 'Wait before submitting more reports.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_enforce_rate_limit
  BEFORE INSERT ON condition_reports
  FOR EACH ROW EXECUTE FUNCTION enforce_rate_limit();


-- -------------------------
-- RPC: get_heatmap_cells
-- -------------------------
-- Aggregates condition_reports into spatial grid cells using ST_SnapToGrid.
-- Cell size is zoom-adaptive (see ZOOM_CELL_SIZES in src/lib/constants.ts).
-- Each cell's score is a decay-weighted average severity:
--
--   score = severity × exp(-ln(2) / half_life_days × age_days)
--
-- Weather-environmental conditions use a 1.5-day half-life (fast decay).
-- Structural conditions use a 7.0-day half-life (slow decay).
-- This means a pothole reported yesterday still has ~91% of its original weight,
-- while icy conditions from 3 days ago retain only ~25%.
-- -------------------------

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
      -- Snap each report's coordinates to the grid cell centre.
      ST_X(ST_SnapToGrid(location::geometry, (SELECT cell_deg FROM params))) AS cell_lng,
      ST_Y(ST_SnapToGrid(location::geometry, (SELECT cell_deg FROM params))) AS cell_lat,
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
      cell_lng,
      cell_lat,
      COUNT(*)                       AS report_count,
      AVG(decay_score)               AS avg_score,
      -- Most common condition type in this cell (tie-break: alphabetical).
      MODE() WITHIN GROUP (ORDER BY condition_type) AS top_condition,
      MAX(submitted_at)                              AS latest_report_at
    FROM scored
    GROUP BY cell_lng, cell_lat
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


-- -------------------------
-- RPC: increment_upvote
-- -------------------------
-- Atomically increments upvotes on a single report.

CREATE OR REPLACE FUNCTION increment_upvote(report_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE condition_reports
     SET upvotes = upvotes + 1
   WHERE id = report_id;
$$;


-- -------------------------
-- Nightly cleanup (pg_cron)
-- -------------------------
-- Removes reports older than 90 days every day at 02:00 UTC.
-- Requires pg_cron extension (Supabase Pro/Team tier).
-- Comment out if running on Supabase free tier.

SELECT cron.schedule(
  'rr-nightly-cleanup',
  '0 2 * * *',
  $$
    DELETE FROM condition_reports
     WHERE submitted_at < NOW() - INTERVAL '90 days';
  $$
);
