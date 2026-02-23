# Research: Compact Report Form Redesign

**Branch**: `002-compact-report-form` | **Date**: 2026-02-22

## Decision Log

---

### D-001: Panel Height Cap

**Decision**: Cap the report panel at `max-h-[44vh]` with no internal scroll.

**Rationale**: The spec requires ≥50% of the map to remain visible while the form is open. At 44vh the panel itself leaves 56% of the map unobstructed — enough to confirm pin position and pan the map. The remaining 6% headroom over the 40% FR-001 limit accommodates the drag handle and header on real devices without the form ever reaching the 50% threshold.

**Alternatives considered**:
- 40vh: Too tight on small phones (320px wide, ~568px tall) — not enough room for condition chips and submit button.
- 50vh: Hits the spec's lower bound exactly; no margin for browser chrome (address bar, home indicator).
- Side panel: More complex layout, breaks the existing slide-up animation pattern, and is unusual for mobile PWAs.

---

### D-002: Condition Type Control

**Decision**: Replace the `<select>` dropdown with a horizontally scrollable chip/pill row (one chip per condition, grouped with a small category label header).

**Rationale**: The `<select>` dropdown requires three interactions (tap to open, scroll, tap to choose) and contributes significant vertical height when open on mobile. Horizontal chip rows use ~48px of vertical space regardless of the number of options, allow direct one-tap selection, and provide visible state (selected chip highlighted). 14 chips fit in two logical groups that scroll horizontally.

**Alternatives considered**:
- Keep `<select>`: Too tall when the native picker opens; no visual selection state.
- Accordion groups: Takes vertical space when expanded; still multiple taps.
- Grid layout (2-column): More vertical height than a single scrollable row.

---

### D-003: Severity Control

**Decision**: Replace the three stacked radio-button labels with a single horizontal 3-segment button group (buttons labelled "1 – Mild", "2 – Fair", "3 – Severe" side by side).

**Rationale**: Three stacked radio rows take ~120px; a horizontal button group takes ~44px. The tap targets remain adequate at one-third of the panel width each. The visual selection state (filled background on active segment) is immediately legible.

**Alternatives considered**:
- Slider: Accessibility concerns; ambiguous value at intermediate positions.
- Keeping radio stacks: Too tall for the compact panel constraint.
- Icon-only (1/2/3 with no label): Insufficient clarity without accompanying text.

---

### D-004: Description / Note Field

**Decision**: Replace the always-visible 3-row textarea with a collapsed "Add note (optional) +" toggle. Tapping it reveals a single auto-growing text input. If a note has been entered, the field stays expanded and shows the character count.

**Rationale**: The description field is optional and most users do not use it. Hiding it by default saves ~80–100px of vertical space. Expanding on demand is a standard mobile pattern (e.g., comment fields in most social/maps apps). Field data is preserved if the user collapses and re-expands.

**Alternatives considered**:
- Always-visible single-row textarea: Saves ~40px vs the current 3-row; still always present.
- Remove entirely: Breaks feature parity; some users do add useful notes.

---

### D-005: Location Display

**Decision**: Reduce the location section to a single compact line: pin icon + formatted lat/lng. Remove the "Drag the pin to adjust" instruction paragraph (discoverability via the visible draggable pin is sufficient). Retain the GPS accuracy warning as a compact inline badge beneath the coordinate line.

**Rationale**: The instruction paragraph ("Drag the green pin on the map to adjust the exact location") takes ~24px of height and is redundant — the pin is visually obvious on the map. Coordinates alone communicate that the system has acquired a location.

**Alternatives considered**:
- Remove location display entirely: Reduces transparency; users can't confirm the pin was acquired.
- Keep full instruction text: Violates "minimal" design goal and wastes vertical space.

---

### D-006: FocusTrap & Map Interaction

**Decision**: No changes to the FocusTrap configuration or the accessibility architecture. Keep `allowOutsideClick: true` and `escapeDeactivates: false`.

**Rationale**: The FocusTrap already allows clicks outside the form panel to pass through. The physical obstruction problem (map unresponsive in the lower 70vh) is solved entirely by reducing the panel height to 44vh — the map's upper 56% is unobstructed, and users can pan/zoom freely there.

**Alternatives considered**:
- Disabling FocusTrap when the user interacts with the map: Breaks WCAG 2.4.3 (Focus Order); not acceptable.
- Rendering the form outside the dialog role: Breaks screen reader accessibility.

---

### D-007: Files Changed

**Decision**: This redesign is a contained change to a single file — `src/components/report/ReportForm.tsx`. No other files require modification.

**Rationale**: The form's props interface, submit logic, FocusTrap integration, and Supabase call are all unchanged. Only the JSX layout and internal state for the collapsible note field change.

**Alternatives considered**:
- Extracting sub-components (ChipRow, SeverityPicker): Premature abstraction — these UI elements are used exactly once, in one component. Constitution Principle I (Simplicity/YAGNI) prohibits this.

---

### D-008: No New Dependencies

**Decision**: No new packages. All required styling utilities are available via Tailwind CSS 3 (already installed). The collapsible note toggle requires only a boolean `useState`.

**Rationale**: Adding a UI library or a new Tailwind plugin for scrollbar hiding would violate Constitution Principle I (dependencies must provide substantial value). Native CSS (`overflow-x: auto; scrollbar-width: none`) achieves the same result.

**Alternatives considered**:
- `@headlessui/react` disclosure component: Overkill for a single boolean toggle.
- `tailwind-scrollbar-hide` plugin: Adds a build dependency for a one-liner CSS rule.
