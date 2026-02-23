# roadreport Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-19

## Active Technologies
- TypeScript 5.x / React 18 + Vite 5, Tailwind CSS 3, focus-trap-react (already installed), Leaflet / react-leaflet v4 (002-compact-report-form)
- N/A — form state is transient; Supabase submission logic unchanged (002-compact-report-form)
- PostgreSQL 15 (Supabase) + PostGIS 3; TypeScript 5 / React 18 (no changes) + PostGIS `ST_SnapToGrid`, `ST_X`, `ST_Y`, `AVG()` — all already in use (003-fix-heatmap-accuracy)
- Supabase PostgreSQL — `condition_reports` table (no schema change); `get_heatmap_cells` RPC updated (003-fix-heatmap-accuracy)
- TypeScript 5.x / React 18 + Vite 5 (unchanged) + react-leaflet v4 (Leaflet `LatLngBounds` already available); Nominatim REST API (already in use — adding two query params) (004-improve-search)
- N/A — no database changes (004-improve-search)

- TypeScript 5.x, Node.js 20 LTS (build toolchain) (001-road-report-heatmap)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, Node.js 20 LTS (build toolchain): Follow standard conventions

## Recent Changes
- 004-improve-search: Added TypeScript 5.x / React 18 + Vite 5 (unchanged) + react-leaflet v4 (Leaflet `LatLngBounds` already available); Nominatim REST API (already in use — adding two query params)
- 003-fix-heatmap-accuracy: Added PostgreSQL 15 (Supabase) + PostGIS 3; TypeScript 5 / React 18 (no changes) + PostGIS `ST_SnapToGrid`, `ST_X`, `ST_Y`, `AVG()` — all already in use
- 002-compact-report-form: Added TypeScript 5.x / React 18 + Vite 5, Tailwind CSS 3, focus-trap-react (already installed), Leaflet / react-leaflet v4


<!-- MANUAL ADDITIONS START -->
## Stack (001-road-report-heatmap)

**Frontend**: Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3
**Map**: react-leaflet v4 + leaflet.heat (custom `useMap()` hook wrapper) + OpenStreetMap tiles
**Geocoding**: Nominatim (no API key) — set `Referer` header on all requests
**Backend**: Supabase (PostgreSQL 15 + PostGIS 3) — direct browser client, no custom API layer
**PWA**: vite-plugin-pwa (Workbox `generateSW`) — installable on Android + iOS
**Deployment**: Vercel Hobby — `vercel.json` required for SPA rewrite + `sw.js` cache headers

## Key Architecture Decisions

- **No custom backend** — Vite SPA → Supabase anon key directly; RLS is the access layer
- **Rate limiting** — Postgres BEFORE INSERT trigger (30/hr/session_token); no Edge Functions
- **Heatmap aggregation** — `get_heatmap_cells` RPC using `ST_SnapToGrid`; zoom-adaptive cell sizes
- **Decay scoring** — inline `severity * exp(-age/half_life)` in SQL; weather: 1.5d, structural: 7.0d
- **Session token** — `crypto.randomUUID()` in `sessionStorage`; no PII, auto-cleared on tab close
- **Heatmap updates** — 90s polling baseline; optional Supabase Realtime INSERT trigger to reset timer
- **Accessibility** — `aria-hidden` on Leaflet container; all controls are standard DOM outside it

## Source Layout

```
src/components/map/        MapView, HeatmapOverlay, ConditionPopup
src/components/report/     ReportButton, ReportForm
src/components/search/     SearchBar
src/components/filter/     ActivityFilter
src/components/ui/         Legend, Toast, OfflineBanner
src/hooks/                 useHeatmapData, useSessionToken, useGeolocation
src/lib/                   supabaseClient, constants
src/types/index.ts         All shared types (ConditionType, HeatmapCell, etc.)
supabase/migrations/       001_initial_schema.sql (all DDL)
```

## Env Vars (must have VITE_ prefix for Vite to inline at build time)

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Free Tier Limits to Respect

- Supabase egress: 5 GB/month → cap `get_heatmap_cells` at 500 rows; client cache TTL 90s
- `condition_reports` rows: nightly pg_cron deletes rows older than 90 days
<!-- MANUAL ADDITIONS END -->
