import { describe, expect, it } from 'vitest';
import { deltaMetrics, deriveMetrics, sumTotals, ZERO_TOTALS } from '../../src/services/metrics';

describe('deriveMetrics', () => {
  it('computes CTR, CPC, CPA, ROAS, CVR from raw counts', () => {
    const m = deriveMetrics({
      impressions: 10_000,
      clicks: 250,
      costMicros: 500_000_000, // ฿500
      conversions: 20,
      conversionsValue: 4_000,
    });
    expect(m.cost).toBe(500);
    expect(m.ctr).toBe(2.5); // 250/10000 * 100
    expect(m.cpc).toBe(2); // 500/250
    expect(m.cpa).toBe(25); // 500/20
    expect(m.roas).toBe(8); // 4000/500
    expect(m.cvr).toBe(8); // 20/250 * 100
  });

  it('reports a real 0% CTR for impressions with no clicks, rather than omitting it', () => {
    // 0 clicks out of 500 impressions is a meaningful, non-zero-denominator
    // answer — omitting it would hide exactly the "ad shows but nobody
    // clicks" case a read tool exists to surface.
    const m = deriveMetrics({ ...ZERO_TOTALS, impressions: 500 });
    expect(m.ctr).toBe(0);
  });

  it('omits CPC/CPA/CVR when their own denominator (clicks, conversions) is zero', () => {
    const m = deriveMetrics({ ...ZERO_TOTALS, impressions: 500 });
    expect('cpc' in m).toBe(false); // denominator is clicks
    expect('cpa' in m).toBe(false); // denominator is conversions
    expect('cvr' in m).toBe(false); // denominator is clicks
  });

  it('omits ROAS when cost is zero, even with conversion value recorded', () => {
    const m = deriveMetrics({ ...ZERO_TOTALS, conversionsValue: 100 });
    expect('roas' in m).toBe(false);
  });

  it('omits CTR only when impressions — its own denominator — is zero', () => {
    const m = deriveMetrics(ZERO_TOTALS);
    expect('ctr' in m).toBe(false);
  });

  it('an all-zero row derives nothing beyond the raw counts themselves', () => {
    expect(deriveMetrics(ZERO_TOTALS)).toEqual({
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
    });
  });
});

describe('sumTotals', () => {
  it('adds every field across rows', () => {
    const total = sumTotals([
      { impressions: 100, clicks: 10, costMicros: 1_000_000, conversions: 1, conversionsValue: 100 },
      { impressions: 200, clicks: 20, costMicros: 2_000_000, conversions: 2, conversionsValue: 200 },
    ]);
    expect(total).toEqual({
      impressions: 300,
      clicks: 30,
      costMicros: 3_000_000,
      conversions: 3,
      conversionsValue: 300,
    });
  });

  it('returns all zeros for an empty list', () => {
    expect(sumTotals([])).toEqual(ZERO_TOTALS);
  });
});

describe('deltaMetrics', () => {
  it('reports percentage change for every metric present in both periods', () => {
    const before = deriveMetrics({
      impressions: 1000,
      clicks: 100,
      costMicros: 100_000_000,
      conversions: 10,
      conversionsValue: 1000,
    });
    const after = deriveMetrics({
      impressions: 1100,
      clicks: 121,
      costMicros: 121_000_000,
      conversions: 11,
      conversionsValue: 1210,
    });
    const delta = deltaMetrics(before, after);
    expect(delta.clicks).toBe(21);
    expect(delta.cost).toBe(21);
    // cpc is unchanged (121/121 = 1 = 100/100), ctr rose (121/1100 > 100/1000)
    expect(delta.cpc).toBe(0);
  });

  it('leaves out a metric that is missing from either period', () => {
    const noClicksBefore = deriveMetrics(ZERO_TOTALS);
    const someClicksAfter = deriveMetrics({ ...ZERO_TOTALS, clicks: 5, impressions: 100 });
    const delta = deltaMetrics(noClicksBefore, someClicksAfter);
    expect('cpc' in delta).toBe(false); // before had no clicks, so no CPC to compare from
    expect('ctr' in delta).toBe(false); // before had no impressions either
  });
});
