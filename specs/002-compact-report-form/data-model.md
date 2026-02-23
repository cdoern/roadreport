# Data Model: Compact Report Form Redesign

**Branch**: `002-compact-report-form` | **Date**: 2026-02-22

## Overview

This feature introduces no new data entities, no schema changes, and no new API surface. It is a pure presentational redesign of an existing UI component.

## Existing Types (unchanged)

All types consumed by `ReportForm` remain identical. Shown here for reference only.

### `InsertConditionReport` (unchanged)

The payload submitted to Supabase on form submit. No new fields; no removed fields.

| Field | Type | Notes |
|-------|------|-------|
| `location` | `string` (WKT) | `POINT(lng lat)` — sourced from pin position |
| `condition_type` | `ConditionType` | One of 14 enum values |
| `severity` | `1 \| 2 \| 3` | User-selected severity level |
| `description` | `string \| undefined` | Optional free-text note (max 280 chars) |
| `session_token` | `string` | From `useSessionToken()` |
| `activity_context` | `ActivityType` | Current activity filter value |

### `ReportFormProps` (unchanged)

The component's public interface. No new props; no removed props.

| Prop | Type | Notes |
|------|------|-------|
| `isOpen` | `boolean` | Controls slide-up animation |
| `activityType` | `ActivityType` | Pre-selects default condition chip |
| `pinLocation` | `{ lat, lng } \| null` | Current pin coordinates |
| `accuracy` | `number \| null` | GPS accuracy in metres |
| `pinAdjusted` | `boolean` | Suppresses accuracy warning after manual drag |
| `sessionToken` | `string` | Stable session UUID |
| `onToast` | `(msg, type) => void` | Show toast notification |
| `onClose` | `() => void` | Close and return focus |
| `onSubmitSuccess` | `() => void` | Trigger heatmap refetch |

## Internal State Changes

One new internal state variable is added to `ReportForm` to support the collapsible note field:

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `noteExpanded` | `boolean` | `false` | Controls visibility of the description textarea |

All other internal state (`conditionType`, `severity`, `description`, `isSubmitting`) is unchanged.

## No Contract Changes

No new API endpoints, RPC calls, or Supabase schema changes. The Supabase `.insert()` call and rate-limit error handling are unchanged.
