# Research: Crowdsourced Road & Sidewalk Condition Map

**Branch**: `001-road-report-heatmap` | **Date**: 2026-02-19

---

## 1. Geographic Storage: PostGIS Column Type & Indexing

**Decision**: `geography(Point, 4326)` column with a GIST spatial index + secondary btree index on `submitted_at`.

**Rationale**: Users submit raw GPS lat/lng. The `geography` type accepts those coordinates natively, computes distances in meters without manual projection, and avoids SRID-mismatch errors. For aggregation queries, cast to `geometry` at query time (`location::geometry`) — this is zero-overhead and is the standard PostGIS pattern. A GIST index on `location` is required for any spatial query to be fast beyond ~10k rows.

**Alternatives considered**:
- `geometry(Point, 4326)`: Works, but distance calculations return degrees unless you manually project — error-prone for contributors unfamiliar with PostGIS.
- Two `double precision` columns (`lat`, `lng`): Simple schema, but loses all spatial indexing and forces Haversine calculations in application code.

---

## 2. Zoom-Adaptive Cell Aggregation

**Decision**: `ST_SnapToGrid` with zoom-level-parameterized degree-based cell sizes, called from a Supabase RPC function with the current viewport bounding box and zoom level as parameters.

**Cell size mapping**:

| Zoom level | Cell size (degrees) | Approx. real-world size |
|---|---|---|
| ≤ 5 | 1.0° | ~111 km |
| ≤ 8 | 0.25° | ~28 km |
| ≤ 11 | 0.05° | ~5.5 km |
| ≤ 13 | 0.01° | ~1.1 km |
| > 13 | 0.005° | ~550 m |

**Rationale**: `ST_SnapToGrid` is built into PostGIS with no additional extensions. H3 (`pg_h3`) is not available on Supabase's managed free tier extension whitelist. `ST_SnapToGrid` provides adequate cell resolution for a heatmap use case; the visual difference from hexagonal tiling is imperceptible at map zoom levels.

**Alternatives considered**:
- H3 hexagonal binning (`pg_h3`): Better equal-area properties and more visually appealing, but unavailable on Supabase managed instances.
- Pre-computed materialised cell views: Faster reads but introduces write-path complexity and stale data risk. Not warranted until query latency becomes a problem beyond ~100k rows.

---

## 3. Recency Decay Scoring

**Decision**: Inline exponential decay computed at query time: `severity * exp(-age_in_days / half_life_days)`. Half-life is category-class-differentiated: **1.5 days** for weather-environmental, **7.0 days** for structural.

**Decay behaviour at severity = 3**:

| Age | Weather score | Structural score |
|---|---|---|
| 0 hours | 3.0 | 3.0 |
| 12 hours | 2.2 | 2.9 |
| 1 day | 1.6 | 2.7 |
| 3 days | 0.3 | 2.2 |
| 7 days | ~0 | 1.5 |
| 14 days | ~0 | 0.75 |

**Rationale**: A stored/computed column cannot reference `now()` in PostgreSQL — scores must be computed at read time. Exponential decay is smooth (no jarring heatmap jumps at time boundaries), always-current, and requires zero maintenance. The category-class split (1.5d vs 7d half-life) satisfies the spec requirement that weather conditions decay faster than structural ones.

**Cleanup**: A nightly `pg_cron` job (available on Supabase free tier) deletes rows older than 90 days where the decay score is effectively zero, preventing unbounded table growth.

**Alternatives considered**:
- Discrete time buckets (full score < 6h, half score < 24h, zero otherwise): Simpler SQL but produces abrupt visual jumps on the heatmap.
- Stored `score_at_insert * exp(...)` pattern: Marginally faster reads; not needed until query latency benchmarks demand it.

---

## 4. Supabase Free Tier Limits

| Resource | Free Limit | Impact |
|---|---|---|
| Database size | 500 MB | At ~300 bytes/row, ~1.7M rows before limit. With 90-day nightly cleanup, ample headroom. |
| Egress bandwidth | 5 GB/month | Primary constraint. Heatmap RPC must cap rows at 500 per call; client-side cache TTL of 60–120s reduces repeat queries. |
| Realtime connections | 200 concurrent | Fine for early-stage usage. |
| Realtime messages | 2M/month | Use polling as baseline; Realtime INSERT trigger as optional enhancement. |
| Edge Function invocations | 500k/month | Not used in v1 (rate limiting done via DB trigger). |
| PostGIS | Fully available | `ST_SnapToGrid`, `ST_DWithin`, `ST_Within` all supported. |
| `pg_cron` | Available | Use for nightly decay pruning. |
| Project pause | After 1 week inactivity | Not a concern in production. |

**Mitigation for egress**: Limit `get_heatmap_cells` RPC to 500 rows maximum; client caches results for 90 seconds before refetch.

---

## 5. Realtime vs Polling for Heatmap Updates

**Decision**: 90-second polling as the baseline. Optional Supabase Realtime `INSERT` subscription to reset the poll timer when a new nearby report is submitted.

**Rationale**: Supabase Realtime delivers row-level events (INSERT/UPDATE/DELETE) — it does not push pre-aggregated heatmap data. On receiving an INSERT event, the client must still re-run the aggregation RPC. Using Realtime as a poll-timer trigger (debounced 5 seconds) achieves sub-10-second heatmap refresh after a new report, well within the 5-minute spec requirement. Pure polling every 90s satisfies the requirement with less connection management complexity.

**Alternatives considered**:
- Pure Realtime (no polling): Still requires a re-query after each INSERT event; wastes the 2M monthly message quota with high-frequency subscriptions across many concurrent users.
- Shorter polling interval (30s): Doubles egress cost for minimal UX improvement given that most reports are not time-critical.

---

## 6. Rate Limiting Implementation

**Decision**: Postgres `BEFORE INSERT` trigger on `condition_reports` that counts recent submissions by `session_token` within the past hour and raises an exception if the count ≥ 30.

**Rationale**: The trigger is atomic (no race conditions), runs with no cold-start latency, requires no additional infrastructure, and aligns with the project constitution's Simplicity principle. The Supabase JS client surfaces the raised exception, which the frontend maps to the rate-limit user message.

**Alternatives considered**:
- Supabase Edge Functions: Adds Deno runtime, cold-start latency, and deployment complexity. No functional advantage over the trigger approach for this use case.
- Vercel/Netlify serverless functions: Introduces platform dependency for logic that belongs at the data layer; Netlify's 125k invocation/month limit is also more restrictive.
- Client-side only: Trivially bypassable. Rejected outright.

---

## 7. Heatmap Rendering Library

**Decision**: `leaflet.heat` loaded directly, wrapped in a custom `HeatmapOverlay` React component using react-leaflet's `useMap()` hook. Type declarations added via a local module augmentation file.

**Rationale**: `react-leaflet-heatmap-layer-v3` has not been updated for react-leaflet v4's hooks-based API and has no TypeScript declarations. The custom wrapper is ~40 lines, gives full control over `setOptions()` and `redraw()`, and follows the same pattern react-leaflet v4 uses internally. `leaflet.heat` itself is 2KB and battle-tested.

**Alternatives considered**:
- `react-leaflet-heatmap-layer-v3`: Incompatible with react-leaflet v4; no TypeScript support; abandoned.
- Deck.gl `HeatmapLayer`: Excellent TypeScript support and WebGL-accelerated, but ~300KB dependency and disproportionate architecture for this use case.
- Custom canvas overlay: Full control, but requires reimplementing Gaussian blur kernel. Not justified when `leaflet.heat` exists.

---

## 8. Zoom-Adaptive Visual Rendering

**Decision**: Subscribe to Leaflet's `zoomend` event and recompute `radius` and `blur` pixel values from current zoom level using a linear formula: `radius = 12 + (zoom - 10) * 2.5`.

**Rationale**: `leaflet.heat`'s `radius` option is in pixels, not metres. At low zoom, a fixed pixel radius covers a huge geographic area; at high zoom, it becomes a dot. The linear formula tuned to the zoom range 10–18 gives visual radii between 17–37px. The server-side `ST_SnapToGrid` bucketing handles data granularity; the front-end radius adjustment is cosmetic smoothing.

---

## 9. PWA Setup

**Decision**: `vite-plugin-pwa` with `generateSW` strategy (Workbox), `display: standalone`, iOS Safari meta tags in `index.html`, and `CacheFirst` tile caching for up to 1,000 OSM tiles.

**Rationale**: `vite-plugin-pwa` is the canonical Vite PWA solution. iOS Safari does not support `beforeinstallprompt` — a manual in-app instruction is required for iOS "Add to Home Screen." Android Chrome fires `beforeinstallprompt` automatically when manifest + service worker criteria are met.

**Tile caching**: `CacheFirst` with a 1,000-tile bounded LRU cache covers a ~10×10 grid at zoom 14 (~4MB). `StaleWhileRevalidate` would waste bandwidth on tiles unlikely to change. Full pre-caching is impractical (tens of thousands of tiles per city area).

---

## 10. Session Token

**Decision**: `crypto.randomUUID()` stored in `sessionStorage`.

**Rationale**: Cleared automatically on tab close (short-lived by design), cryptographically random (122 bits of entropy), requires no library, and contains zero PII. `localStorage` would persist across sessions, enabling cross-session activity correlation — inconsistent with FR-007's "no device fingerprint" requirement.

---

## 11. Deployment Platform

**Decision**: Vercel Hobby plan.

**Rationale**: Vercel provides 1M serverless function invocations/month (vs Netlify's 125k) and 6,000 build minutes/month (vs Netlify's 300). Both platforms auto-detect Vite and require the same one-line SPA rewrite configuration. Vercel's `vercel.json` `headers` block sets the required `Cache-Control: no-store` on `sw.js` to prevent stale service worker delivery.

**Key deployment gotchas**:
- `sw.js` must have `Cache-Control: no-store` (not `s-maxage=0` — Vercel strips `s-maxage` before the client).
- Vite-hashed assets (`/assets/*`) should have `Cache-Control: public, max-age=31536000, immutable`.
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) must be set in Vercel dashboard; changes require a new deployment.
- Vercel Hobby cannot connect to GitHub **organisation** repositories — repo must be personal or use Netlify instead.
- No CORS configuration needed for Supabase anon-key access; the Supabase REST API allows all origins with the anon key.

---

## 12. WCAG 2.1 AA Accessibility

**Decision**: `aria-hidden="true"` on the Leaflet map container. All interactive UI (search, report form, filter, legend, popups) rendered as standard DOM elements outside the hidden zone. Focus management enforced on panel open/close. `focus-trap-react` for modal panels.

**Rationale**: Leaflet's canvas has no accessibility tree. WCAG compliance lives entirely in the surrounding HTML. The heatmap's color scale must never be the sole means of conveying information — FR-004's text popup satisfies WCAG 1.4.1 (Use of Color). Color contrast must meet 4.5:1 for normal text (Tailwind's default palette satisfies this).
