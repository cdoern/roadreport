/**
 * contracts/tables.ts
 *
 * TypeScript types for all direct Supabase table operations (INSERT, SELECT, PATCH).
 * These are used by the Supabase JS client in the frontend.
 *
 * Row Level Security (RLS) notes:
 *   - SELECT on condition_reports: public (anon key) — anyone can read reports
 *   - INSERT on condition_reports: public (anon key) — anyone can submit; rate-limited by DB trigger
 *   - PATCH on condition_reports (upvotes only): public (anon key); restricted to upvotes column via RLS policy
 *   - DELETE: not permitted via client; handled by pg_cron cleanup job only
 */

import type { ActivityType, ConditionReport, ConditionType, NewConditionReport } from '../data-model';

// ---------------------------------------------------------------------------
// condition_reports — INSERT
// ---------------------------------------------------------------------------

/**
 * Payload sent to Supabase when inserting a new condition report.
 *
 * The `location` field uses PostGIS WKT format: 'POINT(lng lat)' (note: lng first).
 * `id` and `submitted_at` are generated server-side.
 * `upvotes` defaults to 0 server-side.
 *
 * @example
 *   const payload: InsertConditionReport = {
 *     location: 'POINT(-71.0892 42.3601)',
 *     condition_type: 'ice',
 *     severity: 3,
 *     description: 'Black ice on the corner, very slippery.',
 *     session_token: getSessionToken(),
 *     activity_context: 'running',
 *   };
 *   const { error } = await supabase.from('condition_reports').insert(payload);
 */
export interface InsertConditionReport {
  /** PostGIS WKT point: 'POINT(longitude latitude)' */
  location: string;
  condition_type: ConditionType;
  /** 1 = good/mild, 2 = fair, 3 = poor/severe */
  severity: 1 | 2 | 3;
  /** Optional free-text note, max 280 characters */
  description?: string;
  /** Browser-generated UUID from sessionStorage; used for rate limiting only */
  session_token: string;
  /** Activity filter active at time of report submission */
  activity_context?: ActivityType;
}

// ---------------------------------------------------------------------------
// condition_reports — SELECT (for popup detail view)
// ---------------------------------------------------------------------------

/**
 * Shape returned when fetching individual reports for a popup detail panel.
 * Matches the full ConditionReport type.
 *
 * @example
 *   const { data } = await supabase
 *     .from('condition_reports')
 *     .select('id, condition_type, severity, description, upvotes, submitted_at')
 *     .eq('id', reportId)
 *     .single();
 */
export type SelectConditionReport = Pick<
  ConditionReport,
  'id' | 'condition_type' | 'severity' | 'description' | 'upvotes' | 'submitted_at'
>;

// ---------------------------------------------------------------------------
// condition_reports — PATCH (upvote increment)
// ---------------------------------------------------------------------------

/**
 * Payload for incrementing the upvote count on a report.
 * RLS policy must restrict updates to the `upvotes` column only.
 *
 * Note: No duplicate-vote prevention in v1. The RLS policy permits any
 * anon-key client to increment upvotes on any report once per request.
 *
 * @example
 *   const { error } = await supabase.rpc('increment_upvote', { report_id: id });
 *   // Preferred over direct PATCH to keep increment atomic server-side.
 */
export interface IncrementUpvoteParams {
  report_id: string;
}

// ---------------------------------------------------------------------------
// Error codes surfaced by DB triggers
// ---------------------------------------------------------------------------

/**
 * Error codes raised by Postgres triggers and returned as Supabase errors.
 * Check `error.message` against these strings in the frontend.
 */
export const DB_ERROR_CODES = {
  /** Raised by enforce_rate_limit trigger when session exceeds 30 reports/hour */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;
