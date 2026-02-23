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
  { value: 1, label: '1 – Good / Mild' },
  { value: 2, label: '2 – Fair' },
  { value: 3, label: '3 – Poor / Severe' },
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
 * Slide-up report form panel rendered in the accessible overlay layer.
 *
 * Manages its own field state.  Submit logic (T028) and GPS accuracy handling
 * (T029) are co-located here per the task plan.
 *
 * The form is *always mounted* (only translated off-screen when closed) so
 * that the slide-up CSS transition works.  FocusTrap is activated only when
 * `isOpen` is true.
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
                   transform transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 id="report-form-title" className="text-lg font-bold text-gray-900">
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

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[70vh] px-5 py-4">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* ── Location display (T027) ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Location
              </p>
              {pinLocation ? (
                <p className="text-sm text-gray-700 font-mono">
                  {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Acquiring GPS…</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Drag the green pin on the map to adjust the exact location.
              </p>

              {/* ── T029: GPS accuracy warning ── */}
              {showAccuracyWarning && (
                <div
                  role="status"
                  className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"
                >
                  <span aria-hidden="true" className="text-amber-500 mt-px">⚠</span>
                  <span>
                    GPS accuracy is low ({Math.round(accuracy!)}m) — drag the pin to your
                    exact location before submitting.
                  </span>
                </div>
              )}
            </div>

            {/* ── Condition type (T027) ── */}
            <div>
              <label
                htmlFor="condition-type-select"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"
              >
                Condition type <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="condition-type-select"
                required
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as ConditionType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                           text-gray-800 bg-white focus:outline-none
                           focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a condition…</option>
                <optgroup label="Weather &amp; Environmental">
                  {WEATHER_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Road &amp; Sidewalk Structural">
                  {STRUCTURAL_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* ── Severity (T027) ── */}
            <fieldset>
              <legend className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Severity <span aria-hidden="true" className="text-red-500">*</span>
              </legend>
              <div className="flex flex-col gap-2">
                {SEVERITY_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer
                                transition-colors text-sm
                                ${severity === value
                                  ? 'border-green-500 bg-green-50 text-green-800'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={value}
                      checked={severity === value}
                      onChange={() => setSeverity(value)}
                      className="accent-green-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* ── Description (T027) ── */}
            <div>
              <label
                htmlFor="description-textarea"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"
              >
                Description <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                id="description-textarea"
                rows={3}
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

            {/* ── Submit ── */}
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
          </form>
        </div>
      </div>
    </FocusTrap>
  );
}
