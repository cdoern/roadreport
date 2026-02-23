# Feature Specification: Fix Heatmap Location Accuracy

**Feature Branch**: `003-fix-heatmap-accuracy`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "heatmap functionaliy is not displaying proper location for new reports, its slightly off and it also moves around as you zoom in. enhance heatmap accuracy especially with individual reports."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Individual Report Appears at Correct Location (Priority: P1)

A user submits a road condition report at a specific pin location — for example, a pothole at a particular intersection. After submission, they zoom fully into that area and expect to see the heat marker appear precisely where they placed their pin. Currently the marker appears offset by a noticeable distance (sometimes a full block or more), making it impossible to trust the map for precise hazard identification.

**Why this priority**: Positional accuracy for individual reports is the primary trust signal. If a user's own freshly submitted report appears in the wrong place, they lose confidence in the entire system. This is the minimal viable improvement.

**Independent Test**: Submit a single report at a known landmark pin location. Zoom to maximum zoom level. Verify the heat marker appears at the actual submitted coordinates, not offset by a city block.

**Acceptance Scenarios**:

1. **Given** a user places a pin and submits a report, **When** the heatmap refreshes and the user zooms to maximum zoom, **Then** the heat marker appears within a visually precise distance of the pin (not offset by more than a few meters).
2. **Given** a single isolated report exists with no other reports nearby, **When** the map displays that area at high zoom, **Then** the heat marker is at the actual submitted coordinates — not at a mathematically shifted grid position.

---

### User Story 2 - Heat Markers Remain Stable When Zooming (Priority: P2)

A user spots a heat cluster indicating poor conditions on their route and zooms in to identify the exact street or intersection affected. Currently the heat marker drifts or jumps to a different location as they cross zoom level thresholds, making it impossible to determine the precise location of the hazard.

**Why this priority**: Positional drift on zoom breaks the core use case of identifying the exact location of a hazard. Without zoom stability, users cannot determine which side of a street or which block a condition is on.

**Independent Test**: Observe a heat marker at zoom level 10. Zoom progressively to level 15. Verify the marker remains anchored to the same geographic position (does not shift more than one tile width at any zoom step).

**Acceptance Scenarios**:

1. **Given** a heat cluster is visible at a lower zoom level, **When** the user zooms in through multiple zoom levels, **Then** the heat markers remain anchored to the same geographic coordinates and do not jump or drift.
2. **Given** a user has zoomed in and observed a heat marker's location, **When** they zoom back out to the original level, **Then** the marker reappears at the same geographic position as before.
3. **Given** a report is submitted during an active session, **When** the heatmap refreshes at the current zoom level, **Then** the new report's marker appears at the submitted location without drift.

---

### User Story 3 - Clustered Reports Display at Geographic Center (Priority: P3)

In a dense area with multiple nearby reports — for example, a badly potholed block — the heat marker representing that cluster appears at the visual center of the actual reports, giving an accurate representation of where the problem zone is.

**Why this priority**: Centroid accuracy improves usefulness in urban areas where many reports cluster within a small area. Less critical than per-report precision but important for route planning at neighborhood scale.

**Independent Test**: Submit 3 reports at slightly different positions within a 50-meter area. Verify the displayed heat marker appears visually centered among those positions, not offset to a corner.

**Acceptance Scenarios**:

1. **Given** multiple reports exist within the same aggregation area, **When** the heatmap renders them as a single cluster, **Then** the heat marker appears near the geographic center of those reports, not at an arbitrary grid-aligned corner.
2. **Given** one report is added to an existing cluster, **When** the heatmap refreshes, **Then** the cluster marker shifts slightly toward the new report's location (reflecting the updated centroid).

---

### Edge Cases

- What happens when a report is submitted exactly at the boundary between two aggregation zones?
- How does the system handle a single report in an otherwise empty area at low zoom?
- What if a user submits a report and immediately zooms in before the heatmap refreshes — does the prior position (if any) mislead them?
- How does the fix behave near extreme coordinates (high-latitude cities, international date line proximity)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The displayed position of a single isolated report MUST match its submitted coordinates to within the visual precision of the current zoom level (no block-level offset at any zoom).
- **FR-002**: When zooming between any two consecutive zoom levels, heat markers for the same underlying reports MUST NOT shift their displayed position by more than one aggregation cell width at the finer zoom level.
- **FR-003**: When multiple reports fall within the same aggregation cell, the heat marker's displayed coordinates MUST reflect the geographic centroid (average position) of those reports, not a grid-corner coordinate.
- **FR-004**: Accuracy improvements MUST apply consistently at all supported zoom levels.
- **FR-005**: Panning the map without changing zoom level MUST NOT cause heat markers to change their geographic position.
- **FR-006**: The fix MUST NOT increase the number of database queries or degrade heatmap refresh performance relative to the current baseline.

### Key Entities *(include if feature involves data)*

- **Heatmap Cell**: A geographic grouping of one or more condition reports displayed as a single heat intensity point; its display coordinates reflect the geographic centroid of its member reports (not a grid corner).
- **Aggregation Zone**: The spatial bucket used to group nearby reports at a given zoom level; its boundaries are used for grouping only, not for determining the displayed position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At maximum zoom, a single submitted report's heat marker is displayed within the same city block as the submitted pin (no more than ~50 meters offset from submitted coordinates).
- **SC-002**: When zooming from minimum to maximum zoom, a heat marker for a stable set of reports does not shift by more than one cell width at the finer zoom level at any zoom step.
- **SC-003**: For any cell containing multiple reports, the displayed heat marker falls within the convex hull of those reports' actual coordinates (never outside the bounding box of the real data).
- **SC-004**: Heatmap data refresh time after a zoom or pan event does not increase relative to the pre-fix baseline.

## Assumptions

- The heatmap uses spatial grid aggregation (snapping reports to fixed-size grid cells based on zoom level) as its primary grouping mechanism; this behavior is preserved — only the displayed coordinates per cell change.
- Zoom level thresholds for aggregation cell sizes remain unchanged; this spec addresses displayed position accuracy only, not the aggregation logic itself.
- No new user-facing UI elements are required; the fix is purely in the data layer and rendering pipeline.
- Performance constraints (500-row cap, 90s client cache TTL) remain in effect.
