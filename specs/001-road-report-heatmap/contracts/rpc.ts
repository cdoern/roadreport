/**
 * contracts/rpc.ts
 *
 * TypeScript signatures for all Supabase RPC (Remote Procedure Call) functions.
 * These map 1:1 to PostgreSQL functions defined in supabase/migrations/.
 *
 * Usage:
 *   const { data, error } = await supabase.rpc('get_heatmap_cells', params);
 */

import type { HeatmapCell, HeatmapQuery } from '../data-model';

// ---------------------------------------------------------------------------
// get_heatmap_cells
// ---------------------------------------------------------------------------

/**
 * Returns aggregated HeatmapCell records for the current map viewport.
 *
 * Cell size adapts to zoom level:
 *   zoom ≤ 5  → ~111 km cells
 *   zoom ≤ 8  → ~28 km cells
 *   zoom ≤ 11 → ~5.5 km cells
 *   zoom ≤ 13 → ~1.1 km cells
 *   zoom > 13 → ~550 m cells
 *
 * Scores use exponential recency decay differentiated by condition class:
 *   weather_environmental: half-life = 1.5 days
 *   structural:            half-life = 7.0 days
 *
 * @param params - Viewport bounding box and zoom level
 * @returns Array of HeatmapCell, maximum 500 rows, ordered by avg_score DESC
 *
 * Supabase call:
 *   supabase.rpc('get_heatmap_cells', {
 *     zoom_level: 14,
 *     sw_lng: -71.12,
 *     sw_lat: 42.34,
 *     ne_lng: -71.05,
 *     ne_lat: 42.38,
 *   })
 */
export type GetHeatmapCellsParams = HeatmapQuery;
export type GetHeatmapCellsResult = HeatmapCell[];
