# Feature Specification: Crowdsourced Road & Sidewalk Condition Map

**Feature Branch**: `001-road-report-heatmap`
**Created**: 2026-02-19
**Status**: Draft
**Input**: User description: "Build an application that crowdsources user reports of sidewalks/roads and displays a heatmap with information on where the best and worst conditions are in an area for running, walking, biking, commuting, etc. This app is intended to be web based, and its main view meant to be a map. The default usage is for route planning for runs. There should also be a seamless way to file a report, search for areas, etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Condition Heatmap (Priority: P1)

A runner opens the app and immediately sees an interactive map overlaid with a heatmap that
shows the best and worst sidewalk and road conditions in their area. Green areas indicate good
conditions; red areas indicate hazards or poor surfaces. The runner can pan and zoom freely
and click any highlighted area to read brief condition summaries left by other users.

**Why this priority**: This is the core value of the application. Without the heatmap view,
no other feature delivers meaningful value. It is the foundation every other user story
builds on.

**Independent Test**: Open the app in a browser, allow location access. Verify that the map
loads, the heatmap overlay is visible, and clicking a colored area shows a condition summary.
Delivers value immediately for any runner wanting to understand their local area.

**Acceptance Scenarios**:

1. **Given** a user opens the app for the first time, **When** the map finishes loading,
   **Then** the heatmap overlay is visible on the map centered on the user's current location
   (or a default city if location is denied), with a visible legend explaining the color scale.
2. **Given** the heatmap is visible, **When** the user clicks or taps a colored map area,
   **Then** a popup or panel appears showing the condition category, an aggregated quality
   rating, and the number of reports contributing to that area's rating.
3. **Given** the user is viewing the heatmap, **When** the user pans or zooms the map,
   **Then** the heatmap overlay updates to reflect the new visible area without a full page
   reload.
4. **Given** an area on the map has no submitted reports, **When** the user views or clicks
   it, **Then** the area shows no heatmap color and a message indicates "No reports yet for
   this area."

---

### User Story 2 - Submit a Condition Report (Priority: P2)

A walker notices an icy, uneven sidewalk segment on their usual winter route. They open the
app, tap "Report" from the map view, confirm the location (using their current GPS position
or by dropping a pin on the map), choose the condition category (e.g., weather/environmental
— ice), rate the severity, and optionally add a short note. The report is submitted and they
immediately see their report reflected in the heatmap.

**Why this priority**: Reporting is the supply side of the crowdsourcing loop. Without easy
reporting, the heatmap data becomes stale and unreliable. This story closes the feedback
cycle and grows the data that makes Story 1 valuable.

**Independent Test**: Without any account, tap "Report," confirm a location, select a
condition type and severity, and submit. Verify the report appears in the heatmap within
5 minutes and that the area's rating updates to reflect the new data.

**Acceptance Scenarios**:

1. **Given** the user is on the map view, **When** they tap the "Report" button,
   **Then** a report form appears pre-filled with their current GPS location (or the map
   center if GPS is unavailable) and ready to accept input.
2. **Given** the report form is open, **When** the user confirms the location pin, selects a
   condition category (surface quality, safety hazard, congestion, or weather/environmental),
   and chooses a severity (poor / fair / good), **Then** a "Submit" button becomes enabled.
3. **Given** a completed report form, **When** the user submits it without being logged in,
   **Then** the report is accepted as an anonymous contribution with no account required.
4. **Given** a submitted report, **When** up to 5 minutes have passed, **Then** the reported
   area's heatmap color updates to reflect the new contribution.
5. **Given** the user submits a report, **When** the submission succeeds, **Then** a
   confirmation message is displayed and the map returns to the heatmap view, now centered
   on the reported location.

---

### User Story 3 - Search and Navigate to an Area (Priority: P3)

A cyclist planning a weekend route in an unfamiliar part of the city types a neighborhood
name or address into the search bar. The map navigates to that area and the heatmap renders
the conditions there, helping the cyclist identify good and bad segments before they ride.

**Why this priority**: Users often want to explore or plan for areas other than their current
location. Search unlocks the planning use case and extends the app's value beyond real-time
local awareness.

**Independent Test**: Enter a neighborhood or address in the search bar. Verify the map
animates to that location and the heatmap renders condition data for the new area.

**Acceptance Scenarios**:

1. **Given** the user types a location name or address into the search bar, **When** they
   select a suggestion or press enter, **Then** the map smoothly navigates to that area and
   the heatmap updates to show local conditions.
2. **Given** the user has navigated to a searched area, **When** they clear the search bar
   or tap elsewhere, **Then** the map stays on the navigated area and the heatmap remains
   visible.
3. **Given** a search query that yields no results, **When** the user submits it,
   **Then** a clear "No results found" message appears and the map does not move.

---

### User Story 4 - Filter by Activity Type (Priority: P4)

A commuter using the app after a runner switches the activity filter from "Running" to
"Commuting." The heatmap adjusts its weighting and displayed condition categories to
prioritize factors relevant to commuting (e.g., traffic congestion, road quality for
cyclists/pedestrians) rather than surface texture and footing relevant to runners.

**Why this priority**: Different activities have different priorities for what "good
conditions" means. Filtering makes the heatmap meaningfully accurate per use case. Lower
priority than core viewing and reporting but important for the multi-activity value proposition.

**Independent Test**: Switch the activity filter from "Running" to "Walking" and then to
"Biking." Verify the heatmap legend updates, color distribution changes, and displayed
condition categories reflect the selected activity's priorities.

**Acceptance Scenarios**:

1. **Given** the user is viewing the heatmap with the default "Running" filter, **When**
   they switch to "Walking," "Biking," or "Commuting" using the activity selector,
   **Then** the heatmap re-renders to weight and display conditions relevant to the chosen
   activity.
2. **Given** any activity filter is active, **When** the user taps a heatmap area,
   **Then** the popup highlights the condition categories most relevant to the active
   activity filter at the top.
3. **Given** a filter is applied, **When** the user files a new report, **Then** the report
   form pre-selects condition categories most relevant to the active filter as defaults.

---

### Edge Cases

- **Sparse data areas**: When an area has fewer than 3 reports, the heatmap renders it at
  reduced opacity with a visual indicator ("low data") to communicate low confidence.
- **Low GPS accuracy**: When GPS accuracy is worse than 50 meters at report time, the user
  is warned and prompted to manually adjust the pin before submitting.
- **Rapid conflicting reports**: When multiple reports in the same small area conflict
  sharply (e.g., 5 "good" and 5 "poor" in 24 hours), the heatmap shows a "mixed" state
  and the detail popup surfaces both perspectives.
- **Offline or failed submission**: When a report submission fails due to connectivity,
  the form data is preserved and the user is prompted to retry without re-entering information.
- **No location permission**: When the user denies location access, the map defaults to a
  configurable city center and all report-location functionality degrades gracefully to
  manual pin placement only.
- **Excessive zoom out**: When the user zooms out beyond city scale, the heatmap aggregates
  to regional-level summaries rather than rendering individual report points.
- **Stale weather conditions**: When a weather-environmental report (e.g., ice, snow) is
  recent but the area has since received conflicting "good" reports, the heatmap MUST
  reflect the updated aggregate rather than preserving the hazard reading. The detail popup
  MUST show the timestamp of the most recent report so users can judge data freshness.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display an interactive, pannable, zoomable map as the primary
  and default view when the application loads.
- **FR-002**: The system MUST render a heatmap overlay on the map that visualizes
  crowdsourced condition data using a color scale from poor (red) to good (green).
- **FR-003**: The system MUST display a legend explaining the heatmap color scale and the
  currently active activity filter at all times while the heatmap is visible.
- **FR-004**: Users MUST be able to tap or click any heatmap area to view a summary of
  reported conditions for that location, including condition category, aggregated rating,
  report count, and the timestamp of the most recent report (to help users judge freshness
  of weather-environmental conditions).
- **FR-005**: Users MUST be able to submit a condition report from the map view without
  leaving the page or creating an account.
- **FR-006**: Condition reports MUST capture: geographic location (coordinates), condition
  category (surface quality / safety hazard / congestion / weather-environmental), severity
  (poor / fair / good), and an optional free-text note of up to 280 characters. The
  weather-environmental category encompasses temporary conditions including but not limited
  to: snow accumulation, ice, mud, flooding, and standing water.
- **FR-007**: The system MUST accept anonymous condition reports; account creation MUST NOT
  be required for any core action. Each report MUST be tagged with a browser-generated
  session token (short-lived, containing no personally identifiable information) to enable
  rate limiting; no IP address or device fingerprint MUST be stored.
- **FR-015**: The system MUST enforce a rate limit of 30 condition report submissions per
  session token per hour. When the limit is reached, the user MUST be shown a clear message
  explaining they have reached the submission limit and may try again later.
- **FR-008**: The system MUST accept a text search query and navigate the map to the matched
  location.
- **FR-009**: Users MUST be able to select an activity filter (Running, Walking, Biking,
  Commuting) that adjusts heatmap weighting and displayed condition priorities.
- **FR-010**: The heatmap MUST weight more recent reports more heavily than older ones using
  continuous recency decay. Reports are never deleted; instead, their contribution to the
  aggregate score approaches zero over time. No hard expiry date is applied. Weather-
  environmental reports (snow, ice, mud, flooding) MUST decay significantly faster than
  structural reports (surface quality, safety hazard, congestion) to reflect that temporary
  conditions clear within hours or days rather than months.
- **FR-011**: The system MUST update the heatmap for a reported location within 5 minutes
  of a successful report submission.
- **FR-012**: The system MUST preserve an in-progress report form's data if a submission
  fails, allowing the user to retry without re-entering information.
- **FR-013**: The system MUST display a visual indicator on heatmap areas where the report
  count is below a defined confidence threshold, communicating low data reliability.
- **FR-014**: The system MUST function correctly on any modern desktop and mobile web browser
  without requiring installation of a native app.
- **FR-016**: All interactive elements (search bar, report form, activity filter, map
  controls, and popups) MUST conform to WCAG 2.1 Level AA, including keyboard navigability,
  sufficient color contrast, and screen reader compatibility for non-map UI components.

### Key Entities

- **ConditionReport**: A single user-submitted report anchored to a geographic coordinate.
  Captures condition category (surface quality / safety hazard / congestion /
  weather-environmental), severity rating, optional note, submission timestamp, activity
  context at time of submission, and a browser-generated session token (no PII stored).
  Reports are classified as either structural (slow decay) or weather-environmental (fast
  decay) based on their condition category.
- **Location**: A geographic point (latitude/longitude) at which a report is anchored.
  Reports are clustered into zoom-adaptive HeatmapCells for display purposes.
- **HeatmapCell**: An aggregated view of all ConditionReports within a zoom-adaptive
  geographic cell. Cell size shrinks as the user zooms in (approximately 500m at city
  scale down to approximately 25m at street scale), storing a weighted aggregate score
  per activity type and a report count.
- **ActivityFilter**: One of four activity types (Running, Walking, Biking, Commuting) that
  determines how HeatmapCell scores are weighted and which condition categories are surfaced
  prominently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can open the app and view the heatmap for their current location
  within 3 seconds on a standard mobile connection.
- **SC-002**: A user can complete and submit a condition report in under 60 seconds from
  tapping "Report" to seeing the confirmation message.
- **SC-003**: A submitted report is reflected in the heatmap for the reported location
  within 5 minutes of successful submission.
- **SC-004**: 90% of first-time users can successfully locate condition data and submit a
  report during their first session without any instructional guidance.
- **SC-005**: The search feature returns a relevant map result for at least 95% of valid
  neighborhood, street, or address queries.
- **SC-006**: The application is fully usable on the current stable versions of Chrome,
  Firefox, Safari, and Edge on both desktop and mobile screen sizes.
- **SC-007**: Switching the activity filter updates the heatmap display in under 1 second
  with no additional network requests required.

## Assumptions

- Anonymous reporting is the default and primary path; optional account creation (for
  features like editing or deleting one's own reports) is out of scope for this specification.
- Four condition categories cover the primary concerns for all four activity types in v1:
  surface quality (structural), safety hazard (structural), congestion, and
  weather-environmental (temporary: snow, ice, mud, flooding, standing water). No further
  sub-categorization is required within each category for this version.
- Report freshness weighting (FR-010) uses continuous recency decay with no hard expiry.
- The default map center when location is denied is configurable at deployment time; this
  specification does not prescribe a specific city.
- Route planning (drawing and evaluating a multi-point route against heatmap data) is a
  future enhancement; this specification covers condition awareness and area exploration,
  not turn-by-turn route scoring.
- Moderating or removing abusive or spam reports is out of scope for this version.
- No formal uptime or availability SLA is defined for v1.

## Clarifications

### Session 2026-02-19

- Q: What identifier, if any, is stored with each anonymous condition report? → A: Browser-generated session token (short-lived, no PII); no IP address or device fingerprint stored.
- Q: Should anonymous report submissions be rate-limited, and if so, at what threshold? → A: 30 reports per session token per hour; user shown a clear message when limit is reached.
- Q: What geographic granularity should HeatmapCells use? → A: Zoom-adaptive (~500m at city scale, ~25m at street scale); cell size shrinks as user zooms in.
- Q: What accessibility conformance level is required? → A: WCAG 2.1 Level AA for all non-map interactive UI elements.
- Q: Is there a formal uptime or availability target? → A: No formal target for v1.
- Q: Should weather-caused conditions (snow, ice, mud, flooding) be reportable condition types alongside structural ones? → A: Yes; added as a fourth category "weather-environmental" with an accelerated decay rate relative to structural categories.
