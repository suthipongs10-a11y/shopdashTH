/**
 * Tests that read the committed fixtures.
 *
 * Two jobs, and they are different jobs:
 *
 * - **Real fixtures** (`test/fixtures/*.json`) are checked for what must *not*
 *   be in them. The scrubber already checks at capture time, on the owner's
 *   machine; this checks the files that actually landed in the repo, which is
 *   the only copy anyone else will ever see. A capture run that was interrupted,
 *   an edit by hand, a file copied from the wrong folder — none of those go
 *   through the scrubber, and all of them go through CI.
 *
 * - **Synthetic fixtures** (`test/fixtures/synthetic/*.json`) are checked for
 *   being internally true. They are written by a script, so the risk is not
 *   leakage but incoherence: a CTR that does not match its own clicks and
 *   impressions, keyword rows that do not add up to their campaign. Analysis
 *   code built against a fixture that lies is analysis code that is wrong on
 *   the day it meets real data.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { microsToUnits, parseMicros, round2, safeDivide } from '../../src/ads/money';

const REAL_DIR = resolve(__dirname, '../fixtures');
const SYNTHETIC_DIR = resolve(REAL_DIR, 'synthetic');

interface Fixture {
  _meta: Record<string, unknown>;
  rows: Record<string, unknown>[];
}

function load(dir: string, file: string): Fixture {
  return JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as Fixture;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

/** Walk every leaf, so a check cannot be fooled by a field nobody thought of. */
function leaves(value: unknown, path = ''): { path: string; value: unknown }[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  }
  return [{ path, value }];
}

const realFiles = jsonFiles(REAL_DIR);
const syntheticFiles = jsonFiles(SYNTHETIC_DIR);

describe('real fixtures', () => {
  it('has fixtures to check', () => {
    expect(realFiles.length).toBeGreaterThan(0);
  });

  it.each(realFiles)('%s — declares itself scrubbed and counts its own rows', (file) => {
    const fixture = load(REAL_DIR, file);
    expect(fixture._meta['scrubbed']).toBe(true);
    expect(Array.isArray(fixture.rows)).toBe(true);
    expect(fixture._meta['rows']).toBe(fixture.rows.length);
  });

  /**
   * The scrubber numbers its pseudonyms from 1000000001, so every id in a
   * clean fixture is a ten-digit number starting `10000000`. A real Google Ads
   * customer id is ten digits too but will not match that prefix — which makes
   * this a cheap, total check that no real id survived anywhere in the file,
   * including inside resource names.
   */
  it.each(realFiles)('%s — every id is a pseudonym, not a real one', (file) => {
    const text = readFileSync(resolve(REAL_DIR, file), 'utf8');
    const ids = text.match(/customers\/(\d+)/g) ?? [];
    const real = [...new Set(ids)].filter((id) => !/^customers\/10000000\d\d$/.test(id));
    expect(real).toEqual([]);
  });

  it.each(realFiles)('%s — carries no contact details', (file) => {
    const text = readFileSync(resolve(REAL_DIR, file), 'utf8');
    const emails = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []).filter(
      (email) => !email.endsWith('@example.com'),
    );
    expect(emails).toEqual([]);
    expect(text).not.toMatch(/(?<!\d)(?:\+?66[\s-]?|0)\d{1,2}[\s-]\d{3}[\s-]\d{4}(?!\d)/);
  });

  /**
   * The direct regression test for the bug that put `"1080-000-0000"` in a
   * budget field: every money value in a committed fixture must still parse.
   */
  it.each(realFiles)('%s — every money value still parses as micros', (file) => {
    const fixture = load(REAL_DIR, file);
    for (const leaf of leaves(fixture.rows)) {
      if (!leaf.path.endsWith('Micros')) continue;
      expect(() => parseMicros(leaf.value), `${file} ${leaf.path}`).not.toThrow();
    }
  });
});

describe('synthetic fixtures', () => {
  it.each(syntheticFiles)('%s — is labelled synthetic so it cannot pass as evidence', (file) => {
    const fixture = load(SYNTHETIC_DIR, file);
    expect(fixture._meta['synthetic']).toBe(true);
    expect(fixture._meta['scrubbed']).toBeUndefined();
    expect(fixture._meta['rows']).toBe(fixture.rows.length);
  });

  it('models an account that actually has traffic — unlike the real one', () => {
    const rows = load(SYNTHETIC_DIR, 'campaign-metrics-30d.json').rows;
    const clicks = rows.reduce(
      (sum, row) => sum + Number((row['metrics'] as Record<string, string>)['clicks'] ?? '0'),
      0,
    );
    expect(clicks).toBeGreaterThan(1000);
  });

  it('omits zero-valued metrics, the way proto3 JSON does', () => {
    const rows = load(SYNTHETIC_DIR, 'keywords-30d.json').rows;
    const neverServed = rows.find((row) => {
      const criterion = row['adGroupCriterion'] as { keyword: { text: string } };
      return criterion.keyword.text === 'ซิมเทพ รายปี';
    });
    expect(neverServed).toBeDefined();
    // Not `impressions: "0"` — the key is absent entirely, as it is in the
    // real capture. Readers that do `Number(m.impressions)` on undefined get NaN.
    expect(neverServed!['metrics']).toEqual({});
  });

  describe('campaign-metrics-30d.json', () => {
    const rows = load(SYNTHETIC_DIR, 'campaign-metrics-30d.json').rows;
    const metrics = rows.map((row) => row['metrics'] as Record<string, string | number>);

    it('derives ctr from its own clicks and impressions', () => {
      for (const m of metrics) {
        const clicks = Number(m['clicks'] ?? 0);
        const impressions = Number(m['impressions'] ?? 0);
        const expected = safeDivide(clicks, impressions) ?? 0;
        expect(Number(m['ctr'] ?? 0)).toBeCloseTo(expected, 5);
      }
    });

    it('derives average cpc from its own cost and clicks', () => {
      for (const m of metrics) {
        const clicks = Number(m['clicks'] ?? 0);
        if (clicks === 0) continue;
        const expected = parseMicros(m['costMicros'] ?? '0') / clicks;
        // average_cpc is a whole number of micros, so it is the exact quotient
        // rounded — at most half a micro out, which is ฿0.0000005.
        const actual = parseMicros(m['averageCpc'] ?? '0');
        expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.5);
      }
    });

    it('splits impression share three ways that total exactly 1', () => {
      for (const m of metrics) {
        const won = Number(m['searchImpressionShare'] ?? 0);
        const budget = Number(m['searchBudgetLostImpressionShare'] ?? 0);
        const rank = Number(m['searchRankLostImpressionShare'] ?? 0);
        expect(round2(won + budget + rank)).toBe(1);
      }
    });

    it('never reports more page views than clicks', () => {
      for (const m of metrics) {
        expect(Number(m['conversions'] ?? 0)).toBeLessThanOrEqual(Number(m['clicks'] ?? 0));
      }
    });

    it('spends within a plausible distance of the daily budget', () => {
      const budgets = new Map(
        load(SYNTHETIC_DIR, 'campaigns.json').rows.map((row) => [
          (row['campaign'] as { id: string }).id,
          microsToUnits((row['campaignBudget'] as { amountMicros: string }).amountMicros),
        ]),
      );
      for (const row of rows) {
        const id = (row['campaign'] as { id: string }).id;
        const spend = microsToUnits(
          (row['metrics'] as Record<string, string>)['costMicros'] ?? '0',
        );
        // Google lets a day overspend, but not without limit.
        expect(spend).toBeLessThanOrEqual(budgets.get(id)! * 2);
      }
    });
  });

  /**
   * The check that matters most: three tables describing one account have to
   * describe the *same* account. Google's own data reconciles this way, and an
   * analysis that cross-checks keyword spend against campaign spend has to be
   * able to trust it.
   */
  describe('the three views of the account agree', () => {
    type Totals = { clicks: number; costMicros: number; conversions: number };

    function totalsByCampaign(file: string): Map<string, Totals> {
      const out = new Map<string, Totals>();
      for (const row of load(SYNTHETIC_DIR, file).rows) {
        const id = (row['campaign'] as { id: string }).id;
        const m = (row['metrics'] ?? {}) as Record<string, string | number>;
        const current = out.get(id) ?? { clicks: 0, costMicros: 0, conversions: 0 };
        current.clicks += Number(m['clicks'] ?? 0);
        current.costMicros += parseMicros(m['costMicros'] ?? '0');
        current.conversions += Number(m['conversions'] ?? 0);
        out.set(id, current);
      }
      return out;
    }

    const byKeyword = totalsByCampaign('keywords-30d.json');
    const byDay = totalsByCampaign('campaign-metrics-30d.json');
    const byHour = totalsByCampaign('hour-of-day-30d.json');

    it('covers every campaign in all three', () => {
      expect([...byKeyword.keys()].sort()).toEqual([...byDay.keys()].sort());
      expect([...byKeyword.keys()].sort()).toEqual([...byHour.keys()].sort());
    });

    it('agrees to the last click and the last satang', () => {
      for (const [id, expected] of byKeyword) {
        expect(byDay.get(id), `daily rows for ${id}`).toEqual(expected);
        expect(byHour.get(id), `hour rows for ${id}`).toEqual(expected);
      }
    });

    it('reports fewer clicks in search terms than in keywords, as the API does', () => {
      // search_term_view only shows terms above Google's privacy threshold, so
      // it is always a subset of what the keywords recorded.
      const byTerm = totalsByCampaign('search-terms-30d.json');
      for (const [id, terms] of byTerm) {
        expect(terms.clicks).toBeLessThanOrEqual(byKeyword.get(id)!.clicks);
      }
    });
  });

  it('contains the traffic problems it exists to make findable', () => {
    const rows = load(SYNTHETIC_DIR, 'keywords-30d.json').rows;
    const read = (row: Record<string, unknown>) => {
      const m = (row['metrics'] ?? {}) as Record<string, string | number>;
      const clicks = Number(m['clicks'] ?? 0);
      const impressions = Number(m['impressions'] ?? 0);
      return {
        text: (row['adGroupCriterion'] as { keyword: { text: string } }).keyword.text,
        impressions,
        clicks,
        ctr: safeDivide(clicks, impressions),
        cpc: safeDivide(microsToUnits(m['costMicros'] ?? '0'), clicks),
        pageViewRate: safeDivide(Number(m['conversions'] ?? 0), clicks),
      };
    };
    const all = rows.map(read);

    // impressions but effectively no clicks — the ad does not match the query
    expect(all.some((k) => k.impressions > 10_000 && (k.ctr ?? 1) < 0.005)).toBe(true);
    // clicks costing several times the account average
    const accountCpc =
      all.reduce((sum, k) => sum + (k.cpc ?? 0) * k.clicks, 0) /
      all.reduce((sum, k) => sum + k.clicks, 0);
    expect(all.some((k) => (k.cpc ?? 0) > accountCpc * 3)).toBe(true);
    // clicks that never turn into a page view — a landing page problem
    expect(all.some((k) => k.clicks > 50 && (k.pageViewRate ?? 1) < 0.35)).toBe(true);
    // a keyword that has never served at all
    expect(all.some((k) => k.impressions === 0)).toBe(true);
  });
});
