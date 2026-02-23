# Tasks: Compact Report Form Redesign

**Input**: Design documents from `/specs/002-compact-report-form/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No test tasks generated — not requested in spec. Manual smoke-test steps included per story.

**Organization**: Tasks are grouped by user story. All changes are contained to a single file (`src/components/report/ReportForm.tsx`), so tasks must be executed sequentially.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies) — *not applicable here; all tasks are in the same file*
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the environment is ready — no new dependencies required (research D-008).

- [x] T001 Confirm `npm install` is up to date and `npm run lint` / `npx tsc --noEmit` pass cleanly on the current codebase before making any changes

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Establish the panel height constraint. Every subsequent layout change depends on this structural refactor being in place first.

**⚠️ CRITICAL**: No user story layout work can begin until T002 is complete.

- [x] T002 In `src/components/report/ReportForm.tsx` — remove the inner `<div className="overflow-y-auto max-h-[70vh] px-5 py-4">` scroll wrapper. Move `px-5 py-4` spacing onto the `<form>` element directly. Add `max-h-[44vh] overflow-hidden flex flex-col` to the outer `role="dialog"` div (alongside its existing fixed/rounded/shadow/transform classes). The slide-up animation (`translate-y-0` / `translate-y-full`) must still work.

**Checkpoint**: Panel opens, slides up, and is visually constrained to ≤44% of the viewport. No fields are visible yet (they will be restructured in subsequent tasks).

---

## Phase 3: User Story 1 — File Report With Map Visible (Priority: P1) 🎯 MVP

**Goal**: The map occupies ≥56% of the viewport while the form is open on any screen size.

**Independent Test**: Open the report form on a 375×667 viewport (iPhone SE size). The map tiles above the form panel must be visible and pannable. Tapping/dragging the map area above the panel must move the map.

### Implementation for User Story 1

- [x] T003 [US1] In `src/components/report/ReportForm.tsx` — compact the location display section. Replace the entire location `<div>` (currently containing the "Location" label, lat/lng or "Acquiring GPS…" text, the "Drag the green pin" instruction paragraph, and the GPS accuracy warning) with: a single flex row containing a small pin SVG icon (16×16) and the coordinate text (`pinLocation.lat.toFixed(5), pinLocation.lng.toFixed(5)` or "Acquiring GPS…" in italic), followed — only when `showAccuracyWarning` is true — by the existing amber accuracy badge (preserve its `role="status"` and content verbatim). Remove the "Drag the green pin on the map to adjust the exact location." paragraph entirely.

- [x] T004 [US1] Smoke-test US1: with the dev server running (`npm run dev`), open the form and confirm (a) at least 50% of the map is visible above the panel, (b) dragging the map above the panel pans it normally, (c) the form remains on screen during the pan. No code change expected — this is a pass/fail checkpoint.

**Checkpoint**: User Story 1 is fully functional. The map is visible and interactive while the form is open.

---

## Phase 4: User Story 2 — Adjust Pin Location While Form Is Open (Priority: P2)

**Goal**: Form data survives map interaction and the report is filed at the most recent pin position.

**Independent Test**: Open the form, select a condition type and severity, pan the map to a new location, then submit. The submitted report should appear at the new pin location (visible in the heatmap after refresh), and no data entered before panning should be lost.

### Implementation for User Story 2

- [x] T005 [US2] In `src/components/report/ReportForm.tsx` — locate the `FocusTrap` config block and add an inline comment above `allowOutsideClick: true` explaining: `// Required: allows map touch/click events to pass through the focus trap so users can pan the map while the form is open (US2).`

- [x] T006 [US2] Smoke-test US2: open the form, select Ice + severity 2, drag the map pin to a different street, then tap Submit. Confirm (a) "Ice" and severity 2 are still selected after dragging, (b) the success toast appears, (c) the heatmap dot appears at the dragged-to location, not the original GPS location. No code change expected.

**Checkpoint**: User Story 2 verified. Pin repositioning works with no form data loss.

---

## Phase 5: User Story 3 — Fast, Low-Friction Reporting (Priority: P3)

**Goal**: All required fields are visible at once with no scrolling; a full report can be submitted in under 30 seconds.

**Independent Test**: Time a complete submission from form-open to toast-confirmation. Should complete in under 30 seconds with no scrolling and no more than three taps (condition chip → severity button → Submit).

### Implementation for User Story 3

- [x] T007 [US3] In `src/components/report/ReportForm.tsx` — replace the `<div>` containing `<label htmlFor="condition-type-select">` and `<select id="condition-type-select">` with a horizontally scrollable chip row. Implementation:
  - Outer container: `<div>` with `<p>` label "Condition type *" (same style as before)
  - Chip container: `<div style={{ overflowX: 'auto', scrollbarWidth: 'none' }} className="flex gap-2 pb-1">` with an inline `<style>` block or a `className` hack to hide the webkit scrollbar (use `[&::-webkit-scrollbar]:hidden` if Tailwind supports it, otherwise an inline `style` attribute with `-webkit-overflow-scrolling: 'touch'`)
  - Inside the chip container: first a small `<span className="text-xs text-gray-400 shrink-0 self-center pr-1">Weather</span>` separator, then one `<button type="button">` per item in `WEATHER_CONDITIONS`, then a `<span>` separator for "Structural", then one `<button type="button">` per item in `STRUCTURAL_CONDITIONS`
  - Each chip button: `aria-pressed={conditionType === c}`, `onClick={() => setConditionType(c)}`, label from `CONDITION_LABELS[c]`
  - Selected chip classes: `bg-green-600 text-white border-green-600`; unselected: `bg-white text-gray-700 border-gray-200 hover:border-gray-300`
  - All chips: `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500`
  - Remove the `<select>` element entirely; remove the `<optgroup>` structure

- [x] T008 [US3] In `src/components/report/ReportForm.tsx` — replace the `<fieldset>` / `<legend>` / three stacked radio label rows for severity with a horizontal 3-segment button group. Implementation:
  - Outer: `<div>` with `<p>` label "Severity *" (same style as before)
  - Button group container: `<div className="flex rounded-lg border border-gray-200 overflow-hidden">`
  - Three `<button type="button">` elements (one per `SEVERITY_OPTIONS`), each:
    - `aria-pressed={severity === value}`
    - `onClick={() => setSeverity(value)}`
    - `className`: base `flex-1 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500`; active (selected): `bg-green-600 text-white`; inactive: `text-gray-700 hover:bg-gray-50`
    - Add `border-r border-gray-200` to first two buttons; no right border on the last
    - Label text: `"1 – Mild"`, `"2 – Fair"`, `"3 – Severe"` (shorten from current labels for space)
  - Remove the `<fieldset>`, `<legend>`, and all three radio `<input>` / `<label>` pairs entirely

- [x] T009 [US3] In `src/components/report/ReportForm.tsx` — replace the always-visible description `<div>` (label + textarea + char count) with a collapsible note field. Implementation:
  - Add `const [noteExpanded, setNoteExpanded] = useState(false)` at the top of the component (alongside existing state)
  - Replace the entire description `<div>` with:
    ```
    <div>
      <button
        type="button"
        aria-expanded={noteExpanded}
        onClick={() => setNoteExpanded((v) => !v)}
        className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-right text-xs text-gray-400 mt-0.5">
            {description.length} / {DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      )}
    </div>
    ```
  - Keep the existing `description` and `setDescription` state unchanged; the textarea `id` stays the same for the label association (the label element can be removed since the toggle button serves as the affordance)

- [x] T010 [US3] Smoke-test US3: open the form on a 375×667 viewport, confirm (a) the chip row, severity buttons, and "Add note" toggle are all visible at once without scrolling, (b) tapping a chip selects it, (c) tapping a severity button selects it, (d) tapping "+ Add note" reveals the textarea, (e) a full submission completes in under 30 seconds. No code change expected.

**Checkpoint**: All three user stories are fully functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T011 Run `npm run lint` in the repo root and resolve any ESLint errors introduced in `src/components/report/ReportForm.tsx`

- [x] T012 Run `npx tsc --noEmit` in the repo root and resolve any TypeScript errors in `src/components/report/ReportForm.tsx`

- [x] T013 Update the component docstring in `src/components/report/ReportForm.tsx` (the block comment above `export function ReportForm`). Replace references to "Slide-up report form panel" with "Compact slide-up report form panel" and note the 44vh height constraint and the chip/button-group/collapsible-note layout.

- [x] T014 Confirm `specs/002-compact-report-form/quickstart.md` accurately describes the implemented behaviour (already written during planning — verify no updates needed after implementation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start here
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user story work**
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 3 completion (US2 behaviour emerges from the smaller panel)
- **US3 (Phase 5)**: Depends on Phase 2 completion (can technically start after T002; logically clearer after US1)
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (panel height foundation)
- **US2 (P2)**: Depends on US1 being complete (accessible map area is a prerequisite for pin-drag verification)
- **US3 (P3)**: Depends on T002; logically sequential after US1 for clarity

### Within Each Phase

- All tasks within a phase are sequential (same file — no parallel edits)
- Complete and smoke-test each story checkpoint before moving to the next phase

---

## Parallel Example

No true parallel opportunities exist — all changes are in a single file. Implement tasks in numeric order (T001 → T014).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002) — CRITICAL
3. Complete Phase 3: User Story 1 (T003–T004)
4. **STOP and VALIDATE**: Map is visible (≥50%) while form is open
5. Ship the compact panel as the MVP — users can already see the map while reporting

### Incremental Delivery

1. T001–T002 → Panel height constraint in place
2. T003–T004 → US1 complete → Map visible ✅
3. T005–T006 → US2 verified → Pin repositioning confirmed ✅
4. T007–T010 → US3 complete → Fast friction-free form ✅
5. T011–T014 → Polish → Ready to merge

---

## Notes

- All 14 tasks modify or verify only `src/components/report/ReportForm.tsx`
- No backend, schema, hook, or prop interface changes
- FocusTrap, `aria-modal`, Escape key, and WCAG 2.4.3 focus-return behaviour are preserved throughout
- Commit after each story phase checkpoint (T004, T006, T010) to enable granular rollback
- The `key={formKey}` prop on `<ReportForm>` in `App.tsx` resets all state on each open — this already handles `noteExpanded` (it resets to `false`) without any App.tsx changes
