import { useMemo, useState } from 'react';
import { Popup, useMapEvents } from 'react-leaflet';
import type { LatLng, LeafletMouseEvent } from 'leaflet';
import { ACTIVITY_CONDITION_PRIORITY } from '../../types';
import type { ActivityType, ConditionType, HeatmapCell } from '../../types';
import { LOW_DATA_THRESHOLD, ZOOM_CELL_SIZES } from '../../lib/constants';

// -------------------------
// Helpers
// -------------------------

const CONDITION_LABELS: Record<ConditionType, string> = {
  ice: 'Ice',
  snow: 'Snow',
  mud: 'Mud',
  flooding: 'Flooding',
  standing_water: 'Standing water',
  pothole: 'Pothole',
  crack: 'Crack',
  uneven_surface: 'Uneven surface',
  missing_section: 'Missing section',
  debris: 'Debris',
  broken_glass: 'Broken glass',
  poor_lighting: 'Poor lighting',
  construction: 'Construction',
  congestion: 'Congestion',
};

function scoreBadgeClass(avgScore: number): string {
  if (avgScore < 1.2) return 'bg-green-100 text-green-800';
  if (avgScore < 2.1) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function scoreLabel(avgScore: number): string {
  if (avgScore < 1.2) return 'Good';
  if (avgScore < 2.1) return 'Fair';
  return 'Poor';
}

/** ISO 8601 → human-readable relative string ("3h ago", "2d ago"). */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Half-cell-size tolerance (degrees) for hit-testing a click against cells. */
function clickTolerance(zoom: number): number {
  const entry =
    ZOOM_CELL_SIZES.find((s) => zoom <= s.maxZoom) ??
    ZOOM_CELL_SIZES[ZOOM_CELL_SIZES.length - 1];
  return entry.cellDeg * 0.55;
}

// -------------------------
// Component
// -------------------------

interface ConditionPopupProps {
  cells: HeatmapCell[];
  activityType: ActivityType;
}

/**
 * Listens for map click events and shows a Leaflet `<Popup>` with cell data.
 *
 * The current cell is *derived* from `clickPos + cells` via `useMemo`, so
 * when cells refresh (new poll data arrives) the popup automatically shows
 * updated information without needing a separate effect to manage state.
 *
 * Return values of `currentCell`:
 * - `undefined` — no click yet → no popup rendered
 * - `null`      — click landed outside any cell → "No reports" popup
 * - `HeatmapCell` — nearest cell found → data popup
 */
export function ConditionPopup({ cells, activityType }: ConditionPopupProps) {
  const [clickPos, setClickPos] = useState<{ latlng: LatLng; zoom: number } | null>(null);

  useMapEvents({
    click(e: LeafletMouseEvent) {
      setClickPos({ latlng: e.latlng, zoom: e.target.getZoom() });
    },
  });

  // Derive nearest cell from current cells + click position (no useEffect needed).
  const currentCell = useMemo<HeatmapCell | null | undefined>(() => {
    if (!clickPos) return undefined;
    const { latlng, zoom } = clickPos;
    const tolerance = clickTolerance(zoom);

    let nearest: HeatmapCell | null = null;
    let minDist = Infinity;

    for (const cell of cells) {
      const dLat = Math.abs(cell.cell_lat - latlng.lat);
      const dLng = Math.abs(cell.cell_lng - latlng.lng);
      if (dLat <= tolerance && dLng <= tolerance) {
        const dist = dLat * dLat + dLng * dLng;
        if (dist < minDist) {
          minDist = dist;
          nearest = cell;
        }
      }
    }

    return nearest; // null = within bounds but no cell hit
  }, [clickPos, cells]);

  // No click yet
  if (currentCell === undefined || !clickPos) return null;

  // Click hit empty area
  if (currentCell === null) {
    return (
      <Popup position={clickPos.latlng} eventHandlers={{ popupclose: () => setClickPos(null) }}>
        <p className="text-sm text-gray-500 py-1">No reports yet for this area.</p>
      </Popup>
    );
  }

  // Show highest-priority condition for active activity
  const priority = ACTIVITY_CONDITION_PRIORITY[activityType];
  const displayCondition = priority.find((c) => c === currentCell.top_condition) ?? currentCell.top_condition;
  const isLowData = currentCell.report_count < LOW_DATA_THRESHOLD;

  return (
    <Popup position={clickPos.latlng} eventHandlers={{ popupclose: () => setClickPos(null) }}>
      <div className="flex flex-col gap-1.5 min-w-[160px] py-1">
        <p className="font-semibold text-sm text-gray-800">
          {CONDITION_LABELS[displayCondition]}
        </p>

        <span
          className={`inline-block self-start text-xs font-medium rounded-full px-2 py-0.5
            ${scoreBadgeClass(currentCell.avg_score)}`}
        >
          {scoreLabel(currentCell.avg_score)} ({currentCell.avg_score.toFixed(1)})
        </span>

        <p className="text-xs text-gray-500">
          {currentCell.report_count} {currentCell.report_count === 1 ? 'report' : 'reports'}
          {isLowData && (
            <span className="ml-1.5 text-[10px] text-gray-400 italic">(low data)</span>
          )}
        </p>

        <p className="text-xs text-gray-400">
          Last reported: {relativeTime(currentCell.latest_report_at)}
        </p>
      </div>
    </Popup>
  );
}
