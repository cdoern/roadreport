# Feature Specification: Improve Search Bar Results

**Feature Branch**: `004-improve-search`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "search bar does not have great results when looking up addresses, please ensure the search functionality is adequate and performs for users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Results Biased Toward Current Map View (Priority: P1)

A user is looking at Boston on the map and types "Main St" into the search bar. Currently they get a list of Main Streets from across the country and world, none of which are near Boston. The search should prioritise results close to wherever the map is currently centered, so the most relevant suggestions appear at the top without the user needing to add a city name to every query.

**Why this priority**: This is the root cause of poor search quality. A user already navigating a specific area expects search to understand their context. Without geographic bias, every query requires extra specificity (e.g., "Main St Boston MA") to be useful, which defeats the purpose of a quick search bar.

**Independent Test**: Center the map on Boston. Search for "Main St". Verify the top results are streets in or near Boston, not Main Streets from other cities or countries.

**Acceptance Scenarios**:

1. **Given** the map is centered on a city, **When** a user searches for a partial address like "Main St", **Then** the top suggestions are streets within or near the visible map area, not results from unrelated cities or countries.
2. **Given** the map is zoomed in to a neighbourhood, **When** a user searches for a street name, **Then** results within the current viewport appear before results from outside it.
3. **Given** the user pans to a different city and searches again with the same query, **Then** results reflect the new location, not the previous one.

---

### User Story 2 - Readable, Concise Result Labels (Priority: P2)

A user types an address and sees a dropdown of suggestions. Currently each result shows the full geocoder address string — e.g. "123 Main Street, Downtown, Boston, Suffolk County, Massachusetts, 02101, United States" — which is cut off mid-word in the narrow dropdown. Users cannot tell results apart when the labels all start the same and are truncated before any distinguishing information.

The search suggestions should show a short, human-readable label that fits on one line and clearly identifies the place.

**Why this priority**: Even with the right results in the list, users cannot act on them if they cannot read them. Readable labels directly improve task completion rate.

**Independent Test**: Search for a common street name. Verify each suggestion fits on one line and clearly identifies the result with enough context (street + city or neighbourhood + state/country abbreviation) to distinguish it from other suggestions.

**Acceptance Scenarios**:

1. **Given** search results are displayed, **When** a user views the dropdown, **Then** each result label fits on a single line without truncation at the default search bar width.
2. **Given** multiple results for the same street name in different cities, **When** displayed in the dropdown, **Then** labels are distinct enough to differentiate the options without requiring the full geocoder string.
3. **Given** a result for a full street address, **When** shown in the dropdown, **Then** the label includes the street name and enough locality context (neighbourhood, city, or state abbreviation) to be unambiguous.

---

### User Story 3 - Results Filtered to Navigable Place Types (Priority: P3)

A user searching for a place to navigate to on the road-conditions map wants addresses, streets, intersections, neighbourhoods, and cities — not entire countries, administrative counties, or obscure metadata entries. Currently those irrelevant types can appear mixed into the result list, pushing useful results off the screen.

**Why this priority**: Filtering irrelevant types reduces noise and improves signal-to-noise ratio, especially once geographic bias (P1) and readable labels (P2) are in place. This makes the feature feel polished and professional.

**Independent Test**: Search for a vague term like "Park". Verify that returned results are navigable places (parks, streets, addresses, neighbourhoods) rather than administrative entities like entire counties, provinces, or countries.

**Acceptance Scenarios**:

1. **Given** a query that could match both navigable places and large administrative regions, **When** results are displayed, **Then** large administrative boundaries (countries, states, counties) are excluded or ranked last.
2. **Given** a search for a neighbourhood or local area name, **When** results are returned, **Then** the list contains streets, addresses, neighbourhoods, and city-level places relevant to road condition navigation.

---

### Edge Cases

- What happens when the map is at very low zoom (entire continent visible) and a user searches — should geographic bias still apply?
- What if the geocoding service returns no results for the biased viewport but has results globally?
- How does the system handle a 1–2 character query that could match thousands of places?
- What happens when the geocoding service is slow or temporarily unavailable — is the search field usable?
- What if two results produce identical concise labels (same street name and city)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Search results MUST be geographically biased toward the current map viewport — results within or near the visible area MUST rank above results from other regions for the same query.
- **FR-002**: Geographic bias MUST update dynamically as the user pans or zooms — a subsequent search after moving the map MUST reflect the new viewport, not the old one.
- **FR-003**: Each search result label MUST be concise enough to display fully on one line at the search bar's standard width on screens 320px and wider, without truncation.
- **FR-004**: Each result label MUST include sufficient locality context (at minimum: place name + one of: neighbourhood, city, or state/country abbreviation) to distinguish it from similarly named results in other locations.
- **FR-005**: Search results MUST be limited to navigable place types: addresses, streets, intersections, neighbourhoods, cities, and local landmarks. Administrative-only regions (countries, states/provinces, counties) MUST NOT appear as primary results.
- **FR-006**: If the geocoding service is unavailable or slow, the search input MUST remain operable — a visible loading or empty state MUST be shown rather than a frozen or broken UI.

### Key Entities

- **Search Query**: Free-text location input from the user; implicitly scoped to the current map viewport for result ranking purposes.
- **Search Result**: A suggested navigable place with a concise display label and geographic bounds; filtered to place types useful for road-condition navigation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When the map is centered on a city and the user searches for a street name present in that city, at least one result from the visible area appears within the top 3 suggestions.
- **SC-002**: Every search result label displays in full (no truncation) at the search bar's display width on any screen 320px or wider.
- **SC-003**: Zero results of type "country", "state/province", or "county/administrative district" appear in the top 5 suggestions for a street-level or neighbourhood-level query.
- **SC-004**: After panning the map to a new city and repeating the same query, the top results reflect the new location rather than the previous one.

## Assumptions

- The geocoding service (Nominatim / OpenStreetMap) supports a geographic bias parameter (viewport bounding box) that influences result ranking — this is used to implement FR-001 and FR-002.
- Nominatim's structured address response fields (road, suburb, city, state, country) are sufficient to build a short display label that meets FR-003 and FR-004.
- No change to the geocoding provider is in scope — this feature improves how the existing provider is queried and how its results are displayed.
- The existing debounce behaviour and abort-on-new-query behaviour are preserved; this spec addresses result quality only, not request lifecycle management.
- No user-specific personalisation (search history, saved places) is in scope.
- When no nearby results exist for the biased viewport, falling back to unbiased global results is acceptable and preferred over returning zero results.
