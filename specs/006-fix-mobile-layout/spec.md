# Feature Specification: Fix Mobile Layout Crowding

**Feature Branch**: `006-fix-mobile-layout`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "on mobile, the search bar overlaps with the zoom and the report overlaps with the key which shows what the colors mean, its too crowded. looks good on desktop. fix the mobile design."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Without Overlap (Priority: P1)

A mobile user opens the app to look up road conditions near a specific address. They tap the search bar at the top of the screen. Currently the search bar and the map's zoom controls occupy the same space on narrow screens, making both hard to tap and visually confusing. After this fix, the search bar and zoom controls must never overlap at any common mobile screen width.

**Why this priority**: The search bar is a primary entry point. If it collides with zoom controls, users cannot reliably tap either, breaking the core find-and-view workflow on mobile.

**Independent Test**: Open the app on a mobile device or emulator (portrait, 390px wide). Confirm the search bar input and the map zoom buttons are fully separated with no visual overlap and both are tappable without hitting the other.

**Acceptance Scenarios**:

1. **Given** the app is open on a mobile device in portrait orientation, **When** the user views the default map screen, **Then** the search bar and zoom controls are fully visible and do not overlap each other.
2. **Given** the app is open on a mobile device, **When** the user taps the search bar, **Then** the zoom controls remain visible and unobstructed, and the search bar expands or operates normally.
3. **Given** the app is open on a desktop browser, **When** the user views the default map screen, **Then** the layout is identical to the current desktop experience (no regression).

---

### User Story 2 - Legend Always Visible (Priority: P2)

A mobile user wants to understand what the heatmap colors mean. They look toward the bottom of the screen where the legend/key is displayed. Currently the Report button sits at the bottom-center and the legend sits at the bottom-right, and on narrow screens these two elements visually collide or the legend is partially hidden behind the button. After this fix, the legend is always fully visible and unobstructed when the report form is not open.

**Why this priority**: The legend is a passive but essential reference — users cannot interpret the map without it. Obscuring it degrades the core read-the-map experience.

**Independent Test**: Open the app on a mobile device (portrait, 390px wide). Confirm the full legend/key panel is visible and none of it is covered by the Report button or the activity filter chips.

**Acceptance Scenarios**:

1. **Given** the app is open on a mobile device, **When** the user views the default map screen, **Then** the legend/key is fully visible and not covered by any other UI element.
2. **Given** the app is open on a mobile device, **When** the report form slide-up panel is closed, **Then** the legend and Report button do not overlap.
3. **Given** the app is open on a mobile device, **When** the user opens the report form, **Then** the legend may be hidden behind the form panel (acceptable — form is intentional full-bottom-overlay).

---

### User Story 3 - All Controls Reachable on Mobile (Priority: P3)

A mobile user wants to interact with every map control — search, zoom, filter chips, report button, and the legend — without any of them blocking or stacking on top of each other. After this fix, the mobile layout organizes all controls into distinct, non-colliding zones so the screen does not feel crowded.

**Why this priority**: Once P1 and P2 are resolved, this story validates that the holistic mobile layout is coherent — no remaining collision between filter chips, report button, legend, or any other overlay.

**Independent Test**: Open the app on a mobile device (portrait, 390px wide). Interact with every control in sequence. Confirm each element is individually tappable without triggering an adjacent element.

**Acceptance Scenarios**:

1. **Given** the app is open on a mobile device, **When** the user taps each control one by one (search, zoom in, zoom out, each filter chip, report button, legend), **Then** each control responds to the tap without conflict from adjacent elements.
2. **Given** the app is open on a mobile device in landscape orientation, **When** the user views the map, **Then** no controls overlap (or a clearly defined reduced set of controls is shown with a documented layout).

---

### Edge Cases

- What happens on very small screens (320px wide, e.g., iPhone SE)? All primary controls (search, report, legend) must still be non-overlapping.
- What happens when the search dropdown is open? Dropdown results must not obscure zoom controls or other bottom-of-screen elements.
- What happens on a tablet (768px+) — does the mobile layout change at an appropriate breakpoint so tablets use a more spacious arrangement?
- What happens if the user has increased their device text size (accessibility zoom)? Controls must still be non-overlapping at default text sizes; very large text sizes are out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On mobile screen widths (up to 767px), the search bar and the map zoom controls MUST NOT visually overlap in portrait or landscape orientation.
- **FR-002**: On mobile screen widths (up to 767px), the legend/key panel MUST be fully visible and unobstructed by the Report button and activity filter chips when the report form is closed.
- **FR-003**: On mobile screen widths (up to 767px), every interactive control (search bar, zoom controls, activity filter chips, Report button, legend) MUST have a tappable target that does not collide with adjacent controls.
- **FR-004**: On desktop screen widths (768px and above), the existing layout MUST remain unchanged — no visual or functional regression.
- **FR-005**: The mobile layout fix MUST NOT remove or hide any existing controls; all controls present on desktop MUST also be accessible on mobile (though positioning may differ).
- **FR-006**: When the report form slide-up panel is open on mobile, it MAY cover the legend and bottom controls (this is acceptable and expected behavior).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero UI elements overlap each other on a 390px-wide portrait mobile viewport when tested against all five control categories (search, zoom, filter, report button, legend).
- **SC-002**: Zero UI elements overlap each other on a 320px-wide portrait mobile viewport (iPhone SE minimum).
- **SC-003**: The desktop layout at 1280px wide is pixel-identical to the pre-fix layout — zero visual regression on desktop.
- **SC-004**: All five interactive control areas are independently tappable on a 390px-wide touch device, verified by tapping each control and confirming only that control activates.
- **SC-005**: The fix introduces no new layout issues on landscape mobile (568px–844px wide range common on phones rotated sideways).

## Assumptions

- "Mobile" is defined as screen widths up to 767px. Widths 768px and above are treated as desktop/tablet and the current layout is preserved.
- Leaflet's built-in zoom controls are positioned top-right by default and cannot be relocated without code changes; the solution may reposition other controls to avoid them, or move the zoom controls, but must not disable them.
- The legend/key panel always shows when the report form is closed; it is acceptable for it to be hidden behind the report form slide-up when the form is open.
- Landscape mobile orientation is in scope for non-overlapping layout but does not need to match the portrait arrangement exactly.
- Accessibility (screen reader) behavior is not in scope for this fix; only visual layout and tap-target separation are addressed.
