/**
 * Shared response shaping every read tool uses (SPEC §6.1, §6.2): cap and
 * sort rows by impact instead of silently truncating in whatever order
 * Google returned them, and build the `meta` block the same way everywhere.
 *
 * Runtime-agnostic (CLAUDE.md): no Workers or Node globals.
 */

/** SPEC §6.1 point 3: "default 50 แถว (สูงสุด 500)". */
export const DEFAULT_ROW_LIMIT = 50;
export const MAX_ROW_LIMIT = 500;

export interface TruncateOptions<T> {
  /** Caller-requested limit; clamped to `[1, MAX_ROW_LIMIT]`, defaulting to `DEFAULT_ROW_LIMIT`. */
  limit?: number;
  /** What "impact" means for this row set — usually cost. Sorted descending. */
  impact: (row: T) => number;
  /**
   * Build a single summary row for whatever got cut, when a tool wants one
   * (SPEC §6.1: "รวมแถวที่เหลือเป็น `others`"). Optional: a short, already
   *-bounded list (e.g. `gads_get_account_overview`'s campaigns) has nothing
   * worth rolling up, and forcing every caller to supply one would mean
   * fabricating an aggregate nobody asked for.
   */
  buildOthers?: (omitted: T[]) => T;
}

export interface Truncated<T> {
  rows: T[];
  row_count: number;
  returned: number;
  truncated: boolean;
}

/** Clamp a caller-supplied limit into the range SPEC §6.1 allows. */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_ROW_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_ROW_LIMIT);
}

/**
 * Sort by impact (descending), keep the top `limit`, and optionally fold
 * everything else into one `others` row via `buildOthers`.
 *
 * `row_count` is the true total before truncation; `returned` is what's
 * actually in `rows` (one more than `limit` when an `others` row was added,
 * so it still reads as "how many rows came back").
 */
export function truncateRows<T>(all: T[], options: TruncateOptions<T>): Truncated<T> {
  const limit = clampLimit(options.limit);
  const sorted = [...all].sort((a, b) => options.impact(b) - options.impact(a));
  const kept = sorted.slice(0, limit);
  const omitted = sorted.slice(limit);

  const rows =
    omitted.length > 0 && options.buildOthers ? [...kept, options.buildOthers(omitted)] : kept;

  return {
    rows,
    row_count: all.length,
    returned: rows.length,
    truncated: omitted.length > 0,
  };
}

export interface DateRange {
  start: string;
  end: string;
}

export interface BuildMetaOptions {
  customerId: string;
  accountTz: string;
  dateRange?: DateRange;
  compareRange?: DateRange;
  rowCount: number;
  returned: number;
  truncated: boolean;
  /** Field names in `rows` that carry account-authored free text (SPEC §5.4) —
   * search terms, ad copy, campaign names — never data this project wrote itself. */
  untrustedFields?: string[];
  opsUsed: number;
}

/**
 * The `meta` block SPEC §6.2 shapes, built the same way by every tool.
 *
 * `currency` is hardcoded to THB rather than fetched from `customer
 * .currency_code`: this project serves one Thai account (SPEC "ขอบเขตตอนนี้"),
 * confirmed THB during M0 setup, and fetching it fresh on every tool call
 * would spend a Google Ads API call — worth avoiding given Explorer access's
 * 2,880 ops/day ceiling — to reconfirm something that cannot change without
 * a person deliberately reconnecting a different account.
 *
 * `ops_remaining_today` is left out: it needs a day's worth of calls tracked
 * somewhere durable, which is `quota_usage` in D1 (SPEC §5.4) — M3 work.
 * `ops_used` (this call's own count, from `AdsClient.opsUsed()`) needs no
 * storage at all, so it's included now.
 */
export function buildMeta(options: BuildMetaOptions): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    customer_id: options.customerId,
    currency: 'THB',
    timezone: options.accountTz,
    data_freshness: 'ข้อมูลอาจล่าช้าได้หลายชั่วโมง; ยอด conversion ย้อนหลังยังเพิ่มได้',
    row_count: options.rowCount,
    returned: options.returned,
    truncated: options.truncated,
    ops_used: options.opsUsed,
  };
  if (options.dateRange) meta['date_range'] = options.dateRange;
  if (options.compareRange) meta['compare_range'] = options.compareRange;
  if (options.untrustedFields && options.untrustedFields.length > 0) {
    meta['untrusted_fields'] = options.untrustedFields;
  }
  if (options.dateRange && withinLastDays(options.dateRange.end, 3, options.accountTz)) {
    meta['conversion_lag_warning'] = 'ช่วง 3 วันล่าสุดยอด conversion อาจยังนับไม่ครบ';
  }
  return meta;
}

/** Whether `isoDate` (YYYY-MM-DD) falls within the last `days` days, as of
 * "now" in `timeZone`. Used only to decide whether the conversion-lag note
 * applies — a coarse day-level check is all that needs. */
function withinLastDays(isoDate: string, days: number, timeZone: string): boolean {
  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  const today = new Date(`${todayIso}T00:00:00Z`);
  const target = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return false;
  const diffDays = (today.getTime() - target.getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays < days;
}
