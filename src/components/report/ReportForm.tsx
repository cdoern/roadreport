import { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { supabase } from '../../lib/supabaseClient';
import { GPS_ACCURACY_THRESHOLD_METERS } from '../../lib/constants';
import { ACTIVITY_DEFAULT_CONDITION } from '../../types';
import type { ActivityType, ConditionType, InsertConditionReport, ToastState } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WEATHER_CONDITIONS: ConditionType[] = [
  'ice',
  'snow',
  'mud',
  'flooding',
  'standing_water',
];

const STRUCTURAL_CONDITIONS: ConditionType[] = [
  'pothole',
  'crack',
  'uneven_surface',
  'missing_section',
  'debris',
  'broken_glass',
  'poor_lighting',
  'construction',
  'congestion',
];

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

const SEVERITY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1 – Mild' },
  { value: 2, label: '2 – Fair' },
  { value: 3, label: '3 – Severe' },
];

const DESCRIPTION_MAX_LENGTH = 280;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportFormProps {
  isOpen: boolean;
  /** Activity context pre-selects the default condition type. */
  activityType: ActivityType;
  /** Current pin position (from GPS + drag). Null if GPS not available yet. */
  pinLocation: { lat: number; lng: number } | null;
  /** GPS horizontal accuracy in metres; null if unknown. */
  accuracy: number | null;
  /** Whether the user has manually moved the pin (suppresses accuracy warning). */
  pinAdjusted: boolean;
  /** Stable session token from useSessionToken(). */
  sessionToken: string;
  onToast: (message: string, type: ToastState['type']) => void;
  onClose: () => void;
  /** Called on successful submission to trigger an immediate heatmap refetch. */
  onSubmitSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compact slide-up report form panel rendered in the accessible overlay layer.
 *
 * Capped at 44vh so the map remains visible and interactive (≥56% of the
 * viewport) while a report is being filed. Layout uses no internal scroll —
 * all required controls fit in a single non-scrolling panel:
 *   - Horizontally scrollable chip row for condition type (14 options)
 *   - Horizontal 3-segment button group for severity
 *   - Collapsible "Add note" toggle for the optional description
 *
 * The form is *always mounted* (only translated off-screen when closed) so
 * the slide-up CSS transition works. FocusTrap is activated only when
 * `isOpen` is true. `allowOutsideClick: true` lets map pan/zoom events pass
 * through so the user can reposition the pin without closing the form.
 */
export function ReportForm({
  isOpen,
  activityType,
  pinLocation,
  accuracy,
  pinAdjusted,
  sessionToken,
  onToast,
  onClose,
  onSubmitSuccess,
}: ReportFormProps) {
  const defaultCondition = ACTIVITY_DEFAULT_CONDITION[activityType];

  const [conditionType, setConditionType] = useState<ConditionType | ''>(defaultCondition);
  const [severity, setSeverity] = useState<1 | 2 | 3 | null>(null);
  const [description, setDescription] = useState('');
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = conditionType !== '' && severity !== null && pinLocation !== null;

  // ── T029: low accuracy warning ──────────────────────────────────────────
  const showAccuracyWarning =
    !pinAdjusted &&
    accuracy !== null &&
    accuracy > GPS_ACCURACY_THRESHOLD_METERS;

  // ── T028: submission logic ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    const payload: InsertConditionReport = {
      // WKT format: POINT(longitude latitude) — longitude first.
      location: `POINT(${pinLocation!.lng} ${pinLocation!.lat})`,
      condition_type: conditionType as ConditionType,
      severity: severity!,
      description: description.trim() || undefined,
      session_token: sessionToken,
      activity_context: activityType,
    };

    const { error } = await supabase.from('condition_reports').insert(payload);

    if (error) {
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        onToast('Limit reached: 30 reports per hour. Try again later.', 'error');
        onClose();
      } else {
        // Keep form open with data intact so user can retry.
        onToast('Submission failed — your report is saved, tap Submit to retry.', 'error');
        setIsSubmitting(false);
      }
      return;
    }

    onToast('Report submitted! Thank you.', 'success');
    onSubmitSuccess();
    onClose();
  }

  return (
    <FocusTrap
      active={isOpen}
      focusTrapOptions={{
        initialFocus: '#report-form-close-btn',
        // Required: allows map touch/click events to pass through the focus trap so
        // users can pan the map while the form is open (US2).
        allowOutsideClick: true,
        // Do NOT use onDeactivate to close — in React StrictMode the trap's
        // effect cleanup fires onDeactivate before the second setup pass,
        // which would immediately close the form.  Close is handled explicitly
        // by the × button, Escape key handler below, and handleSubmit.
        escapeDeactivates: false,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-form-title"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className={`fixed bottom-0 inset-x-0 z-[1500] bg-white rounded-t-2xl shadow-2xl
                   max-h-[44vh] overflow-hidden flex flex-col
                   transform transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <h2 id="report-form-title" className="text-base font-bold text-gray-900">
            Report a Condition
          </h2>
          <button
            id="report-form-close-btn"
            onClick={onClose}
            aria-label="Close report form"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form body — flex column so the submit button is pinned to the bottom
             and the fields area scrolls independently. This prevents the button
             from being clipped when the note textarea expands or the mobile
             keyboard raises the viewport. */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">

          {/* Scrollable fields area */}
          <div className="flex flex-col gap-4 px-5 py-4 flex-1 overflow-y-auto">

            {/* ── Location display ── */}
            <div>
              <div className="flex items-center gap-1.5">
                {/* Pin icon */}
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-green-600 shrink-0">
                  <path d="M12 21C12 21 5 13.5 5 8.5a7 7 0 1 1 14 0c0 5-7 12.5-7 12.5z" />
                  <circle cx="12" cy="8.5" r="2.5" />
                </svg>
                {pinLocation ? (
                  <span className="text-sm text-gray-700 font-mono">
                    {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 italic">Acquiring GPS…</span>
                )}
              </div>

              {/* GPS accuracy warning */}
              {showAccuracyWarning && (
                <div
                  role="status"
                  className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"
                >
                  <span aria-hidden="true" className="text-amber-500 mt-px">⚠</span>
                  <span>
                    GPS accuracy is low ({Math.round(accuracy!)}m) — drag the pin to your
                    exact location before submitting.
                  </span>
                </div>
              )}
            </div>

            {/* ── Condition type ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Condition type <span aria-hidden="true" className="text-red-500">*</span>
              </p>
              {/* Horizontally scrollable chip row; scrollbar hidden via inline style */}
              <div
                className="flex items-center gap-2 pb-1"
                style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                <span className="text-xs text-gray-400 shrink-0 self-center">Weather</span>
                {WEATHER_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={conditionType === c}
                    onClick={() => setConditionType(c)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium
                                transition-colors focus:outline-none focus-visible:ring-2
                                focus-visible:ring-green-500
                                ${conditionType === c
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                }`}
                  >
                    {CONDITION_LABELS[c]}
                  </button>
                ))}
                <span className="text-xs text-gray-400 shrink-0 self-center pl-1">Structural</span>
                {STRUCTURAL_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={conditionType === c}
                    onClick={() => setConditionType(c)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium
                                transition-colors focus:outline-none focus-visible:ring-2
                                focus-visible:ring-green-500
                                ${conditionType === c
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                }`}
                  >
                    {CONDITION_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Severity ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Severity <span aria-hidden="true" className="text-red-500">*</span>
              </p>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {SEVERITY_OPTIONS.map(({ value, label }, idx) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={severity === value}
                    onClick={() => setSeverity(value)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-inset
                                focus-visible:ring-green-500
                                ${idx < SEVERITY_OPTIONS.length - 1 ? 'border-r border-gray-200' : ''}
                                ${severity === value
                                  ? 'bg-green-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-50'
                                }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Note (optional, collapsible) ── */}
            <div>
              <button
                type="button"
                aria-expanded={noteExpanded}
                onClick={() => setNoteExpanded((v) => !v)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              >
                {noteExpanded ? '– Hide note' : '+ Add note (optional)'}
              </button>
              {noteExpanded && (
                <div className="mt-2">
                  <textarea
                    id="description-textarea"
                    rows={2}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    placeholder="Any additional details…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                               text-gray-800 resize-none focus:outline-none
                               focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-right text-xs text-gray-400 mt-0.5">
                    {description.length} / {DESCRIPTION_MAX_LENGTH}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Sticky submit footer — lives outside the scrollable area so it
               is always visible regardless of keyboard state or note expansion. */}
          <div className="flex-shrink-0 px-5 pb-5 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full py-3 rounded-xl font-semibold text-sm
                         bg-green-600 text-white
                         hover:bg-green-700 active:bg-green-800
                         disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300
                         transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>

          </form>
      </div>
    </FocusTrap>
  );
}
