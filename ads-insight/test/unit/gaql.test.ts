import { describe, expect, it } from 'vitest';
import {
  assertField,
  assertLimit,
  assertResource,
  buildQuery,
  GaqlError,
  quote,
  validateRawGaql,
  where,
} from '../../src/ads/gaql';

describe('quote', () => {
  it('wraps a plain value in single quotes', () => {
    expect(quote('เสื้อยืด')).toBe("'เสื้อยืด'");
  });

  it('escapes quotes so a value cannot end the literal early', () => {
    // a search term really can contain an apostrophe
    expect(quote("men's shoes")).toBe("'men\\'s shoes'");
  });

  it('escapes backslashes before quotes, so an escaped backslash cannot arm the next quote', () => {
    expect(quote('a\\')).toBe("'a\\\\'");
    expect(quote("a\\'b")).toBe("'a\\\\\\'b'");
  });
});

describe('assertField', () => {
  it('accepts normal field references', () => {
    expect(assertField('campaign.name')).toBe('campaign.name');
    expect(assertField('metrics.cost_micros')).toBe('metrics.cost_micros');
    expect(assertField('ad_group_criterion.quality_info.quality_score')).toBeTruthy();
  });

  it('rejects anything that is not a bare field reference', () => {
    for (const bad of [
      'campaign',
      'campaign.name; DROP',
      'campaign.name OR 1=1',
      'Campaign.Name',
      '(SELECT 1)',
      'campaign..name',
      '',
      ' campaign.name',
    ]) {
      expect(() => assertField(bad)).toThrow(GaqlError);
    }
  });

  it('rejects a resource that is not on the allowlist', () => {
    expect(() => assertField('billing_setup.id')).toThrow(/ไม่อยู่ในรายการที่อนุญาต/);
  });
});

describe('assertResource', () => {
  it('accepts allowlisted resources and rejects others', () => {
    expect(assertResource('search_term_view')).toBe('search_term_view');
    expect(() => assertResource('billing_setup')).toThrow(GaqlError);
    expect(() => assertResource('campaign; DROP')).toThrow(GaqlError);
  });
});

describe('where builders', () => {
  it('quotes string values', () => {
    expect(where.eq('campaign.status', 'ENABLED')).toBe("campaign.status = 'ENABLED'");
  });

  it('keeps numbers and booleans unquoted', () => {
    expect(where.gt('metrics.clicks', 10)).toBe('metrics.clicks > 10');
    expect(where.eq('campaign.experiment_type', true)).toBe('campaign.experiment_type = TRUE');
  });

  it('neutralises a value crafted to break out of the literal', () => {
    // exactly the shape SPEC §5.4 warns about: account data used as a value
    const hostile = "x' OR campaign.id != '0";
    const clause = where.eq('campaign.name', hostile);
    expect(clause).toBe("campaign.name = 'x\\' OR campaign.id != \\'0'");
    // the injected quote is escaped, so the condition stays a single literal
    expect(clause.match(/(?<!\\)'/g)).toHaveLength(2);
  });

  it('builds IN lists and refuses empty ones', () => {
    expect(where.in('campaign.id', ['1', '2'])).toBe("campaign.id IN ('1', '2')");
    expect(() => where.in('campaign.id', [])).toThrow(GaqlError);
  });

  it('validates DURING against the keyword list', () => {
    expect(where.during('segments.date', 'LAST_30_DAYS')).toBe(
      'segments.date DURING LAST_30_DAYS',
    );
    expect(() => where.during('segments.date', 'LAST_31_DAYS')).toThrow(GaqlError);
    expect(() => where.during('segments.date', "X' OR '1")).toThrow(GaqlError);
  });

  it('validates BETWEEN dates', () => {
    expect(where.between('segments.date', '2026-09-01', '2026-09-30')).toBe(
      "segments.date BETWEEN '2026-09-01' AND '2026-09-30'",
    );
    expect(() => where.between('segments.date', '01/09/2026', '2026-09-30')).toThrow(GaqlError);
  });

  it('wraps contains in percent signs and still escapes', () => {
    expect(where.contains('search_term_view.search_term', "o'clock")).toBe(
      "search_term_view.search_term LIKE '%o\\'clock%'",
    );
  });
});

describe('buildQuery', () => {
  it('composes a full query', () => {
    const query = buildQuery({
      select: ['campaign.id', 'campaign.name', 'metrics.cost_micros'],
      from: 'campaign',
      where: [where.during('segments.date', 'LAST_30_DAYS'), where.gt('metrics.impressions', 0)],
      orderBy: [{ field: 'metrics.cost_micros' }],
      limit: 50,
    });
    expect(query).toBe(
      'SELECT campaign.id, campaign.name, metrics.cost_micros FROM campaign ' +
        'WHERE segments.date DURING LAST_30_DAYS AND metrics.impressions > 0 ' +
        'ORDER BY metrics.cost_micros DESC LIMIT 50',
    );
  });

  it('omits empty clauses', () => {
    expect(buildQuery({ select: ['customer.id'], from: 'customer' })).toBe(
      'SELECT customer.id FROM customer',
    );
  });

  it('defaults ordering to DESC but honours ASC', () => {
    const query = buildQuery({
      select: ['campaign.id'],
      from: 'campaign',
      orderBy: [{ field: 'campaign.name', direction: 'ASC' }],
    });
    expect(query).toContain('ORDER BY campaign.name ASC');
  });

  it('validates every field, not just the first', () => {
    expect(() =>
      buildQuery({ select: ['campaign.id', 'billing_setup.id'], from: 'campaign' }),
    ).toThrow(GaqlError);
  });

  it('rejects an empty select and a bad resource', () => {
    expect(() => buildQuery({ select: [], from: 'campaign' })).toThrow(GaqlError);
    expect(() => buildQuery({ select: ['customer.id'], from: 'billing_setup' })).toThrow(GaqlError);
  });
});

describe('assertLimit', () => {
  it('accepts a sane limit and caps at 1000', () => {
    expect(assertLimit(50)).toBe(50);
    expect(assertLimit(1000)).toBe(1000);
    expect(() => assertLimit(1001)).toThrow(/1000/);
    expect(() => assertLimit(0)).toThrow(GaqlError);
    expect(() => assertLimit(-5)).toThrow(GaqlError);
    expect(() => assertLimit(1.5)).toThrow(GaqlError);
  });
});

describe('validateRawGaql', () => {
  const valid = 'SELECT campaign.id, campaign.name FROM campaign LIMIT 10';

  it('accepts a well-formed read-only query', () => {
    expect(validateRawGaql(valid)).toBe(valid);
  });

  it('strips a trailing semicolon but refuses a second statement', () => {
    expect(validateRawGaql(`${valid};`)).toBe(valid);
    expect(() => validateRawGaql(`${valid}; SELECT customer.id FROM customer LIMIT 1`)).toThrow(
      /หลายคำสั่ง/,
    );
  });

  it('refuses anything that is not a SELECT', () => {
    for (const bad of [
      'UPDATE campaign SET name = "x"',
      'DELETE FROM campaign',
      '  \n  INSERT INTO campaign VALUES (1)',
      '',
      '   ',
    ]) {
      expect(() => validateRawGaql(bad)).toThrow(GaqlError);
    }
  });

  it('enforces the allowlist on both fields and the resource', () => {
    expect(() => validateRawGaql('SELECT billing_setup.id FROM billing_setup LIMIT 1')).toThrow(
      GaqlError,
    );
    expect(() => validateRawGaql('SELECT campaign.id FROM billing_setup LIMIT 1')).toThrow(
      GaqlError,
    );
  });

  it('requires a LIMIT and caps it', () => {
    expect(() => validateRawGaql('SELECT campaign.id FROM campaign')).toThrow(/LIMIT/);
    expect(() => validateRawGaql('SELECT campaign.id FROM campaign LIMIT 5000')).toThrow(/1000/);
  });

  it('can add the cap itself when asked', () => {
    expect(
      validateRawGaql('SELECT campaign.id FROM campaign', { addLimitIfMissing: true }),
    ).toBe('SELECT campaign.id FROM campaign LIMIT 1000');
  });

  it('honours a stricter cap from the caller', () => {
    expect(() => validateRawGaql(valid, { maxLimit: 5 })).toThrow(/5/);
  });

  it('accepts multi-line queries with a WHERE clause', () => {
    const query = [
      'SELECT campaign.id, metrics.cost_micros',
      'FROM campaign',
      "WHERE segments.date DURING LAST_30_DAYS",
      'LIMIT 25',
    ].join('\n');
    expect(validateRawGaql(query)).toContain('LIMIT 25');
  });
});
