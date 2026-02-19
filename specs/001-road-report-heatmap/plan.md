# Implementation Plan: Crowdsourced Road & Sidewalk Condition Map

**Branch**: `001-road-report-heatmap` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-road-report-heatmap/spec.md`

## Summary

A web-based PWA that crowdsources road and sidewalk condition reports and displays them as a
zoom-adaptive heatmap overlay on an OpenStreetMap base map. Users can view aggregated condition
data, submit anonymous reports across four categories (surface quality, safety hazard,
congestion, weather-environmental), search for areas by name or address, and filter by activity
type (Running, Walking, Biking, Commuting). The stack is Vite + React + TypeScript + Tailwind
CSS + react-leaflet on the frontend, Supabase (PostgreSQL + PostGIS) for storage and
geo-aggregation via a custom RPC function, deployed to Vercel Hobby free tier as an installable
PWA.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (build toolchain)
**Primary Dependencies**:
- Frontend: React 18, Vite 5, Tailwind CSS 3, react-leaflet 4, leaflet 1.9, leaflet.heat,
  @supabase/supabase-js 2, vite-plugin-pwa (Workbox), focus-trap-react
- Geocoding: Nominatim (OpenStreetMap) — no API key required
- Testing: Vitest, React Testing Library

**Storage**: Supabase PostgreSQL 15 + PostGIS 3 — `geography(Point, 4326)` column, GIST index,
`ST_SnapToGrid` aggregation via `get_heatmap_cells` RPC, exponential recency decay scoring
inline in SQL, BEFORE INSERT trigger for rate limiting, `pg_cron` nightly cleanup

**Testing**: Vitest + React Testing Library for hooks and utility functions; no E2E in v1

**Target Platform**: Web (desktop + mobile browsers), PWA installable on Android and iOS,
deployed to Vercel Hobby

**Performance Goals**:
- SC-001: Heatmap visible within 3 seconds on mobile connection
- SC-002: Report submitted in under 60 seconds end-to-end
- SC-007: Activity filter switch updates heatmap in under 1 second (client-side, no new request)

**Constraints**:
- Supabase free tier: 500 MB database, 5 GB egress/month
- Vercel Hobby: 100 GB bandwidth/month, no paid map API
- WCAG 2.1 Level AA for all non-map interactive UI elements (FR-016)
- Session tokens must contain no PII (FR-007)

**Scale/Scope**: Early-stage consumer app; free tier supports approximately 250 concurrent
active users based on egress budget estimates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity ✅ PASS

- No custom backend layer — the Vite SPA calls Supabase directly via the anon key
- Rate limiting via a Postgres BEFORE INSERT trigger — no Edge Function, no separate service
- Zoom-adaptive heatmap aggregation via a single `ST_SnapToGrid` RPC — no materialised views,
  no pre-computation, no caching tables
- Session token: `crypto.randomUUID()` in `sessionStorage` — zero dependencies, auto-cleared
- Upvote increment via a single `increment_upvote` RPC — atomic server-side, no read-modify-write
  race in client code

### II. Maintainability ✅ PASS

- TypeScript throughout; all types in `src/types/index.ts`
- Components follow Single Responsibility: `HeatmapOverlay`, `ReportForm`, `SearchBar`,
  `ActivityFilter`, `ConditionPopup` are independently testable units
- SQL migrations versioned in `supabase/migrations/001_initial_schema.sql`
- ESLint `no-unused-vars` and strict TypeScript settings enforced; `npm run lint` required
  to pass before any commit

### III. Documentation ✅ PASS (commitment)

- `quickstart.md` generated as part of this plan (see Phase 1 artifacts)
- All exported hooks and utility functions MUST have JSDoc with `@param`, `@returns`, and
  a one-sentence purpose description
- SQL migration file MUST include inline comments on the decay formula and rate limit trigger
- `README.md` MUST be created as a task in the implementation phase

### IV. Code Quality ✅ PASS (commitment)

- ESLint + Prettier enforced in the Vercel CI build (build fails on lint errors)
- WCAG 2.1 AA: `aria-hidden="true"` on Leaflet container, `role="dialog"` + `aria-modal`
  on report panel, `focus-trap-react` for focus management, keyboard-navigable controls
- All Supabase calls wrapped with explicit `{ data, error }` destructuring; errors surface
  as toasts — no silent failures
- FR-012 (preserve form on failed submit) implemented via React state, not form reset

**Post-Phase 1 re-check**: ✅ No new violations. PostGIS RPC complexity (ST_SnapToGrid,
exponential decay, pg_cron) is justified — it is the minimum viable approach to the core
heatmap feature. Simpler client-side alternatives were evaluated and rejected (see Complexity
Tracking below).

## Project Structure

### Documentation (this feature)

```text
specs/001-road-report-heatmap/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── rpc.ts           # Supabase RPC type signatures
│   ├── tables.ts        # Table insert/select/patch types + error codes
│   └── nominatim.ts     # Nominatim geocoding response shape + parser
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── map/
│   │   ├── MapView.tsx          # Leaflet MapContainer + OSM tile layer; aria-hidden wrapper
│   │   ├── HeatmapOverlay.tsx   # leaflet.heat wrapper via useMap(); zoom-adaptive radius
│   │   └── ConditionPopup.tsx   # Popup panel: condition summary, report count, timestamp
│   ├── report/
│   │   ├── ReportButton.tsx     # Floating "Report" FAB; triggers form open
│   │   └── ReportForm.tsx       # Slide-up panel: location pin, category, severity, note
│   ├── search/
│   │   └── SearchBar.tsx        # Nominatim geocoding input with debounce + suggestions
│   ├── filter/
│   │   └── ActivityFilter.tsx   # Running/Walking/Biking/Commuting toggle (roving tabindex)
│   └── ui/
│       ├── Legend.tsx           # Heatmap color scale + active filter label
│       ├── Toast.tsx            # Success / error / rate-limit notifications
│       └── OfflineBanner.tsx    # Shown on tile load failure (map.on('tileerror'))
├── hooks/
│   ├── useHeatmapData.ts        # 90s polling + optional Realtime INSERT trigger
│   ├── useSessionToken.ts       # crypto.randomUUID() persisted in sessionStorage
│   └── useGeolocation.ts        # navigator.geolocation wrapper with error handling
├── lib/
│   ├── supabaseClient.ts        # createClient() singleton; reads VITE_SUPABASE_* env vars
│   └── constants.ts             # ZOOM_CELL_SIZES map, HALF_LIFE values, POLL_INTERVAL_MS
├── types/
│   └── index.ts                 # ConditionReport, HeatmapCell, ActivityType, ConditionType, etc.
├── App.tsx                      # Root layout: map beneath absolutely-positioned UI panels
├── main.tsx                     # Vite entry; registers service worker via vite-plugin-pwa
└── vite-env.d.ts                # ImportMetaEnv: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

supabase/
└── migrations/
    └── 001_initial_schema.sql   # All DDL: extensions, table, indexes, trigger, RPC functions, cron

public/
├── pwa-192x192.png              # Android Chrome install icon
├── pwa-512x512.png              # Splash/maskable icon
└── apple-touch-icon.png         # iOS Safari AHS icon (180×180, no transparency)

# Root config files
vite.config.ts                   # Vite + vite-plugin-pwa + Tailwind
tailwind.config.ts
vercel.json                      # SPA rewrite + Cache-Control for sw.js + /assets/*
.env.local                       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (gitignored)
.env.example                     # Documented placeholder (committed)
```

**Structure Decision**: Single Vite SPA. No separate backend project — Supabase is the
backend. All application source lives in `src/`. SQL schema and migrations live in
`supabase/migrations/` alongside the app (no monorepo tooling needed). One repository,
one Vercel deployment.

## Complexity Tracking

> PostGIS geographic aggregation is required complexity — the core feature is a zoom-adaptive
> heatmap. Simpler alternatives were evaluated:

| Evaluated Alternative | Why Rejected |
|---|---|
| Client-side point clustering (e.g., supercluster) | Pushes full raw dataset to the client; cannot compute decay-weighted aggregate scores efficiently; breaks SC-001 on mobile connections |
| Fixed cell sizes (non-zoom-adaptive) | City-scale heatmap is meaningless noise at street zoom, or street-scale detail is invisible at city zoom — unacceptable UX |
| Supabase Edge Functions for rate limiting | Adds Deno runtime dependency, cold-start latency (~200–500ms), and a separate deployment artifact; Postgres BEFORE INSERT trigger achieves identical result with fewer moving parts |
| Materialised views for pre-computed cells | Adds write-path complexity, introduces stale-data risk, and requires a refresh strategy; not warranted until read latency benchmarks demand it |
| H3 hexagonal binning (pg_h3) | Not available on Supabase managed free tier extension whitelist |
