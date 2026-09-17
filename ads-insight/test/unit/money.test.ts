import { describe, expect, it } from 'vitest';
import {
  deltaPct,
  formatMicros,
  formatUnits,
  microsToUnits,
  MoneyError,
  parseMicros,
  parseMicrosBig,
  parseMicrosOrZero,
  round1,
  round2,
  safeDivide,
  unitsToMicros,
} from '../../src/ads/money';

describe('parseMicros', () => {
  it('accepts the JSON string form the REST API actually returns for int64', () => {
    expect(parseMicros('8420500000')).toBe(8_420_500_000);
  });

  it('accepts number and bigint too', () => {
    expect(parseMicros(1_000_000)).toBe(1_000_000);
    expect(parseMicros(1_000_000n)).toBe(1_000_000);
  });

  it('handles negative values', () => {
    expect(parseMicros('-500000')).toBe(-500_000);
  });

  it('rejects junk instead of yielding NaN', () => {
    expect(() => parseMicros('abc')).toThrow(MoneyError);
    expect(() => parseMicros('1.5')).toThrow(MoneyError);
    expect(() => parseMicros(null)).toThrow(MoneyError);
    expect(() => parseMicros(undefined)).toThrow(MoneyError);
    expect(() => parseMicros(1.5)).toThrow(MoneyError);
    expect(() => parseMicros(Number.NaN)).toThrow(MoneyError);
  });

  it('refuses to silently lose precision on values beyond safe integers', () => {
    const huge = '90071992547409910';
    expect(() => parseMicros(huge)).toThrow(/parseMicrosBig/);
    expect(parseMicrosBig(huge)).toBe(90071992547409910n);
  });
});

describe('parseMicrosOrZero', () => {
  it('treats an absent metric as zero', () => {
    expect(parseMicrosOrZero(undefined)).toBe(0);
    expect(parseMicrosOrZero(null)).toBe(0);
    expect(parseMicrosOrZero('')).toBe(0);
  });

  it('still rejects junk', () => {
    expect(() => parseMicrosOrZero('abc')).toThrow(MoneyError);
  });
});

describe('microsToUnits', () => {
  it('converts micros to baht', () => {
    expect(microsToUnits(1_000_000)).toBe(1);
    expect(microsToUnits('8420500000')).toBe(8420.5);
    expect(microsToUnits(0)).toBe(0);
  });

  it('rounds to 2 decimals', () => {
    expect(microsToUnits(1_234_567)).toBe(1.23);
    expect(microsToUnits(1_235_000)).toBe(1.24);
  });

  it('rounds the exact half up rather than to even', () => {
    // 1.005 is not representable in binary floating point, so a naive
    // (micros / 1e6).toFixed(2) rounds this down. Integer maths keeps it exact.
    expect(microsToUnits(1_005_000)).toBe(1.01);
    expect(microsToUnits(2_005_000)).toBe(2.01);
  });

  it('handles negatives symmetrically', () => {
    expect(microsToUnits(-1_005_000)).toBe(-1.01);
    expect(microsToUnits(-8_420_500_000)).toBe(-8420.5);
  });
});

describe('unitsToMicros', () => {
  it('round-trips with microsToUnits', () => {
    for (const thb of [0, 1, 250.75, 8420.5, 15000]) {
      expect(microsToUnits(unitsToMicros(thb))).toBe(thb);
    }
  });

  it('rounds sub-micro input rather than producing a fractional micro', () => {
    expect(unitsToMicros(0.0000004)).toBe(0);
    expect(unitsToMicros(0.0000006)).toBe(1);
  });

  it('rejects values that cannot be represented exactly', () => {
    expect(() => unitsToMicros(Number.MAX_SAFE_INTEGER)).toThrow(MoneyError);
    expect(() => unitsToMicros(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });
});

describe('formatUnits', () => {
  it('groups thousands and always shows 2 decimals', () => {
    expect(formatUnits(8420.5)).toBe('฿8,420.50');
    expect(formatUnits(1_234_567.891)).toBe('฿1,234,567.89');
    expect(formatUnits(0)).toBe('฿0.00');
    expect(formatUnits(999)).toBe('฿999.00');
    expect(formatUnits(1000)).toBe('฿1,000.00');
  });

  it('puts the sign before the currency symbol', () => {
    expect(formatUnits(-250)).toBe('-฿250.00');
  });

  it('formats micros directly', () => {
    expect(formatMicros('8420500000')).toBe('฿8,420.50');
  });
});

describe('deltaPct', () => {
  it('reports change to one decimal', () => {
    expect(deltaPct(100, 112.4)).toBe(12.4);
    expect(deltaPct(100, 91.9)).toBe(-8.1);
  });

  it('has no answer when there is no baseline', () => {
    // 0 -> 50 is not "infinite growth" to a reader; callers render "ไม่มีข้อมูลเทียบ"
    expect(deltaPct(0, 50)).toBeUndefined();
    expect(deltaPct(Number.NaN, 5)).toBeUndefined();
  });

  it('keeps direction right when the baseline is negative', () => {
    expect(deltaPct(-100, -50)).toBe(50);
  });
});

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('returns undefined on a zero denominator instead of Infinity', () => {
    // no clicks and no conversions are ordinary, not errors
    expect(safeDivide(5, 0)).toBeUndefined();
    expect(safeDivide(0, 0)).toBeUndefined();
  });
});

describe('rounding helpers', () => {
  it('rounds to the precision SPEC §6.1 asks for', () => {
    expect(round1(12.44)).toBe(12.4);
    expect(round1(12.45)).toBe(12.5);
    expect(round2(271.555)).toBe(271.56);
    expect(round2(271.554)).toBe(271.55);
  });
});
