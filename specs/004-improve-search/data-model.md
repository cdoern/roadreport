# Data Model: Improve Search Bar Results

**Feature**: 004-improve-search
**Date**: 2026-02-23

---

## Summary

No database schema changes. No Supabase tables or RPCs are affected. Changes are
confined to the frontend geocoding layer: the `NominatimResult` interface gains one
field, `parseNominatimResult` gains formatting logic, and `MapViewHandle` gains one
imperative method.

---

## Modified Interface: NominatimResult (`src/lib/nominatim.ts`)

One new field added to align the TypeScript type with what Nominatim already returns:

| Field | Type | New? | Meaning |
|-------|------|------|---------|
| `place_id` | `number` | — | Nominatim place identifier |
| `display_name` | `string` | — | Full comma-separated place name from Nominatim |
| `lat` | `string` | — | Latitude as decimal string |
| `lon` | `string` | — | Longitude as decimal string |
| `boundingbox` | `[string,string,string,string]` | — | [south, north, west, east] |
| `address` | `object?` | — | Structured address fields (road, city, state…) |
| **`class`** | **`string`** | **✅ NEW** | **Nominatim result class (e.g. "highway", "place", "boundary")** |

---

## Modified Interface: GeocodingResult (`src/lib/nominatim.ts`)

Unchanged shape. The `displayName` field already carries the result label; after
this feature it will contain the concise formatted label rather than the raw
`display_name` string. No downstream consumers need updating — the field name and
type (`string`) are identical.

---

## Modified Interface: MapViewHandle (`src/components/map/MapView.tsx`)

One new imperative method:

| Method | Signature | New? | Meaning |
|--------|-----------|------|---------|
| `flyToBounds` | `(bounds, options?) → void` | — | Animates map to bounds |
| **`getBoundsString`** | **`() → string \| null`** | **✅ NEW** | **Returns current viewport as "west,south,east,north" string for Nominatim `viewbox` param; null if map not yet initialised** |

---

## New Pure Function: formatDisplayName (`src/lib/nominatim.ts`)

| Attribute | Value |
|-----------|-------|
| Signature | `formatDisplayName(displayName: string): string` |
| Input | Raw `display_name` from Nominatim |
| Output | Concise label: first 3 non-postcode comma-separated parts |
| Side effects | None |
| Called by | `parseNominatimResult` |

---

## No New State

`SearchBar` gains no new `useState` or `useRef` entries. Map bounds are read
imperatively via `mapRef.current?.getBoundsString()` at query time — no stored
state, no effect wiring.
