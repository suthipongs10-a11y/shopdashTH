/**
 * Derived metrics every read tool computes (SPEC §6.1 point 1: "ทุกผลลัพธ์มี
 * ตัวชี้วัดคำนวณแล้ว (CTR, CPC, CPA, ROAS, CVR)").
 *
 * Computed from raw counts rather than trusted from Google's own
 * `metrics.ctr` / `metrics.average_cpc` fields: one formula and one
 * rounding rule in one place, applied everywhere this project shows a
 * number, instead of every tool trusting whatever the API happened to
 * compute for that particular resource level.
 *
 * Runtime-agnostic (CLAUDE.md — `src/services` must stay portable): only
 * `src/ads/money.ts`, no Workers or Node globals.
 */
import { deltaPct, microsToUnits, round1, round2, safeDivide } from '../ads/money';

/** The five raw counts every other metric here is built from. */
export interface RawTotals {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

export const ZERO_TOTALS: RawTotals = {
  impressions: 0,
  clicks: 0,
  costMicros: 0,
  conversions: 0,
  conversionsValue: 0,
};

export interface DerivedMetrics {
  impressions: number;
  clicks: number;
  /** THB, 2 decimals (SPEC §6.1 point 4). */
  cost: number;
  conversions: number;
  /** THB, 2 decimals. */
  conversionsValue: number;
  /** 0–100, 1 decimal. Absent (never 0) when there were no impressions to divide by. */
  ctr?: number;
  /** THB per click, 2 decimals. Absent when there were no clicks. */
  cpc?: number;
  /** THB per conversion, 2 decimals. Absent when there were no conversions. */
  cpa?: number;
  /** conversionsValue ÷ cost, 2 decimals. Absent when cost was zero. */
  roas?: number;
  /** 0–100, 1 decimal — conversions ÷ clicks. Absent when there were no clicks. */
  cvr?: number;
}

/**
 * Sum raw counts across rows — the one place "add these up" happens, so a
 * caller combining daily rows into a period total, or keyword rows into a
 * campaign total, does it the same way everywhere.
 */
export function sumTotals(rows: RawTotals[]): RawTotals {
  return rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      costMicros: acc.costMicros + r.costMicros,
      conversions: acc.conversions + r.conversions,
      conversionsValue: acc.conversionsValue + r.conversionsValue,
    }),
    { ...ZERO_TOTALS },
  );
}

export function deriveMetrics(totals: RawTotals): DerivedMetrics {
  const cost = microsToUnits(totals.costMicros);
  const ctrRatio = safeDivide(totals.clicks, totals.impressions);
  const cvrRatio = safeDivide(totals.conversions, totals.clicks);
  const cpc = safeDivide(cost, totals.clicks);
  const cpa = safeDivide(cost, totals.conversions);
  const roas = safeDivide(totals.conversionsValue, cost);

  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    cost: round2(cost),
    conversions: totals.conversions,
    conversionsValue: round2(totals.conversionsValue),
    ...(ctrRatio === undefined ? {} : { ctr: round1(ctrRatio * 100) }),
    ...(cpc === undefined ? {} : { cpc: round2(cpc) }),
    ...(cpa === undefined ? {} : { cpa: round2(cpa) }),
    ...(roas === undefined ? {} : { roas: round2(roas) }),
    ...(cvrRatio === undefined ? {} : { cvr: round1(cvrRatio * 100) }),
  };
}

/** Keys `deltaMetrics` compares — every numeric field `DerivedMetrics` can carry. */
const METRIC_KEYS: (keyof DerivedMetrics)[] = [
  'impressions',
  'clicks',
  'cost',
  'conversions',
  'conversionsValue',
  'ctr',
  'cpc',
  'cpa',
  'roas',
  'cvr',
];

/**
 * Percentage change for each metric between two periods (SPEC §6.2
 * `summary.delta_pct`). A metric missing from either period (e.g. no clicks,
 * so no CTR) is left out rather than reported as a 0% or infinite change.
 */
export function deltaMetrics(
  before: DerivedMetrics,
  after: DerivedMetrics,
): Partial<Record<keyof DerivedMetrics, number>> {
  const out: Partial<Record<keyof DerivedMetrics, number>> = {};
  for (const key of METRIC_KEYS) {
    const b = before[key];
    const a = after[key];
    if (typeof b !== 'number' || typeof a !== 'number') continue;
    const delta = deltaPct(b, a);
    if (delta !== undefined) out[key] = delta;
  }
  return out;
}
