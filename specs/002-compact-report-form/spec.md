# Feature Specification: Compact Report Form Redesign

**Feature Branch**: `002-compact-report-form`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "redesign the report popup to take up less of the page. it is currently impossible to view the map in order to drag around your location AND file a report at the same time. the popup needs to be more elegant. and minimal."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - File Report With Map Visible (Priority: P1)

A user spots a road hazard, taps the report button, and fills out the compact form — all while the map remains visible and pannable behind it. They can confirm their pin is in exactly the right location without closing the form.

**Why this priority**: The core problem being solved — users currently cannot verify or adjust their report location while the form is open. This is the primary pain point.

**Independent Test**: Open the report form and confirm that at least 50% of the map remains visible and interactive while the form is displayed.

**Acceptance Scenarios**:

1. **Given** the report form is open, **When** the user looks at the screen, **Then** a meaningful portion of the map (at least 50% of viewport) remains visible behind or beside the form.
2. **Given** the report form is open, **When** the user pans or zooms the map, **Then** the map responds normally and the form remains accessible without closing.
3. **Given** the report form is open on a small mobile screen, **When** the user views the screen, **Then** the form does not cover the entire map — some map context is always visible.

---

### User Story 2 - Adjust Pin Location While Form Is Open (Priority: P2)

A user opens the report form, realizes their GPS-placed pin is slightly off, and drags the map to reposition it — all without dismissing the form or losing their entered data.

**Why this priority**: Directly enables accurate reporting; without this, users must cancel, reposition, and restart — leading to abandoned reports or inaccurate location data.

**Independent Test**: Enter partial form data, pan the map to reposition the report pin, then complete and submit the form — data entered before panning must still be present.

**Acceptance Scenarios**:

1. **Given** the user has started filling out the report form, **When** they drag the map to adjust the pin position, **Then** all previously entered form data is preserved.
2. **Given** the map has been panned while the form is open, **When** the user submits the report, **Then** the report is filed at the updated pin location, not the original one.
3. **Given** the form is open, **When** the user taps outside the form onto the map, **Then** the tap initiates map interaction (pan/zoom) rather than dismissing the form unintentionally.

---

### User Story 3 - Fast, Low-Friction Reporting (Priority: P3)

A user who knows exactly what they want to report completes the minimal form in under 30 seconds without scrolling or navigating multiple screens.

**Why this priority**: A compact form must remain fast to complete — reducing cognitive load and field count matters as much as reducing visual footprint.

**Independent Test**: Time a complete report submission (condition type + optional note + submit) and confirm it takes under 30 seconds without scrolling.

**Acceptance Scenarios**:

1. **Given** the report form is open, **When** the user views it, **Then** all required fields are immediately visible without scrolling.
2. **Given** the user selects a condition type, **When** they tap submit, **Then** the report is filed — no additional confirmation steps are required for standard submissions.
3. **Given** the form is dismissed (via cancel or successful submit), **When** the user looks at the screen, **Then** the map returns to its full-screen view instantly with no layout shift.

---

### Edge Cases

- What happens when the user opens the form on a very small screen (e.g., 320px wide)? The form must still not fully cover the map.
- What if the user taps the map while the form is open — does the tap pan the map or is it interpreted as a dismiss gesture?
- What if the user repositions the map so that the original pin is no longer visible — does the pin follow the map center, or stay fixed at the original coordinates?
- What if the form is open and the device rotates between portrait and landscape — does the layout adapt without data loss?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The report form MUST occupy no more than 40% of the viewport height so that the map remains the dominant visual element.
- **FR-002**: The map MUST remain interactive (pan and zoom) while the report form is open.
- **FR-003**: The report form MUST display all required fields without requiring the user to scroll.
- **FR-004**: The form MUST preserve all entered data when the user interacts with the map (pans, zooms, or repositions the pin).
- **FR-005**: The report MUST be filed at the pin location active at the time of submission, reflecting any map repositioning done while the form was open.
- **FR-006**: The form MUST include a clearly visible, explicit dismiss/cancel control so that map taps do not unintentionally close it.
- **FR-007**: The form MUST adapt its layout for both portrait and landscape orientations without data loss.
- **FR-008**: The form MUST close and return to the full map view immediately upon successful submission or explicit cancellation.

### Assumptions

- The form currently requires: condition type selection and an optional free-text note. This redesign does not add or remove fields — only the presentation changes.
- "Minimal" means no decorative chrome, no large headers, no multi-step wizard — a single compact panel with just the essential controls.
- The pin placement mechanism (GPS auto-placement + manual map drag) is not changing in this feature — only the form's visual footprint is being reduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a report submission (from form open to successful submit) in under 30 seconds on a standard mobile device.
- **SC-002**: At least 50% of the map viewport remains visible and interactive while the report form is open, across all supported screen sizes.
- **SC-003**: Zero form data is lost when a user pans or zooms the map while the form is open.
- **SC-004**: 100% of required form fields are visible without scrolling when the form is in its default open state.
- **SC-005**: The form-open state causes no full-page layout shift — the map background remains stable and visible throughout the entire report flow.
