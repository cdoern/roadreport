# Feature Specification: Fix Report Pin Placement & Submit Button Visibility

**Feature Branch**: `005-fix-report-placement`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "the reporting mechanism should only default to the current location IF the map is not scrolled elsewhere. IF the user is looking at another part of the map, the initial pin for making a report should be where the map is focused on. Additionally when adding a note to a report, the submit button should not go away, makes for bad UX."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Context-Aware Report Pin Placement (Priority: P1)

A user is browsing the map and has scrolled to a neighborhood they don't live in — perhaps to check road conditions before a trip. When they tap the "Report" button, the initial pin for the report should appear at the center of the map where they are currently looking, not jump back to their GPS location. This allows them to report issues in the area they are viewing without needing to manually reposition the pin.

**Why this priority**: The core purpose of the feature is to make reporting contextually relevant. Snapping the pin back to the user's GPS location when they are clearly viewing a different area is confusing and leads to mis-placed reports. This is the primary UX correction.

**Independent Test**: Can be fully tested by scrolling the map away from the user's location, tapping the Report button, and verifying that the initial pin appears at the map's visible center — delivering accurate report placement without manual pin adjustment.

**Acceptance Scenarios**:

1. **Given** the user has panned the map so it is centered on a location different from their current GPS position, **When** they open the report form, **Then** the initial pin is placed at the map's current center, not at the user's GPS location.
2. **Given** the map is centered on the user's current GPS location (no panning has occurred), **When** they open the report form, **Then** the initial pin is placed at the user's current location.
3. **Given** the user has not granted location permission, **When** they open the report form, **Then** the initial pin is placed at the map's current center.
4. **Given** the user opens the report form while the map is centered on their location, **When** they pan the map before submitting, **Then** the pin remains at the location it was placed when the form opened (pin does not follow subsequent map movement).

---

### User Story 2 - Submit Button Always Visible During Note Entry (Priority: P2)

A user is filling out a report and taps the optional "Add a note" field to provide additional detail. On mobile devices, the on-screen keyboard may push content up, or the note field may expand, causing the Submit button to scroll off screen. This forces the user to dismiss the keyboard or scroll to find the Submit button before they can complete the report. The Submit button must remain accessible at all times while the report form is open.

**Why this priority**: A hidden Submit button means users cannot complete their report without an unintuitive workaround. While the pin placement fix affects accuracy, this issue directly blocks form completion.

**Independent Test**: Can be fully tested by opening the report form, tapping the note field, typing a long note, and verifying the Submit button remains visible and tappable without dismissing the keyboard or scrolling.

**Acceptance Scenarios**:

1. **Given** the report form is open and the user taps the note input field, **When** the on-screen keyboard appears, **Then** the Submit button remains visible on screen without requiring the user to scroll or dismiss the keyboard.
2. **Given** the user is typing a multi-line note in the report form, **When** the note text expands the input area, **Then** the Submit button does not move off screen and remains tappable.
3. **Given** the report form is open, **When** the user scrolls within the form, **Then** the Submit button is reachable without closing or reloading the form.

---

### Edge Cases

- What happens when the user's GPS location is unavailable (permission denied or signal lost)? → The pin defaults to the map's current center.
- What if the map has never been panned and the user's location is unknown? → The pin is placed at whatever the map's default center is.
- What if the user pans the map after the report form is already open? → The pin stays at the position it was set when the form opened; it does not follow the new map position.
- What if the note field is intentionally left blank? → The Submit button remains visible regardless of whether a note is entered.
- What if the device does not have a keyboard (desktop/hardware keyboard)? → The Submit button must still be visible without any scrolling required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST determine the initial report pin location based on whether the map's current center matches the user's GPS location.
- **FR-002**: When the map has been panned away from the user's GPS location, the system MUST place the initial report pin at the map's current visible center.
- **FR-003**: When the map is centered on the user's GPS location, the system MUST place the initial report pin at the user's GPS location.
- **FR-004**: When GPS location is unavailable, the system MUST place the initial report pin at the map's current visible center.
- **FR-005**: The report form MUST keep the Submit button visible and interactive at all times while the form is open, regardless of keyboard state, note field size, or scroll position.
- **FR-006**: The Submit button MUST NOT be obscured or pushed off-screen when the on-screen keyboard is displayed on mobile devices.
- **FR-007**: The report pin location set when the form is opened MUST remain fixed if the user subsequently pans the map while the form is still open.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of report forms opened while the map is focused on a non-user location place the initial pin at the map's center, not the user's GPS coordinates.
- **SC-002**: Users can complete a report with a note — from opening the form to tapping Submit — without dismissing the keyboard or performing extra scrolling steps.
- **SC-003**: The Submit button is visible and tappable on all supported screen sizes immediately upon the on-screen keyboard appearing, with no additional user action required.
- **SC-004**: Zero reports are incorrectly geo-located to the user's GPS position when the user was viewing a different map area at the time of submission.

## Assumptions

- "Map has been scrolled elsewhere" is defined as the map's visible center being at a location other than the user's current GPS coordinates at the moment the report form is opened. The exact distance threshold for "different" is an implementation detail.
- The Submit button fix applies to the existing report form UI; no new form layout or submission flow is being introduced.
- This feature does not change any data model or submission logic — only the initial pin placement behavior and the form's layout/scroll behavior.
- The report pin can still be manually dragged/repositioned by the user after the form opens; this feature only affects the *initial* pin placement.
- Mobile (touch screen with virtual keyboard) is the primary target for the Submit button fix, but the fix must not degrade the desktop experience.
