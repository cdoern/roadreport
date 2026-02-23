# Tasks: Improve Search Bar Results

**Input**: Design documents from `/specs/004-improve-search/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: Three user stories served by three focused file changes.
US1 (geographic bias) requires the `getBoundsString()` method added in the
Foundational phase. US2 (concise labels) and US3 (boundary filtering) share the
same Nominatim layer changes in the Foundational phase but are independently
verifiable in their own phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm baseline passes before any edits.

- [x] T001 Run `npm run lint && npm run build` in repo root and confirm zero errors before writing any new files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared changes that all three user stories depend on. US1 needs
`getBoundsString()`; US2 and US3 need the updated `NominatimResult` interface
and `formatDisplayName`. These must be complete before any story verification.

**⚠️ CRITICAL**: No user story verification can begin until this phase is complete.

- [x] T002 [P] Add `class: string` field to the `NominatimResult` interface in `src/lib/nominatim.ts` (Nominatim already returns this field; the interface just needs to declare it)

- [x] T003 [P] Add `getBoundsString(): string | null` to the `MapViewHandle` interface in `src/components/map/MapView.tsx`, and implement it in `useImperativeHandle` as: read `mapRef.current?.getBounds()`, return `null` if undefined, otherwise return `"${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}"`

- [x] T004 Add `formatDisplayName(raw: string): string` pure function to `src/lib/nominatim.ts` (after T002): split `raw` on `', '`; filter out parts that match `/^\d{4,}$/` (postcodes); return the first 3 remaining parts joined with `', '`; if fewer than 1 part remains, return `raw` unchanged

- [x] T005 Update `parseNominatimResult` in `src/lib/nominatim.ts` to use `formatDisplayName(result.display_name)` instead of `result.display_name` for the `displayName` field (depends on T004)

**Checkpoint**: Foundation complete — all story verifications can now proceed in parallel.

---

## Phase 3: User Story 1 — Results Biased Toward Current Map View (Priority: P1) 🎯 MVP

**Goal**: Searching "Main St" while the map is centered on Boston returns Boston-area streets at the top, not streets from other cities or countries.

**Independent Test**: Center map on Boston (default). Search "Main St". Confirm top results are in the Boston area. Pan to New York, search again, confirm results shift to New York.

- [x] T006 [US1] In `fetchResults` in `src/components/search/SearchBar.tsx`: after building the URL, call `mapRef.current?.getBoundsString()` and if non-null set `url.searchParams.set('viewbox', viewbox)` and `url.searchParams.set('bounded', '0')` (depends on T003)

- [ ] T007 [US1] Verify geographic bias in the browser per quickstart.md US1 steps: center map on Boston, search "Main St", confirm top results are local; pan to another city, search again, confirm results update

**Checkpoint**: US1 complete — geographic bias is live and verified.

---

## Phase 4: User Story 2 — Readable, Concise Result Labels (Priority: P2)

**Goal**: Each search result fits on one line in the dropdown without truncation, showing e.g. "Main Street, Back Bay, Boston" instead of the full 60-character geocoder string.

**Independent Test**: Search any street name. Inspect each dropdown item — no text should overflow or be cut off with "…". Labels should have the form "Name, Locality, Region".

- [ ] T008 [US2] Verify concise labels in the browser per quickstart.md US2 steps: search a street name, confirm each result fits on one line with a short readable label like "Street, City, State" (depends on T004 + T005 already applied)

**Checkpoint**: US2 complete — labels are readable at standard widths.

---

## Phase 5: User Story 3 — Results Filtered to Navigable Place Types (Priority: P3)

**Goal**: Country, state, and county-level administrative regions are removed from the result list, so only streets, cities, neighbourhoods, and local places appear.

**Independent Test**: Search "Springfield". Confirm no result is labelled "United States", "Illinois", "Massachusetts", or any state/country entry. All results should be city or street level.

- [x] T009 [US3] In `fetchResults` in `src/components/search/SearchBar.tsx`: after parsing the raw JSON response and before `setResults`, filter out results where `r.class === 'boundary'` — apply on the raw `NominatimResult[]` before mapping: `const filtered = (data as NominatimResult[]).filter(r => r.class !== 'boundary').map(parseNominatimResult)` then `setResults(filtered)` (depends on T002)

- [ ] T010 [US3] Verify boundary filtering in the browser per quickstart.md US3 steps: search "Springfield", confirm no country/state/county entries appear in top 5 results

**Checkpoint**: US3 complete — all three quality improvements are live.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Lint, build, and documentation confirmation.

- [x] T011 [P] Add an inline comment above `formatDisplayName` in `src/lib/nominatim.ts` explaining the algorithm: "Split on ', ', remove pure-numeric postcode parts, return first 3 meaningful parts"
- [x] T012 [P] Add an inline comment on the `getBoundsString` method in `src/components/map/MapView.tsx` noting the format: `"west,south,east,north"` for Nominatim viewbox
- [x] T013 Run `npm run lint && npm run build` to confirm zero errors and zero warnings after all changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; T002 and T003 can run in parallel; T004 depends on T002; T005 depends on T004
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion; US2/US3 verifications can start as soon as T004+T005 complete; US1 implementation depends on T003
- **Polish (Phase 6)**: Depends on all story verifications passing; T011 and T012 can run in parallel

### User Story Dependencies

- **US1 (P1)**: Depends on T003 (`getBoundsString`) — no dependency on US2 or US3
- **US2 (P2)**: Depends on T004 + T005 (`formatDisplayName`) — no dependency on US1 or US3; verification (T008) can run as soon as foundational phase completes
- **US3 (P3)**: Depends on T002 (`class` field) — implementation (T009) is independent; verification (T010) follows T009

### Parallel Opportunities

- T002 and T003 (Foundational) can run in parallel — different files
- T008 (US2 verify) can run in parallel with T006+T007 (US1 implement+verify) once Foundational is done
- T011 and T012 (Polish) can run in parallel

---

## Parallel Example: After Foundational Phase

```bash
# Once T005 is done, these can all start simultaneously:
Task: "T006 [US1] Add viewbox param to fetchResults in SearchBar.tsx"
Task: "T008 [US2] Verify concise labels in browser"
Task: "T009 [US3] Add boundary filter to fetchResults in SearchBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001: Baseline confirmed
2. T002–T005: Foundational changes (nominatim.ts + MapView.tsx)
3. T006: Add viewbox param to SearchBar.tsx
4. T007: Verify geographic bias in browser
5. **STOP and VALIDATE** — already a meaningful improvement for end users

### Incremental Delivery

1. T001 → baseline
2. T002–T005 → shared foundation (both label + bias infrastructure ready)
3. T006–T007 → US1 live (geographic bias)
4. T008 → US2 verified (labels already improved by foundation)
5. T009–T010 → US3 live (boundary filtering)
6. T011–T013 → polish complete → ready to merge

---

## Notes

- T002 and T003 affect different files and have no inter-dependency — run in parallel
- T009 (boundary filter) edits the same `fetchResults` function as T006 (viewbox) — run sequentially (T006 first, then T009, or combine edits in one pass)
- Verification tasks (T007, T008, T010) are manual browser checks per quickstart.md
- No automated tests added — none requested in spec
- Commit after T005 (foundation), after T007 (US1 verified), and after T013 (polish done)
