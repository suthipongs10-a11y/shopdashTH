import { describe, expect, it } from 'vitest';
import { buildMeta, clampLimit, DEFAULT_ROW_LIMIT, MAX_ROW_LIMIT, truncateRows } from '../../src/services/format';

describe('clampLimit', () => {
  it('defaults to DEFAULT_ROW_LIMIT when nothing is given', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_ROW_LIMIT);
  });

  it('clamps to MAX_ROW_LIMIT rather than letting a huge request through', () => {
    expect(clampLimit(999_999)).toBe(MAX_ROW_LIMIT);
  });

  it('clamps a non-positive or fractional value up to at least 1, truncated', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
    expect(clampLimit(3.9)).toBe(3);
  });

  it('ignores NaN/Infinity and falls back to the default', () => {
    expect(clampLimit(Number.NaN)).toBe(DEFAULT_ROW_LIMIT);
    expect(clampLimit(Number.POSITIVE_INFINITY)).toBe(DEFAULT_ROW_LIMIT);
  });
});

interface Row {
  name: string;
  cost: number;
}

describe('truncateRows', () => {
  const rows: Row[] = [
    { name: 'a', cost: 300 },
    { name: 'b', cost: 100 },
    { name: 'c', cost: 500 },
    { name: 'd', cost: 200 },
  ];

  it('sorts by impact descending and reports the true row_count', () => {
    const result = truncateRows(rows, { limit: 10, impact: (r) => r.cost });
    expect(result.rows.map((r) => r.name)).toEqual(['c', 'a', 'd', 'b']);
    expect(result.row_count).toBe(4);
    expect(result.returned).toBe(4);
    expect(result.truncated).toBe(false);
  });

  it('keeps the top `limit` and marks the rest as truncated when there is no buildOthers', () => {
    const result = truncateRows(rows, { limit: 2, impact: (r) => r.cost });
    expect(result.rows.map((r) => r.name)).toEqual(['c', 'a']);
    expect(result.row_count).toBe(4);
    expect(result.returned).toBe(2);
    expect(result.truncated).toBe(true);
  });

  it('folds the omitted rows into one summary row via buildOthers', () => {
    const result = truncateRows(rows, {
      limit: 2,
      impact: (r) => r.cost,
      buildOthers: (omitted) => ({
        name: `others (${omitted.length})`,
        cost: omitted.reduce((sum, r) => sum + r.cost, 0),
      }),
    });
    expect(result.rows).toEqual([
      { name: 'c', cost: 500 },
      { name: 'a', cost: 300 },
      { name: 'others (2)', cost: 300 }, // b(100) + d(200)
    ]);
    expect(result.row_count).toBe(4);
    expect(result.returned).toBe(3); // 2 kept + 1 others row
    expect(result.truncated).toBe(true);
  });

  it('does not call buildOthers when nothing was omitted', () => {
    let called = false;
    const result = truncateRows(rows, {
      limit: 10,
      impact: (r) => r.cost,
      buildOthers: () => {
        called = true;
        return { name: 'others', cost: 0 };
      },
    });
    expect(called).toBe(false);
    expect(result.truncated).toBe(false);
  });

  it('never mutates the input array', () => {
    const copy = [...rows];
    truncateRows(rows, { limit: 1, impact: (r) => r.cost });
    expect(rows).toEqual(copy);
  });
});

describe('buildMeta', () => {
  const base = {
    customerId: '1234567890',
    accountTz: 'Asia/Bangkok',
    rowCount: 10,
    returned: 10,
    truncated: false,
    opsUsed: 1,
  };

  it('always hardcodes THB — this project serves one Thai account', () => {
    expect(buildMeta(base)['currency']).toBe('THB');
  });

  it('never claims to know ops_remaining_today — that needs D1 (M3)', () => {
    expect('ops_remaining_today' in buildMeta(base)).toBe(false);
    expect(buildMeta(base)['ops_used']).toBe(1);
  });

  it('omits date_range/compare_range/untrusted_fields when not given', () => {
    const meta = buildMeta(base);
    expect('date_range' in meta).toBe(false);
    expect('compare_range' in meta).toBe(false);
    expect('untrusted_fields' in meta).toBe(false);
  });

  it('includes date_range and compare_range when given', () => {
    const meta = buildMeta({
      ...base,
      dateRange: { start: '2020-01-01', end: '2020-01-14' },
      compareRange: { start: '2019-12-18', end: '2019-12-31' },
    });
    expect(meta['date_range']).toEqual({ start: '2020-01-01', end: '2020-01-14' });
    expect(meta['compare_range']).toEqual({ start: '2019-12-18', end: '2019-12-31' });
    // Long past, so no conversion-lag note.
    expect('conversion_lag_warning' in meta).toBe(false);
  });

  it('warns about conversion lag only when the range ends within the last 3 days', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
    const meta = buildMeta({ ...base, dateRange: { start: today, end: today } });
    expect(meta['conversion_lag_warning']).toBeDefined();
  });

  it('includes untrusted_fields only when non-empty', () => {
    expect('untrusted_fields' in buildMeta({ ...base, untrustedFields: [] })).toBe(false);
    expect(buildMeta({ ...base, untrustedFields: ['search_term'] })['untrusted_fields']).toEqual([
      'search_term',
    ]);
  });
});
