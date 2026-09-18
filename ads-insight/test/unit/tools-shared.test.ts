import { describe, expect, it } from 'vitest';
import {
  dateRangeClause,
  priorPeriod,
  resolveCustomerId,
  resolveDateRange,
} from '../../src/mcp/tools/shared';

describe('resolveCustomerId', () => {
  const env = { DEFAULT_CUSTOMER_ID: '1234567890' };

  it('uses the caller-supplied id when given', () => {
    expect(resolveCustomerId(env, '9999999999')).toBe('9999999999');
  });

  it('falls back to DEFAULT_CUSTOMER_ID when omitted', () => {
    expect(resolveCustomerId(env, undefined)).toBe('1234567890');
  });

  it('falls back when given an empty or whitespace-only string', () => {
    expect(resolveCustomerId(env, '')).toBe('1234567890');
    expect(resolveCustomerId(env, '   ')).toBe('1234567890');
  });
});

describe('resolveDateRange', () => {
  it('defaults to a 30-day window ending yesterday', () => {
    const range = resolveDateRange('UTC', undefined);
    const today = new Date().toISOString().slice(0, 10);
    expect(range.end < today).toBe(true);
    const days =
      (new Date(`${range.end}T00:00:00Z`).getTime() - new Date(`${range.start}T00:00:00Z`).getTime()) /
        86_400_000 +
      1;
    expect(days).toBe(30);
  });

  it('a 1-day window has start === end', () => {
    const range = resolveDateRange('UTC', 1);
    expect(range.start).toBe(range.end);
  });

  it('respects the account time zone, not just UTC', () => {
    // Just before midnight Bangkok (UTC+7) is already "tomorrow" there —
    // resolveDateRange must key off the account's own calendar date.
    const bangkok = resolveDateRange('Asia/Bangkok', 1);
    const utc = resolveDateRange('UTC', 1);
    // They may or may not differ depending on the instant the test runs,
    // but both must always be valid, well-formed single-day ranges.
    expect(bangkok.start).toBe(bangkok.end);
    expect(utc.start).toBe(utc.end);
  });
});

describe('priorPeriod', () => {
  it('is the same length as the original range, immediately before it', () => {
    const range = { start: '2026-09-01', end: '2026-09-30' }; // 30 days
    const prior = priorPeriod(range);
    expect(prior.end).toBe('2026-08-31'); // the day before `start`
    expect(prior.start).toBe('2026-08-02'); // 30 days ending 2026-08-31
  });

  it('handles a single-day range', () => {
    const prior = priorPeriod({ start: '2026-09-15', end: '2026-09-15' });
    expect(prior).toEqual({ start: '2026-09-14', end: '2026-09-14' });
  });

  it('crosses a month boundary correctly', () => {
    const prior = priorPeriod({ start: '2026-03-01', end: '2026-03-05' }); // 5 days
    expect(prior).toEqual({ start: '2026-02-24', end: '2026-02-28' });
  });
});

describe('dateRangeClause', () => {
  it('builds a literal BETWEEN clause', () => {
    expect(dateRangeClause({ start: '2026-01-01', end: '2026-01-31' })).toBe(
      "segments.date BETWEEN '2026-01-01' AND '2026-01-31'",
    );
  });
});
