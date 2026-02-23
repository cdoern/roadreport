import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { supabase } from '../lib/supabaseClient';
import { POLL_INTERVAL_MS, REALTIME_DEBOUNCE_MS } from '../lib/constants';
import type { ActivityType, ConditionType, HeatmapCell } from '../types';

export interface HeatmapDataState {
  cells: HeatmapCell[];
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side activity score multipliers (SC-007: applied in-memory, < 1 s)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-activity multipliers applied to `avg_score` based on `top_condition`.
 * Conditions not listed default to 1.0 (no adjustment).
 *
 * Running  — weather conditions matter most (icy/snowy/muddy surfaces).
 * Walking  — ice + uneven surfaces are highest risk; all structural slightly elevated.
 * Biking   — potholes, flooding, congestion amplified.
 * Commuting — congestion is the dominant concern.
 */
const ACTIVITY_SCORE_WEIGHTS: Record<ActivityType, Partial<Record<ConditionType, number>>> = {
  running: {
    ice: 1.5, snow: 1.5, mud: 1.5, flooding: 1.5, standing_water: 1.5,
  },
  walking: {
    ice: 1.5, snow: 1.5, crack: 1.5, uneven_surface: 1.5,
    pothole: 1.2, missing_section: 1.2, debris: 1.2,
    broken_glass: 1.2, poor_lighting: 1.2, construction: 1.2, congestion: 1.2,
    mud: 1.2, flooding: 1.2, standing_water: 1.2,
  },
  biking: {
    pothole: 1.5, flooding: 1.5, congestion: 1.5,
  },
  commuting: {
    congestion: 1.8,
  },
};

/**
 * Fetches aggregated heatmap cells from the `get_heatmap_cells` Supabase RPC.
 *
 * Must be called from a component rendered inside a react-leaflet
 * `<MapContainer>` because it uses `useMap()` to read the current viewport
 * bounds and zoom level.
 *
 * Polling behaviour:
 * - Fetches immediately on mount and after every `moveend`/`zoomend` event.
 * - Re-polls every {@link POLL_INTERVAL_MS} (90 s) while the viewport is idle.
 * - Subscribes to Supabase Realtime INSERT events; on receiving one, resets
 *   the poll timer after a {@link REALTIME_DEBOUNCE_MS} (5 s) debounce to
 *   avoid hammering the DB for rapid multi-user submissions.
 *
 * @param activityType - Currently selected activity (used by callers for
 *   client-side score weighting; the RPC itself is activity-agnostic).
 */
export function useHeatmapData({
  activityType,
  refetchTrigger,
}: {
  activityType: ActivityType;
  /** Increment to trigger an immediate refetch (e.g. after the user submits a report). */
  refetchTrigger?: number;
}): HeatmapDataState {
  const map = useMap();

  const [rawCells, setRawCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable refs so event handlers always call the latest fetch without
  // being re-created (avoids re-registering map listeners on every render).
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCells = useCallback(async () => {
    const bounds = map.getBounds();
    const zoom = Math.round(map.getZoom());

    const { data, error: rpcError } = await supabase.rpc('get_heatmap_cells', {
      zoom_level: zoom,
      sw_lng: bounds.getWest(),
      sw_lat: bounds.getSouth(),
      ne_lng: bounds.getEast(),
      ne_lat: bounds.getNorth(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setRawCells((data as HeatmapCell[]) ?? []);
    setLoading(false);
    setError(null);
  }, [map]);

  // Store latest fetchCells in ref so interval/event callbacks stay fresh.
  const fetchRef = useRef(fetchCells);
  useEffect(() => {
    fetchRef.current = fetchCells;
  }, [fetchCells]);

  // -------------------------
  // Polling + map event wiring
  // -------------------------
  useEffect(() => {
    // Helper that resets the interval and triggers an immediate fetch.
    function resetAndFetch() {
      if (timerRef.current) clearInterval(timerRef.current);
      fetchRef.current();
      timerRef.current = setInterval(() => fetchRef.current(), POLL_INTERVAL_MS);
    }

    resetAndFetch();

    map.on('moveend', resetAndFetch);
    map.on('zoomend', resetAndFetch);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      map.off('moveend', resetAndFetch);
      map.off('zoomend', resetAndFetch);
    };
  }, [map]);

  // -------------------------
  // Immediate refetch on submission (triggered by refetchTrigger increment)
  // -------------------------
  useEffect(() => {
    // Skip the initial render (refetchTrigger starts at 0 / undefined).
    if (!refetchTrigger) return;
    if (timerRef.current) clearInterval(timerRef.current);
    fetchRef.current();
    timerRef.current = setInterval(() => fetchRef.current(), POLL_INTERVAL_MS);
  }, [refetchTrigger]);

  // -------------------------
  // Supabase Realtime subscription
  // -------------------------
  useEffect(() => {
    const channel = supabase
      .channel('rr_condition_inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'condition_reports' },
        () => {
          // Debounce: wait 5 s after last INSERT before refetching, so a
          // burst of rapid submissions triggers only one extra query.
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            if (timerRef.current) clearInterval(timerRef.current);
            fetchRef.current();
            timerRef.current = setInterval(() => fetchRef.current(), POLL_INTERVAL_MS);
          }, REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // Apply client-side activity weighting to raw cells (in-memory, no extra DB query).
  const cells = useMemo<HeatmapCell[]>(() => {
    if (rawCells.length === 0) return rawCells;
    const weights = ACTIVITY_SCORE_WEIGHTS[activityType];
    return rawCells.map((cell) => {
      const multiplier = weights[cell.top_condition] ?? 1.0;
      if (multiplier === 1.0) return cell;
      return { ...cell, avg_score: Math.min(3, cell.avg_score * multiplier) };
    });
  }, [rawCells, activityType]);

  return { cells, loading, error };
}
