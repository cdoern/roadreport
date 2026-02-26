import type { ActivityType } from '../../types';
import { LOW_DATA_THRESHOLD } from '../../lib/constants';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  running: 'Running',
  walking: 'Walking',
  biking: 'Biking',
  commuting: 'Commuting',
};

interface LegendProps {
  activityType: ActivityType;
  /** Total report count in current viewport — used for low-data indicator. */
  totalReports?: number;
}

/**
 * Fixed-position heatmap legend rendered bottom-right.
 * Shows the green→red gradient scale, the active activity filter, and a
 * low-data indicator when the current viewport has too few reports to be
 * statistically meaningful.
 */
export function Legend({ activityType, totalReports = 0 }: LegendProps) {
  const isLowData = totalReports < LOW_DATA_THRESHOLD;

  return (
    <div
      aria-label="Heatmap legend"
      className="absolute bottom-8 left-3 z-[1000] sm:left-auto sm:right-3 bg-white/90 backdrop-blur-sm
                 rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 min-w-[140px]"
    >
      {/* Activity pill */}
      <div className="flex justify-center">
        <span className="text-xs font-semibold bg-green-100 text-green-800 rounded-full px-2.5 py-0.5">
          {ACTIVITY_LABELS[activityType]}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="flex flex-col gap-0.5">
        <div
          className="h-3 w-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
          }}
          aria-hidden="true"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-medium">
          <span>Good</span>
          <span>Poor</span>
        </div>
      </div>

      {/* Low-data indicator */}
      {isLowData && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 opacity-60"
            aria-hidden="true"
          />
          <span>low data</span>
        </div>
      )}
    </div>
  );
}
