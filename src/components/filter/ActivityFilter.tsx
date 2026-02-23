import { useRef } from 'react';
import type { ActivityType } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITIES: { value: ActivityType; label: string }[] = [
  { value: 'running',   label: 'Running'   },
  { value: 'walking',   label: 'Walking'   },
  { value: 'biking',    label: 'Biking'    },
  { value: 'commuting', label: 'Commuting' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityFilterProps {
  value: ActivityType;
  onChange: (next: ActivityType) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pill-group activity filter implementing the ARIA roving tabindex pattern.
 *
 * - Only the active button has `tabIndex={0}`; others have `tabIndex={-1}`.
 * - ArrowLeft / ArrowRight move focus and fire `onChange`.
 * - `role="group"` + `aria-label` on the wrapper div.
 */
export function ActivityFilter({ value, onChange }: ActivityFilterProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIdx: number
  ) {
    let nextIdx: number | null = null;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % ACTIVITIES.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + ACTIVITIES.length) % ACTIVITIES.length;
    }

    if (nextIdx !== null) {
      onChange(ACTIVITIES[nextIdx].value);
      btnRefs.current[nextIdx]?.focus();
    }
  }

  return (
    <div
      role="group"
      aria-label="Filter by activity type"
      className="flex rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white/95 backdrop-blur-sm"
    >
      {ACTIVITIES.map(({ value: actVal, label }, idx) => {
        const isActive = actVal === value;
        return (
          <button
            key={actVal}
            ref={(el) => { btnRefs.current[idx] = el; }}
            type="button"
            tabIndex={isActive ? 0 : -1}
            aria-pressed={isActive}
            onClick={() => onChange(actVal)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`px-3 py-2 text-xs font-semibold transition-colors focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500
                        ${isActive
                          ? 'bg-green-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                        }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
