import { describe, expect, it } from 'vitest';
import {
  createScrubber,
  findLeaks,
  findMeasurementChanges,
  scrub,
} from '../../scripts/lib/scrub';

/** A row shaped like a real campaign performance response. */
const row = {
  campaign: {
    resourceName: 'customers/9876543210/campaigns/22334455',
    id: '22334455',
    name: 'Search - ล้างแอร์ ภูเก็ต',
    status: 'ENABLED',
  },
  campaignBudget: {
    resourceName: 'customers/9876543210/campaignBudgets/99887766',
    amountMicros: '400000000',
  },
  metrics: {
    impressions: '12043',
    clicks: '312',
    costMicros: '8420500000',
    conversions: 31.0,
    ctr: 0.0259,
  },
  segments: { date: '2026-09-15', device: 'MOBILE' },
};

describe('identifiers', () => {
  it('replaces ids everywhere, including inside resource names', () => {
    const out = scrub(row) as typeof row;
    expect(out.campaign.id).not.toBe('22334455');
    expect(out.campaign.resourceName).not.toContain('9876543210');
    expect(out.campaign.resourceName).not.toContain('22334455');
    expect(out.campaign.resourceName).toMatch(/^customers\/\d+\/campaigns\/\d+$/);
  });

  it('keeps the same id consistent so rows still join', () => {
    const out = scrub({ a: row, b: row }) as { a: typeof row; b: typeof row };
    expect(out.a.campaign.id).toBe(out.b.campaign.id);
    // the customer id is shared between campaign and budget, and must stay shared
    const customerFrom = (r: string) => r.split('/')[1];
    expect(customerFrom(out.a.campaign.resourceName)).toBe(
      customerFrom(out.a.campaignBudget.resourceName),
    );
  });

  it('gives different entities different replacements', () => {
    const out = scrub(row) as typeof row;
    expect(out.campaign.id).not.toBe(out.campaignBudget.resourceName.split('/')[3]);
  });

  it('leaves short numbers alone — they are metrics, not ids', () => {
    const out = scrub({ metrics: { clicks: '312', conversions: 31 } }) as {
      metrics: { clicks: string; conversions: number };
    };
    expect(out.metrics.clicks).toBe('312');
    expect(out.metrics.conversions).toBe(31);
  });

  it('keeps metric magnitudes even when they are long, because they are numbers not strings of ids', () => {
    // costMicros is a long digit string; scrubbing it would destroy the fixture's value
    const out = scrub(row) as typeof row;
    expect(out.metrics.impressions).toBe('12043');
    expect(out.metrics.ctr).toBe(0.0259);
  });
});

describe('names and free text', () => {
  it('replaces campaign names but keeps the field present', () => {
    const out = scrub(row) as typeof row;
    expect(out.campaign.name).not.toContain('ภูเก็ต');
    expect(out.campaign.name).toMatch(/^name-\d+$/);
  });

  it('replaces ad text and keyword text', () => {
    const out = scrub({
      ad: { headlines: [{ text: 'ล้างแอร์ราคาถูก' }, { text: 'บริการถึงบ้าน' }] },
    }) as { ad: { headlines: { text: string }[] } };
    expect(out.ad.headlines.map((h) => h.text)).toEqual(['text-1', 'text-2']);
  });

  it('keeps enum values and dates untouched', () => {
    const out = scrub(row) as typeof row;
    expect(out.campaign.status).toBe('ENABLED');
    expect(out.segments).toEqual({ date: '2026-09-15', device: 'MOBILE' });
  });
});

describe('search terms', () => {
  const input = { searchTermView: { searchTerm: 'ล้างแอร์ ใกล้ฉัน ราคา' } };

  it('replaces them by default, because the public types personal things into search', () => {
    const out = scrub(input) as { searchTermView: { searchTerm: string } };
    expect(out.searchTermView.searchTerm).toMatch(/^text-\d+$/);
  });

  it('can keep them when the user has decided that is acceptable', () => {
    const out = scrub(input, { keepSearchTerms: true }) as {
      searchTermView: { searchTerm: string };
    };
    expect(out.searchTermView.searchTerm).toBe('ล้างแอร์ ใกล้ฉัน ราคา');
  });

  it('still removes contact details from a kept search term', () => {
    const out = scrub(
      { searchTermView: { searchTerm: 'ติดต่อ 081-234-5678 หรือ me@real.co.th' } },
      { keepSearchTerms: true },
    ) as { searchTermView: { searchTerm: string } };
    expect(out.searchTermView.searchTerm).not.toContain('081-234-5678');
    expect(out.searchTermView.searchTerm).not.toContain('me@real.co.th');
  });
});

describe('urls and contact details', () => {
  it('replaces final urls consistently', () => {
    const out = scrub({
      a: { finalUrls: ['https://realsite.co.th/service?utm=x'] },
      b: { finalUrls: ['https://realsite.co.th/service?utm=x'] },
    }) as { a: { finalUrls: string[] }; b: { finalUrls: string[] } };
    expect(out.a.finalUrls[0]).not.toContain('realsite');
    expect(out.a.finalUrls[0]).toBe(out.b.finalUrls[0]);
  });

  it('catches emails and phone numbers in fields it has never seen', () => {
    // a note field nobody catalogued still must not leak
    const out = scrub({ someNewField: 'โทร 089-123-4567 อีเมล owner@shop.co.th' }) as {
      someNewField: string;
    };
    expect(out.someNewField).not.toContain('089-123-4567');
    expect(out.someNewField).not.toContain('owner@shop.co.th');
    expect(out.someNewField).toContain('example.com');
  });

  it('handles the Thai phone formats people actually write', () => {
    for (const phone of ['089-123-4567', '02-123-4567', '+66 81 234 5678', '081 234 5678']) {
      const out = scrub({ note: `ติดต่อ ${phone} ครับ` }) as { note: string };
      expect(out.note, phone).not.toContain(phone);
    }
  });

  it('a number written as 10 straight digits is caught by the id sweep instead', () => {
    const out = scrub({ note: 'call 0812345678 now' }) as { note: string };
    expect(out.note).not.toContain('0812345678');
  });
});

describe('structure preservation', () => {
  it('keeps shape, key order and array lengths so fixtures still exercise parsers', () => {
    const out = scrub([row, row]) as unknown[];
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(2);
    expect(Object.keys(out[0] as object)).toEqual(Object.keys(row));
  });

  it('passes through nulls, booleans and numbers', () => {
    expect(scrub({ a: null, b: true, c: 1.5 })).toEqual({ a: null, b: true, c: 1.5 });
  });
});

describe('report', () => {
  it('counts what it replaced so the user can sanity-check before committing', () => {
    const scrubber = createScrubber();
    scrubber.scrub(row);
    const report = scrubber.report();
    expect(report.ids).toBeGreaterThan(0);
    expect(report.names).toBe(1);
  });
});

describe('findLeaks', () => {
  it('catches a real customer id that survived, in either format', () => {
    expect(findLeaks('{"x":"9876543210"}', { customerIds: ['987-654-3210'] })).toHaveLength(1);
    expect(findLeaks('{"x":"9876543210"}', { customerIds: ['9876543210'] })).toHaveLength(1);
  });

  it('catches a surviving account name', () => {
    const leaks = findLeaks('{"n":"AIS 12Call"}', { accountNames: ['AIS 12Call'] });
    expect(leaks[0]).toContain('ชื่อบัญชีจริง');
  });

  it('catches a surviving email but accepts the placeholder', () => {
    expect(findLeaks('{"e":"real@person.com"}')).toHaveLength(1);
    expect(findLeaks('{"e":"someone@example.com"}')).toEqual([]);
  });

  it('reports nothing for scrubbed output', () => {
    const serialized = JSON.stringify(scrub(row));
    expect(
      findLeaks(serialized, {
        customerIds: ['9876543210'],
        accountNames: ['Search - ล้างแอร์ ภูเก็ต'],
      }),
    ).toEqual([]);
  });
});

describe('numbers that are not phone numbers', () => {
  it('leaves a budget in micros intact', () => {
    // 1080000000 contains 080000000, which looked like a phone number and turned
    // ฿1,080 into the unparseable string "1080-000-0000"
    const out = scrub({ campaignBudget: { amountMicros: '1080000000' } }) as {
      campaignBudget: { amountMicros: string };
    };
    expect(out.campaignBudget.amountMicros).toMatch(/^\d+$/);
    expect(out.campaignBudget.amountMicros).not.toContain('-');
  });

  it('never leaves a dash inside any value that arrived as pure digits', () => {
    const input = {
      a: { amountMicros: '1080000000' },
      b: { costMicros: '8420500000' },
      c: { targetCpaMicros: '250000000' },
      d: { someNumber: '0812345678' },
    };
    for (const value of Object.values(scrub(input) as Record<string, Record<string, string>>)) {
      const [only] = Object.values(value);
      expect(only).toMatch(/^\d+$/);
    }
  });

  it('does not corrupt the fake ids it just generated', () => {
    // the id sweep runs first, so a later phone sweep must not rewrite its output
    const out = scrub({ metrics: { costMicros: '1000000004' } }) as {
      metrics: { costMicros: string };
    };
    expect(out.metrics.costMicros).toMatch(/^\d+$/);
  });

  it('still catches a real phone number surrounded by text', () => {
    const out = scrub({ note: 'โทร 089-123-4567 ครับ' }) as { note: string };
    expect(out.note).not.toContain('089-123-4567');
  });
});

/**
 * These assert exact values, not shapes. The earlier round of phone-mangling
 * tests above checks `/^\d+$/`, which a substituted id like `1000000003`
 * satisfies perfectly — so they passed while every budget in the fixtures was
 * quietly being replaced.
 */
describe('scrub — measurements survive verbatim', () => {
  it('keeps a budget in micros exactly as it arrived', () => {
    const out = scrub({
      campaignBudget: { amountMicros: '1080000000', explicitlyShared: false },
    }) as { campaignBudget: { amountMicros: string } };
    expect(out.campaignBudget.amountMicros).toBe('1080000000');
  });

  it('keeps every metric under `metrics`, however many digits', () => {
    const out = scrub({
      metrics: {
        clicks: '412',
        impressions: '184503',
        costMicros: '2345670000',
        conversions: 88.5,
        ctr: 0.0223,
        averageCpc: 5692889,
      },
    }) as { metrics: Record<string, unknown> };
    expect(out.metrics).toEqual({
      clicks: '412',
      impressions: '184503',
      costMicros: '2345670000',
      conversions: 88.5,
      ctr: 0.0223,
      averageCpc: 5692889,
    });
  });

  it('keeps bids and targets, which live outside `metrics`', () => {
    const out = scrub({
      adGroupCriterion: { cpcBidMicros: '12500000', effectiveCpcBidMicros: '12500000' },
      campaign: { targetSpend: { cpcBidCeilingMicros: '45000000' } },
    }) as Record<string, Record<string, unknown>>;
    expect(out['adGroupCriterion']).toEqual({
      cpcBidMicros: '12500000',
      effectiveCpcBidMicros: '12500000',
    });
    expect(out['campaign']?.['targetSpend']).toEqual({ cpcBidCeilingMicros: '45000000' });
  });

  it('still replaces ids that happen to sit beside a measurement', () => {
    const out = scrub({
      campaign: { id: '22334455', resourceName: 'customers/9876543210/campaigns/22334455' },
      metrics: { costMicros: '22334455000' },
    }) as { campaign: { id: string }; metrics: { costMicros: string } };
    expect(out.campaign.id).not.toBe('22334455');
    expect(out.metrics.costMicros).toBe('22334455000');
  });
});

describe('findMeasurementChanges', () => {
  const before = {
    campaign: { id: '22334455', name: 'Search - แบรนด์' },
    campaignBudget: { amountMicros: '1080000000' },
    metrics: { clicks: '412', costMicros: '2345670000' },
  };

  it('passes a scrub that only touched catalogued keys', () => {
    expect(findMeasurementChanges(before, scrub(before))).toEqual([]);
  });

  it('catches a measurement that was rewritten', () => {
    const after = structuredClone(before);
    after.campaignBudget.amountMicros = '1000000003';
    const problems = findMeasurementChanges(before, after);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('amountMicros');
    expect(problems[0]).toContain('1080000000');
  });

  it('catches the mangled form the phone sweep produced', () => {
    const after = structuredClone(before);
    (after.campaignBudget as { amountMicros: string }).amountMicros = '1080-000-0000';
    expect(findMeasurementChanges(before, after)).toHaveLength(1);
  });

  it('catches rows going missing', () => {
    expect(findMeasurementChanges([before, before], [before])[0]).toContain('จำนวนแถว');
  });

  it('ignores names and text, which are meant to change', () => {
    const after = structuredClone(before);
    after.campaign.name = 'name-1';
    expect(findMeasurementChanges(before, after)).toEqual([]);
  });
});
