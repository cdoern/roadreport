---
description: "Task list for Crowdsourced Road & Sidewalk Condition Map"
---

# Tasks: Crowdsourced Road & Sidewalk Condition Map

**Input**: Design documents from `/specs/001-road-report-heatmap/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: No test tasks generated — tests not requested in spec or user input.

**Organization**: Tasks grouped by user story (US1→US4) for independent implementation and delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in every task description

## Path Conventions

Single project at repository root: `src/`, `supabase/`, `public/`

---

## Phase 1: Setup

**Purpose**: Initialize the project, install dependencies, and create the scaffolding all user stories build on.

- [ ] T001 Initialize Vite + React + TypeScript project (`npm create vite@latest . -- --template react-ts`) and install all dependencies: `react-leaflet`, `leaflet`, `leaflet.heat`, `@supabase/supabase-js`, `tailwindcss`, `vite-plugin-pwa`, `focus-trap-react`, and dev dependencies `@types/leaflet`, `eslint`, `prettier`, `vitest`, `@testing-library/react`
- [ ] T002 [P] Configure Tailwind CSS: create `tailwind.config.ts` (content: `./src/**/*.{ts,tsx}`), add `postcss.config.js`, add `@tailwind base/components/utilities` to `src/index.css`
- [ ] T003 [P] Configure ESLint and Prettier: create `eslint.config.js` (React + TypeScript rules, `no-unused-vars: error`), create `.prettierrc` (singleQuote, semi, tabWidth 2), add `lint` and `format` scripts to `package.json`
- [ ] T004 [P] Create complete `src/` directory structure: `src/components/map/`, `src/components/report/`, `src/components/search/`, `src/components/filter/`, `src/components/ui/`, `src/hooks/`, `src/lib/`, `src/types/`; create `supabase/migrations/` directory
- [ ] T005 [P] Create `.env.example` at repo root documenting `VITE_SUPABASE_URL=https://<project-ref>.supabase.co` and `VITE_SUPABASE_ANON_KEY=<anon-key>`; add `.env.local` to `.gitignore`
- [ ] T006 [P] Create `vercel.json` with: SPA rewrite (`"source": "/(.*)"` → `"/index.html"`), `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` on `/sw.js`, `Cache-Control: public, max-age=31536000, immutable` on `/assets/(.*)`
- [ ] T007 [P] Add placeholder PWA icons to `public/`: `pwa-192x192.png` (192×192), `pwa-512x512.png` (512×512, maskable), `apple-touch-icon.png` (180×180, no transparency for iOS)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, infrastructure clients, and database schema that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 Create `src/types/index.ts` with all shared TypeScript types: `ActivityType` union (`'running' | 'walking' | 'biking' | 'commuting'`), `ConditionType` union (14 values: ice/snow/mud/flooding/standing_water/pothole/crack/uneven_surface/missing_section/debris/broken_glass/poor_lighting/construction/congestion), `ConditionClass` union, `CONDITION_CLASS` lookup record mapping each ConditionType to its class and half-life, `ConditionReport` interface (all DB fields), `NewConditionReport` interface (fields for insert), `HeatmapCell` interface (cell_lng, cell_lat, report_count, avg_score, top_condition), `HeatmapQuery` interface, `InsertConditionReport` interface with PostGIS WKT location string
- [X] T009 [P] Create `src/lib/constants.ts`: export `ZOOM_CELL_SIZES` record mapping zoom levels to degree values (`{ 5: 1.0, 8: 0.25, 11: 0.05, 13: 0.01, Infinity: 0.005 }`), `WEATHER_HALF_LIFE_DAYS = 1.5`, `STRUCTURAL_HALF_LIFE_DAYS = 7.0`, `POLL_INTERVAL_MS = 90_000`, `GPS_ACCURACY_THRESHOLD_METERS = 50`, `MAX_HEATMAP_ROWS = 500`, `DEFAULT_CENTER: [number, number] = [42.3601, -71.0589]` (configurable Boston default)
- [X] T010 [P] Create `src/lib/supabaseClient.ts`: import `createClient` from `@supabase/supabase-js`; read `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`; throw descriptive `Error` if either is missing; export singleton `supabase` client
- [X] T011 [P] Create `src/hooks/useSessionToken.ts`: export `useSessionToken(): string` hook that reads `sessionStorage.getItem('rr_session_token')`; if null, calls `crypto.randomUUID()`, stores it, returns it; add JSDoc with `@returns` description; memoize with `useMemo`
- [X] T012 [P] Create `src/hooks/useGeolocation.ts`: export `useGeolocation()` hook wrapping `navigator.geolocation.watchPosition`; return `{ coords: GeolocationCoordinates | null, accuracy: number | null, error: GeolocationPositionError | null, loading: boolean }`; clean up watcher on unmount; add JSDoc
- [X] T013 [P] Create `src/components/ui/Toast.tsx`: accept `message: string | null`, `type: 'success' | 'error' | 'info'`, `onDismiss: () => void` props; render a fixed-position banner with `role="status"` and `aria-live="polite"`; auto-dismiss after 4 seconds via `useEffect`; style with Tailwind (green for success, red for error, blue for info)
- [X] T014 Create `supabase/migrations/001_initial_schema.sql` with: `CREATE EXTENSION IF NOT EXISTS postgis` + `pg_cron`; `CREATE TABLE condition_reports` (id uuid PK, location geography(Point,4326) NOT NULL, condition_type TEXT NOT NULL with CHECK constraint listing all 14 valid values, severity SMALLINT CHECK 1–3, description TEXT CHECK char_length ≤ 280, session_token TEXT NOT NULL, activity_context TEXT CHECK valid ActivityType values, upvotes INTEGER DEFAULT 0, submitted_at TIMESTAMPTZ DEFAULT NOW()); three indexes (GIST on location, btree on submitted_at DESC, btree on session_token + submitted_at DESC); `enforce_rate_limit` BEFORE INSERT trigger function counting rows per session_token in past hour and raising `RATE_LIMIT_EXCEEDED` exception if ≥ 30; `get_heatmap_cells(zoom_level INT, sw_lng FLOAT, sw_lat FLOAT, ne_lng FLOAT, ne_lat FLOAT)` RPC using ST_SnapToGrid with zoom-mapped cell sizes and inline exponential decay scoring differentiated by condition_type; `increment_upvote(report_id UUID)` RPC doing atomic `UPDATE SET upvotes = upvotes + 1`; `cron.schedule('nightly-cleanup', '0 2 * * *', 'DELETE FROM condition_reports WHERE submitted_at < NOW() - INTERVAL 90 days')`; inline SQL comments on decay formula and rate limit logic
- [X] T015 [P] Configure `vite.config.ts`: add `@vitejs/plugin-react`, Tailwind via `@tailwindcss/vite`, and `VitePWA({ registerType: 'autoUpdate', includeAssets: ['favicon.ico','apple-touch-icon.png'], manifest: { name: 'RoadReport', short_name: 'RoadReport', theme_color: '#16a34a', display: 'standalone', start_url: '/?source=pwa', icons: [192, 512 pngs + maskable] } })`
- [X] T016 [P] Create `src/vite-env.d.ts`: extend `ImportMetaEnv` interface with `readonly VITE_SUPABASE_URL: string` and `readonly VITE_SUPABASE_ANON_KEY: string`; include `/// <reference types="vite/client" />`
- [X] T017 Create `src/main.tsx`: import React, ReactDOM, App, `src/index.css`; render `<React.StrictMode><App /></React.StrictMode>` into `#root`
- [X] T018 Create `App.tsx`: scaffold full-viewport root layout (`h-screen w-screen overflow-hidden relative`); declare `activityType` state (default `'running'`), `toast` state (`{ message: string; type: 'success'|'error'|'info' } | null`), `isReportOpen` state; render `<Toast>` from state; leave map and overlay slots as `{/* TODO: US1 */}` comments for now

**Checkpoint**: Foundation ready — `npm run dev` starts without errors, Supabase client initialises, migration SQL is ready to run.

---

## Phase 3: User Story 1 - View Condition Heatmap (Priority: P1) 🎯 MVP

**Goal**: Interactive map with heatmap overlay visible on load; clicking a cell shows condition summary.

**Independent Test**: Open app, grant location, verify heatmap overlay renders colored cells, click a colored area to see popup with condition type + report count + timestamp; click empty area to see "No reports yet."

- [X] T019 [P] [US1] Create `src/components/map/MapView.tsx`: render `<MapContainer center={DEFAULT_CENTER} zoom={13}>` wrapped in a `<div aria-hidden="true" role="presentation">` (hides map from screen readers); add `<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors">`; forward map instance ref via `useImperativeHandle` for SearchBar navigation; emit `onTileError` callback when `map.on('tileerror')` fires
- [X] T020 [P] [US1] Create `src/hooks/useHeatmapData.ts`: accept `{ activityType: ActivityType }` param; use `useMap()` inside a child component to track viewport bounds and zoom on `moveend`/`zoomend`; call `supabase.rpc('get_heatmap_cells', { zoom_level, sw_lng, sw_lat, ne_lng, ne_lat })` immediately on mount and every `POLL_INTERVAL_MS` (90s); subscribe to Supabase Realtime INSERT on `condition_reports` to debounce-reset the poll timer (5s debounce); return `{ cells: HeatmapCell[], loading: boolean, error: string | null }`; add JSDoc
- [X] T021 [US1] Create `src/components/map/HeatmapOverlay.tsx`: use `useMap()` hook; declare `heatRef = useRef<L.HeatLayer | null>(null)`; on mount create `L.heatLayer([], { minOpacity: 0.3, gradient: { 0.4: '#22c55e', 0.65: '#eab308', 1.0: '#ef4444' } }).addTo(map)`; on `cells` prop change update via `heatRef.current.setLatLngs(points).redraw()` where points are `[cell_lat, cell_lng, avg_score / 3]` tuples; listen to `map.on('zoomend')` and recompute `radius = Math.round(12 + (zoom - 10) * 2.5)` and `blur = Math.round(10 + (zoom - 10) * 2)` via `setOptions({ radius, blur }).redraw()`; add Leaflet type augmentation for `heatLayer` in same file
- [X] T022 [US1] Create `src/components/map/ConditionPopup.tsx`: attach `map.on('click')` listener; on click query `cells` array to find nearest cell within click tolerance; if cell found render `<Popup>` with: `top_condition` label, `avg_score` displayed as colored quality badge (green/yellow/red), `report_count` with "low data" badge when `< 3`, most-recent timestamp formatted as relative time ("3 hours ago"); if no cell within tolerance render "No reports yet for this area" Popup; close Popup on map click elsewhere
- [X] T023 [P] [US1] Create `src/components/ui/Legend.tsx`: fixed-position element (bottom-right); render horizontal gradient bar from `#22c55e` (green) to `#ef4444` (red) with "Good" and "Poor" labels; display active `activityType` as a pill above the bar; include a small "⬤ low data" indicator with reduced-opacity circle and label; `aria-label="Heatmap legend"`
- [X] T024 [P] [US1] Create `src/components/ui/OfflineBanner.tsx`: accept `visible: boolean` prop; render a fixed top banner "Map tiles unavailable — you are offline" with a dismiss button when `visible=true`; `role="alert"` for screen reader announcement
- [X] T025 [US1] Integrate US1 into `App.tsx`: replace `{/* TODO: US1 */}` with `<MapView ref={mapRef} onTileError={...}>`; inside MapView render `<HeatmapOverlay cells={cells} />` and `<ConditionPopup cells={cells} />`; render `<Legend activityType={activityType} />` and `<OfflineBanner visible={tileError} />` in overlay layer; wire `useHeatmapData` to populate `cells`

**Checkpoint**: US1 fully functional and independently testable — heatmap loads, popup works, legend visible.

---

## Phase 4: User Story 2 - Submit a Condition Report (Priority: P2)

**Goal**: Anonymous report form accessible from map view; submission updates heatmap within 5 minutes.

**Independent Test**: Without any account, tap Report → fill condition_type (e.g. "ice") + severity 3 → submit → confirm row in Supabase table editor → wait ≤ 90s for heatmap to update.

- [X] T026 [P] [US2] Create `src/components/report/ReportButton.tsx`: render a fixed floating action button (bottom-center); icon + "Report" label; `aria-label="Report a road condition"`; keyboard focusable; accept `onClick: () => void` prop; Tailwind: `bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg`
- [X] T027 [US2] Create `src/components/report/ReportForm.tsx`: slide-up panel (`role="dialog"` `aria-modal="true"` `aria-labelledby="report-form-title"`); wrap content in `<FocusTrap active={isOpen}>`; fields: (1) location display showing lat/lng with draggable map pin via `useMap` — show accuracy warning if `accuracy > GPS_ACCURACY_THRESHOLD_METERS`; (2) `condition_type` `<select>` grouped with `<optgroup>` labels for "Weather" and "Structural" categories; (3) severity radio group with labels "1 – Good/Mild", "2 – Fair", "3 – Poor/Severe"; (4) description `<textarea>` maxLength 280 with character counter; (5) Submit button disabled until condition_type and severity are selected; store all field values in React `useState` (not DOM) so values survive submission failure
- [X] T028 [US2] Implement submission logic in `ReportForm.tsx`: on submit build `InsertConditionReport` payload with `location: \`POINT(${lng} ${lat})\``, selected fields, `session_token` from `useSessionToken()`; call `supabase.from('condition_reports').insert(payload)`; on `error.message.includes('RATE_LIMIT_EXCEEDED')` → call `onToast({ message: 'Limit reached: 30 reports per hour. Try again later.', type: 'error' })`; on other error → call `onToast({ message: 'Submission failed — your report is saved, tap Submit to retry.', type: 'error' })` and keep form open with data intact; on success → call `onToast({ message: 'Report submitted! Thank you.', type: 'success' })` + close form + trigger immediate heatmap refetch
- [X] T029 [US2] Add low-accuracy GPS handling to `ReportForm.tsx`: import `useGeolocation`; if `accuracy > GPS_ACCURACY_THRESHOLD_METERS` render a warning banner inside the form: "GPS accuracy is low (Xm) — drag the pin to your exact location before submitting"; the draggable map pin must be movable regardless of accuracy; do not block submission if user has manually adjusted
- [X] T030 [US2] Integrate `ReportButton` + `ReportForm` into `App.tsx`: manage `isReportOpen` state; on open, `ReportForm` receives focus via FocusTrap; on close, programmatically return focus to `ReportButton` ref; pass `activityType` to `ReportForm` for condition_type default pre-selection

**Checkpoint**: US2 fully functional — submit form anonymously, row appears in Supabase, toast shown, heatmap updates.

---

## Phase 5: User Story 3 - Search and Navigate to an Area (Priority: P3)

**Goal**: Type a location name or address; map flies to that area and heatmap renders.

**Independent Test**: Type "Beacon Hill, Boston" → select suggestion → map animates to location → heatmap renders for that area. Type gibberish → "No results found" shown.

- [X] T031 [US3] Create `src/components/search/SearchBar.tsx`: controlled `<input type="search">` with `aria-label="Search for a location"` and `role="combobox"` aria pattern; 300ms debounce on value change before fetching; fetch `https://nominatim.openstreetmap.org/search?q={encodeURIComponent(query)}&format=json&limit=5&addressdetails=1` with `headers: { Referer: window.location.origin }`; parse results with `parseNominatimResult` from `specs/001-road-report-heatmap/contracts/nominatim.ts`; render `<ul role="listbox">` dropdown with `<li role="option">` items showing `display_name`; keyboard nav: ArrowDown/Up move selection, Enter confirms, Escape closes; show "No results found" `<p role="status">` when fetch returns empty array; show nothing while typing (only show dropdown after first result)
- [X] T032 [US3] Implement map navigation in `SearchBar.tsx`: on result selection call `mapRef.current.flyToBounds([[result.bounds[0][0], result.bounds[0][1]], [result.bounds[1][0], result.bounds[1][1]]], { maxZoom: 15 })`; clear the search input after navigation; map stays on navigated area when input is cleared without selecting (no reverse navigation)
- [X] T033 [US3] Integrate `SearchBar` into `App.tsx`: position in overlay layer at top-center; pass `mapRef` for `flyToBounds`; `SearchBar` sits above `aria-hidden` map container so it is reachable by keyboard and screen readers

**Checkpoint**: US3 independently testable — search any location, map navigates, heatmap refreshes.

---

## Phase 6: User Story 4 - Filter by Activity Type (Priority: P4)

**Goal**: Toggle between Running/Walking/Biking/Commuting; heatmap re-renders client-side in < 1 second.

**Independent Test**: Switch filter from "Running" to "Commuting" — verify heatmap color distribution changes, popup reorders condition categories (congestion first), report form defaults to "congestion" condition_type.

- [X] T034 [US4] Create `src/components/filter/ActivityFilter.tsx`: render four `<button>` elements (Running, Walking, Biking, Commuting) in a pill group; implement roving tabindex: only the active button has `tabIndex={0}`, others have `tabIndex={-1}`; ArrowLeft/Right keys move tabindex and fire `onChange`; active button has distinct background (Tailwind `bg-green-600 text-white`); `aria-label="Filter by activity type"` on wrapping `<div role="group">`; default: Running
- [X] T035 [US4] Update `src/hooks/useHeatmapData.ts` to accept `activityType` in its param object; on `activityType` change immediately re-fetch heatmap (clear interval and fetch now); apply client-side score weighting multipliers to `avg_score` before returning: Running (ice/snow/mud/flooding/standing_water × 1.5, structural × 1.0), Walking (ice/snow/crack/uneven_surface × 1.5, structural × 1.2), Biking (pothole/flooding/congestion × 1.5, structural × 1.0), Commuting (congestion × 1.8, structural × 1.0); weighting is applied in-memory, no new DB query needed for filter switch (satisfies SC-007 < 1s)
- [X] T036 [US4] Update `src/components/map/ConditionPopup.tsx` to receive `activityType` prop; define a `ACTIVITY_CONDITION_PRIORITY` map that sorts condition types by relevance per activity (Running: ice, snow, crack, uneven_surface first; Walking: ice, uneven_surface, crack, debris first; Biking: pothole, flooding, congestion first; Commuting: congestion, construction first); use this order when displaying the top condition label in the popup
- [X] T037 [US4] Update `src/components/report/ReportForm.tsx` to accept `activityType` prop and pre-select `condition_type` default: Running → `'ice'`, Walking → `'uneven_surface'`, Biking → `'pothole'`, Commuting → `'congestion'`; pre-selection only applies when the form opens, not during mid-form activity switch
- [X] T038 [US4] Integrate `ActivityFilter` into `App.tsx`: `activityType` state in `App.tsx` flows to `ActivityFilter` (onChange), `useHeatmapData` (re-fetch trigger), `ConditionPopup` (sort order), `ReportForm` (default condition); verify heatmap re-renders client-side in < 1 second on filter change (no loader shown)

**Checkpoint**: US4 independently testable — all four filter states update heatmap, popup, and form defaults correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: PWA completion, accessibility audit, documentation, and quality gates.

- [X] T039 [P] Complete PWA setup: add iOS AHS meta tags to `index.html` (`apple-mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: default`, `apple-mobile-web-app-title: RoadReport`, `<link rel="apple-touch-icon">`); implement `beforeinstallprompt` capture in `src/main.tsx`; add an "Install App" button in the `App.tsx` overlay that calls `deferredPrompt.prompt()` on Android and shows a modal with iOS instruction ("Tap Share → Add to Home Screen") on iOS Safari
- [X] T040 [P] Configure Workbox OSM tile runtime caching in `vite.config.ts`: add `workbox.runtimeCaching` entry with `urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i`, `handler: 'CacheFirst'`, options `cacheName: 'osm-tiles'`, `expiration: { maxEntries: 1000, maxAgeSeconds: 604800 }`, `cacheableResponse: { statuses: [0, 200] }`
- [X] T041 [P] Create `.gitignore`: include `node_modules/`, `dist/`, `.env.local`, `*.local`, `.DS_Store`, `*.log`
- [X] T042 Create `README.md`: project name "RoadReport", one-sentence description of the app, link to `specs/001-road-report-heatmap/quickstart.md` for full setup instructions, tech stack listed as a table (Vite/React/TS/Tailwind/react-leaflet/Supabase/Vercel)
- [X] T043 Run `npm run lint` and `npx tsc --noEmit`; fix ALL reported errors and warnings until both commands exit with code 0 — this is a non-negotiable quality gate
- [X] T044 [P] Audit WCAG 2.1 AA compliance: (1) keyboard Tab order: SearchBar → ActivityFilter → ReportButton → Legend close button; (2) confirm `aria-hidden="true"` on MapView container div; (3) confirm `role="dialog"` + `aria-modal` + `aria-labelledby` on ReportForm; (4) confirm focus returns to ReportButton after form closes; (5) confirm Toast has `aria-live="polite"`; (6) confirm condition_type `<select>` and severity radios have visible `<label>` elements; fix any failures
- [X] T045 [P] Run `specs/001-road-report-heatmap/quickstart.md` end-to-end validation: execute every step from prerequisites through Vercel deploy and PWA install verification; update any commands, paths, or instructions that are inaccurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — BLOCKS all user story phases
- **US1 (Phase 3)**: Requires Phase 2 complete — first deliverable MVP
- **US2 (Phase 4)**: Requires Phase 2 complete; may start in parallel with US1 after Phase 2
- **US3 (Phase 5)**: Requires Phase 2 + US1 (needs MapView ref)
- **US4 (Phase 6)**: Requires Phase 2 + US1 + US2 (updates hooks and form from both)
- **Polish (Phase 7)**: Requires all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — no US dependencies
- **US2 (P2)**: Independent after Phase 2 — can develop concurrently with US1
- **US3 (P3)**: Depends on US1 (needs `mapRef` from `MapView`)
- **US4 (P4)**: Depends on US1 (updates `useHeatmapData`) and US2 (updates `ReportForm`)

### Within Each User Story

- Parallel tasks (marked [P]) run concurrently on different files
- Integration task (unwires into App.tsx) always runs last in each phase
- T028 depends on T027 (adds to same file)
- T035–T037 are updates to existing files — all parallel, all before T038

---

## Parallel Examples

### Phase 2 Foundational (after T008)

```bash
# Launch these 6 tasks in parallel (all different files):
Task: "Create src/lib/constants.ts"           # T009
Task: "Create src/lib/supabaseClient.ts"      # T010
Task: "Create src/hooks/useSessionToken.ts"   # T011
Task: "Create src/hooks/useGeolocation.ts"    # T012
Task: "Create src/components/ui/Toast.tsx"    # T013
Task: "Configure vite.config.ts"              # T015

# Then run in parallel:
Task: "Create supabase/migrations/001_initial_schema.sql"  # T014
Task: "Create src/vite-env.d.ts"                           # T016
```

### Phase 3 US1 (after Phase 2 complete)

```bash
# Launch these in parallel:
Task: "Create src/components/map/MapView.tsx"     # T019
Task: "Create src/hooks/useHeatmapData.ts"        # T020
Task: "Create src/components/ui/Legend.tsx"       # T023
Task: "Create src/components/ui/OfflineBanner.tsx"# T024

# Then sequentially:
Task: "Create src/components/map/HeatmapOverlay.tsx"  # T021 (uses HeatmapCell type from T020)
Task: "Create src/components/map/ConditionPopup.tsx"  # T022 (uses cells array shape)
Task: "Integrate US1 into App.tsx"                    # T025 (depends on all above)
```

### Phase 4 US2 (can run concurrently with US1 after Phase 2)

```bash
# Launch in parallel:
Task: "Create src/components/report/ReportButton.tsx"  # T026
Task: "Create src/components/report/ReportForm.tsx"    # T027

# Then sequentially (both modify ReportForm.tsx):
Task: "Implement submission logic in ReportForm.tsx"   # T028
Task: "Add GPS accuracy handling to ReportForm.tsx"    # T029
Task: "Integrate ReportButton + ReportForm into App.tsx" # T030
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (run migration in Supabase)
3. Complete Phase 3: US1 — heatmap view
4. **STOP AND VALIDATE**: Open app, confirm heatmap renders, confirm popup works
5. Deploy to Vercel — this is the deliverable MVP

### Incremental Delivery

1. Phase 1 + 2 → Foundation
2. Phase 3 (US1) → **MVP**: Map + heatmap — deploy and demo
3. Phase 4 (US2) → **Add reporting**: users can submit conditions — deploy and demo
4. Phase 5 (US3) → **Add search**: area exploration unlocked — deploy and demo
5. Phase 6 (US4) → **Add activity filters**: multi-activity use case complete — deploy and demo
6. Phase 7 → Polish, accessibility audit, PWA finalization — production-ready release

### Notes

- [P] tasks in the same phase = launch as concurrent agents or parallel work streams
- Run `npm run lint` after each phase before moving to the next
- Run the Supabase migration (T014) manually in the Supabase SQL Editor before any US1 testing
- Commit after each user story phase completes (not per individual task)
- Each story phase ends with an integration task into `App.tsx` — always do this last
