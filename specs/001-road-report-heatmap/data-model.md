# Data Model: Crowdsourced Road & Sidewalk Condition Map

**Branch**: `001-road-report-heatmap` | **Date**: 2026-02-19

---

## Entities Overview

| Entity | Storage | Description |
|---|---|---|
| `condition_reports` | Supabase table | A single user-submitted condition report anchored to a lat/lng |
| `HeatmapCell` | RPC output (computed) | Aggregated score for a zoom-adaptive geographic cell |
| `ActivityType` | TypeScript enum | One of four activity filters |
| `ConditionType` | TypeScript + DB enum | Specific condition being reported |
| `ConditionClass` | Derived | Structural (slow decay) vs weather-environmental (fast decay) |

---

## Table: `condition_reports`

### Schema

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE condition_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location        GEOGRAPHY(Point, 4326) NOT NULL,
  condition_type  TEXT        NOT NULL,
  severity        SMALLINT    NOT NULL CHECK (severity BETWEEN 1 AND 3),
  description     TEXT        CHECK (char_length(description) <= 280),
  session_token   TEXT        NOT NULL,
  activity_context TEXT       CHECK (activity_context IN ('running','walking','biking','commuting')),
  upvotes         INTEGER     NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Condition Types & Classes

The `condition_type` field uses one of the following values. The `condition_class` is derived at query time:

| condition_type | condition_class | Half-life (days) |
|---|---|---|
| `ice` | weather_environmental | 1.5 |
| `snow` | weather_environmental | 1.5 |
| `mud` | weather_environmental | 1.5 |
| `flooding` | weather_environmental | 1.5 |
| `standing_water` | weather_environmental | 1.5 |
| `pothole` | structural | 7.0 |
| `crack` | structural | 7.0 |
| `uneven_surface` | structural | 7.0 |
| `missing_section` | structural | 7.0 |
| `debris` | structural | 7.0 |
| `broken_glass` | structural | 7.0 |
| `poor_lighting` | structural | 7.0 |
| `construction` | structural | 7.0 |
| `congestion` | structural | 7.0 |

### Constraints & Validation Rules

- `severity`: integer 1 (good), 2 (fair), 3 (poor) — matches spec's poor/fair/good scale inverted for score computation (higher = worse)
- `description`: optional, maximum 280 characters
- `session_token`: browser-generated UUID, required, used for rate limiting only
- `activity_context`: optional; records which activity filter was active when the report was filed
- `upvotes`: non-negative counter, incremented by subsequent user agreement; no duplicate-vote prevention in v1
- `condition_type`: must be one of the 14 values enumerated above (enforced via CHECK constraint in migration)

### Indexes

```sql
-- Primary spatial index — required for all ST_Within and ST_DWithin queries
CREATE INDEX condition_reports_location_gist
  ON condition_reports USING GIST (location);

-- Recency filter index — used in decay scoring and cleanup queries
CREATE INDEX condition_reports_submitted_at_idx
  ON condition_reports (submitted_at DESC);

-- Rate limit index — used by the BEFORE INSERT trigger
CREATE INDEX condition_reports_session_token_idx
  ON condition_reports (session_token, submitted_at DESC);
```

### Rate Limit Trigger

```sql
-- Enforces FR-015: max 30 submissions per session token per hour
CREATE OR REPLACE FUNCTION enforce_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM condition_reports
  WHERE session_token = NEW.session_token
    AND submitted_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED'
      USING HINT = 'You have reached the 30 reports per hour limit. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_rate_limit
  BEFORE INSERT ON condition_reports
  FOR EACH ROW EXECUTE FUNCTION enforce_rate_limit();
```

### Nightly Cleanup (pg_cron)

```sql
-- Runs nightly at 02:00 UTC; removes rows where decay score is effectively zero
SELECT cron.schedule(
  'nightly-report-cleanup',
  '0 2 * * *',
  $$
    DELETE FROM condition_reports
    WHERE submitted_at < NOW() - INTERVAL '90 days';
  $$
);
```

---

## RPC Function: `get_heatmap_cells`

Returns aggregated HeatmapCell data for the current map viewport and zoom level.

### Signature

```sql
CREATE OR REPLACE FUNCTION get_heatmap_cells(
  zoom_level  INT,
  sw_lng      FLOAT,
  sw_lat      FLOAT,
  ne_lng      FLOAT,
  ne_lat      FLOAT
)
RETURNS TABLE (
  cell_lng      FLOAT,
  cell_lat      FLOAT,
  report_count  BIGINT,
  avg_score     FLOAT,
  top_condition TEXT
)
LANGUAGE SQL STABLE AS $$
  WITH params AS (
    SELECT
      CASE
        WHEN zoom_level <= 5  THEN 1.0
        WHEN zoom_level <= 8  THEN 0.25
        WHEN zoom_level <= 11 THEN 0.05
        WHEN zoom_level <= 13 THEN 0.01
        ELSE                       0.005
      END AS cell_size
  ),
  bbox AS (
    SELECT ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326) AS geom
  ),
  scored AS (
    SELECT
      ST_X(ST_SnapToGrid(location::GEOMETRY, (SELECT cell_size FROM params))) AS cell_lng,
      ST_Y(ST_SnapToGrid(location::GEOMETRY, (SELECT cell_size FROM params))) AS cell_lat,
      condition_type,
      -- Exponential decay: weather half-life 1.5d, structural 7.0d
      severity * EXP(
        -EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 86400.0
        / CASE condition_type
            WHEN 'ice'           THEN 1.5
            WHEN 'snow'          THEN 1.5
            WHEN 'mud'           THEN 1.5
            WHEN 'flooding'      THEN 1.5
            WHEN 'standing_water' THEN 1.5
            ELSE                      7.0
          END
      ) AS decay_score
    FROM condition_reports, bbox
    WHERE ST_Within(location::GEOMETRY, bbox.geom)
      AND submitted_at > NOW() - INTERVAL '90 days'
  )
  SELECT
    cell_lng,
    cell_lat,
    COUNT(*)                                   AS report_count,
    AVG(decay_score)                           AS avg_score,
    (SELECT condition_type
     FROM scored s2
     WHERE s2.cell_lng = scored.cell_lng AND s2.cell_lat = scored.cell_lat
     GROUP BY condition_type
     ORDER BY COUNT(*) DESC LIMIT 1)           AS top_condition
  FROM scored
  GROUP BY cell_lng, cell_lat
  HAVING COUNT(*) >= 1
  ORDER BY avg_score DESC
  LIMIT 500;
$$;
```

### Output: `HeatmapCell`

| Field | Type | Description |
|---|---|---|
| `cell_lng` | float | Longitude of the cell centroid (snapped grid point) |
| `cell_lat` | float | Latitude of the cell centroid |
| `report_count` | bigint | Number of reports contributing to this cell |
| `avg_score` | float | Decay-weighted average severity score (0 = good, 3 = poor) |
| `top_condition` | string | Most-reported condition type in this cell (for popup display) |

---

## TypeScript Types

```typescript
// src/types/index.ts

export type ActivityType = 'running' | 'walking' | 'biking' | 'commuting';

export type ConditionType =
  // Weather-environmental (fast decay: 1.5 day half-life)
  | 'ice' | 'snow' | 'mud' | 'flooding' | 'standing_water'
  // Structural (slow decay: 7.0 day half-life)
  | 'pothole' | 'crack' | 'uneven_surface' | 'missing_section'
  | 'debris' | 'broken_glass' | 'poor_lighting' | 'construction' | 'congestion';

export type ConditionClass = 'weather_environmental' | 'structural';

export const CONDITION_CLASS: Record<ConditionType, ConditionClass> = {
  ice: 'weather_environmental',
  snow: 'weather_environmental',
  mud: 'weather_environmental',
  flooding: 'weather_environmental',
  standing_water: 'weather_environmental',
  pothole: 'structural',
  crack: 'structural',
  uneven_surface: 'structural',
  missing_section: 'structural',
  debris: 'structural',
  broken_glass: 'structural',
  poor_lighting: 'structural',
  construction: 'structural',
  congestion: 'structural',
};

/** A single user-submitted condition report (matches DB row shape). */
export interface ConditionReport {
  id: string;
  location: { lat: number; lng: number };
  condition_type: ConditionType;
  severity: 1 | 2 | 3; // 1 = good/mild, 2 = fair, 3 = poor/severe
  description?: string;
  session_token: string;
  activity_context?: ActivityType;
  upvotes: number;
  submitted_at: string; // ISO 8601
}

/** Shape for inserting a new report (id and submitted_at are server-generated). */
export interface NewConditionReport {
  lat: number;
  lng: number;
  condition_type: ConditionType;
  severity: 1 | 2 | 3;
  description?: string;
  session_token: string;
  activity_context?: ActivityType;
}

/** Aggregated output from get_heatmap_cells RPC. */
export interface HeatmapCell {
  cell_lng: number;
  cell_lat: number;
  report_count: number;
  avg_score: number; // 0 (best) to 3 (worst); drives heatmap intensity
  top_condition: ConditionType;
}

/** Parameters for the get_heatmap_cells RPC. */
export interface HeatmapQuery {
  zoom_level: number;
  sw_lng: number;
  sw_lat: number;
  ne_lng: number;
  ne_lat: number;
}
```

---

## Lifecycle & State Transitions

### ConditionReport

```
[Browser] User fills form
    → POST to condition_reports (via Supabase JS client)
    → BEFORE INSERT trigger checks rate limit (raises on ≥30/hr)
    → Row inserted with submitted_at = NOW()
    → Client receives success (or RATE_LIMIT_EXCEEDED exception)
    → Heatmap polling picks up new data within 90 seconds
    → [pg_cron nightly] Row deleted after 90 days
```

### Upvote

```
[Browser] User taps "upvote" on a report popup
    → PATCH condition_reports SET upvotes = upvotes + 1 WHERE id = ?
    → No duplicate prevention in v1 (session-based prevention is a v2 concern)
```

---

## Data Volume Estimates (Free Tier Headroom)

| Metric | Estimate | Basis |
|---|---|---|
| Row size | ~300 bytes | UUID + geography point + text fields |
| Rows at 500MB limit | ~1.7M | 500MB ÷ 300B |
| After 90-day cleanup | Steady state ≈ daily submissions × 90 | At 500 new reports/day: ~45k rows — well within limit |
| RPC egress per call | ~25KB | 500 rows × ~50 bytes/row |
| RPC calls at 5GB/month | ~200k calls | 5GB ÷ 25KB — at 90s polling: supports ~250 concurrent users |
