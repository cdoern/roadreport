// ============================================================
// Activity Types
// ============================================================

export type ActivityType = 'running' | 'walking' | 'biking' | 'commuting';

// ============================================================
// Condition Types & Classification
// ============================================================

/** All reportable condition types. Weather-environmental conditions decay faster (1.5-day half-life)
 *  than structural conditions (7.0-day half-life). */
export type ConditionType =
  // Weather-environmental (fast decay: 1.5-day half-life)
  | 'ice'
  | 'snow'
  | 'mud'
  | 'flooding'
  | 'standing_water'
  // Structural (slow decay: 7.0-day half-life)
  | 'pothole'
  | 'crack'
  | 'uneven_surface'
  | 'missing_section'
  | 'debris'
  | 'broken_glass'
  | 'poor_lighting'
  | 'construction'
  | 'congestion';

export type ConditionClass = 'weather_environmental' | 'structural';

/** Maps each ConditionType to its class and decay half-life in days. */
export const CONDITION_META: Record<ConditionType, { class: ConditionClass; halfLifeDays: number }> = {
  ice:              { class: 'weather_environmental', halfLifeDays: 1.5 },
  snow:             { class: 'weather_environmental', halfLifeDays: 1.5 },
  mud:              { class: 'weather_environmental', halfLifeDays: 1.5 },
  flooding:         { class: 'weather_environmental', halfLifeDays: 1.5 },
  standing_water:   { class: 'weather_environmental', halfLifeDays: 1.5 },
  pothole:          { class: 'structural', halfLifeDays: 7.0 },
  crack:            { class: 'structural', halfLifeDays: 7.0 },
  uneven_surface:   { class: 'structural', halfLifeDays: 7.0 },
  missing_section:  { class: 'structural', halfLifeDays: 7.0 },
  debris:           { class: 'structural', halfLifeDays: 7.0 },
  broken_glass:     { class: 'structural', halfLifeDays: 7.0 },
  poor_lighting:    { class: 'structural', halfLifeDays: 7.0 },
  construction:     { class: 'structural', halfLifeDays: 7.0 },
  congestion:       { class: 'structural', halfLifeDays: 7.0 },
};

// ============================================================
// Database Entities
// ============================================================

/** A single user-submitted condition report as stored in Supabase. */
export interface ConditionReport {
  id: string;
  /** PostGIS geography point — returned as { lat, lng } after parsing. */
  location: { lat: number; lng: number };
  condition_type: ConditionType;
  /** 1 = good/mild, 2 = fair, 3 = poor/severe */
  severity: 1 | 2 | 3;
  description?: string;
  /** Browser-generated UUID stored in sessionStorage; used for rate limiting only. */
  session_token: string;
  activity_context?: ActivityType;
  upvotes: number;
  submitted_at: string; // ISO 8601
}

/** Fields required to insert a new ConditionReport.
 *  id, submitted_at, and upvotes are set server-side. */
export interface NewConditionReport {
  lat: number;
  lng: number;
  condition_type: ConditionType;
  severity: 1 | 2 | 3;
  description?: string;
  session_token: string;
  activity_context?: ActivityType;
}

/** Shape used when calling supabase.from('condition_reports').insert().
 *  location is a PostGIS WKT string: 'POINT(longitude latitude)'. */
export interface InsertConditionReport {
  /** PostGIS WKT: 'POINT(lng lat)' — note longitude first. */
  location: string;
  condition_type: ConditionType;
  severity: 1 | 2 | 3;
  description?: string;
  session_token: string;
  activity_context?: ActivityType;
}

// ============================================================
// Heatmap Aggregation
// ============================================================

/** Aggregated output from the get_heatmap_cells RPC function. */
export interface HeatmapCell {
  cell_lng: number;
  cell_lat: number;
  report_count: number;
  /** Decay-weighted average severity score: 0 (best) → 3 (worst). */
  avg_score: number;
  top_condition: ConditionType;
  /** ISO 8601 timestamp of the most-recent report in this cell. */
  latest_report_at: string;
}

/** Parameters for the get_heatmap_cells Supabase RPC. */
export interface HeatmapQuery {
  zoom_level: number;
  sw_lng: number;
  sw_lat: number;
  ne_lng: number;
  ne_lat: number;
}

// ============================================================
// UI State
// ============================================================

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Activity-to-condition priority ordering for popup display. */
export const ACTIVITY_CONDITION_PRIORITY: Record<ActivityType, ConditionType[]> = {
  running:   ['ice', 'snow', 'crack', 'uneven_surface', 'mud', 'debris', 'pothole', 'flooding', 'standing_water', 'missing_section', 'broken_glass', 'poor_lighting', 'construction', 'congestion'],
  walking:   ['ice', 'uneven_surface', 'crack', 'debris', 'snow', 'mud', 'broken_glass', 'pothole', 'flooding', 'standing_water', 'missing_section', 'poor_lighting', 'construction', 'congestion'],
  biking:    ['pothole', 'flooding', 'congestion', 'crack', 'construction', 'debris', 'mud', 'standing_water', 'uneven_surface', 'ice', 'snow', 'missing_section', 'broken_glass', 'poor_lighting'],
  commuting: ['congestion', 'construction', 'flooding', 'pothole', 'crack', 'debris', 'standing_water', 'uneven_surface', 'mud', 'ice', 'snow', 'missing_section', 'broken_glass', 'poor_lighting'],
};

/** Default condition_type pre-selected in ReportForm per active activity. */
export const ACTIVITY_DEFAULT_CONDITION: Record<ActivityType, ConditionType> = {
  running:   'ice',
  walking:   'uneven_surface',
  biking:    'pothole',
  commuting: 'congestion',
};
