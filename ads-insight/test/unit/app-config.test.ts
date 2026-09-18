import { describe, expect, it } from 'vitest';
import { configReport, ownerEmails, parseConfig } from '../../src/config';

const base: Record<string, string> = {
  ENV: 'dev',
  ACCOUNT_TZ: 'Asia/Bangkok',
  ADS_API_VERSION: 'v25',
  DEFAULT_CUSTOMER_ID: '1234567890',
  LOGIN_CUSTOMER_ID: '',
  TEST_CUSTOMER_ID: '',
  GOOGLE_OAUTH_CLIENT_ID: 'client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
  GOOGLE_ADS_REFRESH_TOKEN: 'refresh-token',
  OWNER_EMAILS: 'Owner@Example.com, second@example.com',
  TOKEN_ENC_KEY: 'key',
  SESSION_SECRET: 'secret',
};

describe('parseConfig', () => {
  it('accepts a fully configured environment', () => {
    expect(parseConfig(base).DEFAULT_CUSTOMER_ID).toBe('1234567890');
  });

  it('allows customer ids to be blank before M0 fills them in', () => {
    expect(parseConfig({ ...base, DEFAULT_CUSTOMER_ID: '' }).DEFAULT_CUSTOMER_ID).toBe('');
  });

  it('rejects a customer id with dashes, naming the field', () => {
    expect(() => parseConfig({ ...base, DEFAULT_CUSTOMER_ID: '123-456-7890' })).toThrow(
      /DEFAULT_CUSTOMER_ID/,
    );
  });

  it('rejects a malformed API version', () => {
    expect(() => parseConfig({ ...base, ADS_API_VERSION: '25' })).toThrow(/ADS_API_VERSION/);
  });

  it('reports every missing secret at once rather than the first', () => {
    expect(() => parseConfig({ ...base, TOKEN_ENC_KEY: '', SESSION_SECRET: '' })).toThrow(
      /TOKEN_ENC_KEY[\s\S]*SESSION_SECRET/,
    );
  });
});

describe('ownerEmails', () => {
  it('splits, trims and lowercases the allowlist', () => {
    expect(ownerEmails(parseConfig(base))).toEqual(['owner@example.com', 'second@example.com']);
  });

  it('drops empty entries from a trailing comma', () => {
    expect(ownerEmails({ OWNER_EMAILS: 'a@b.com, ,' })).toEqual(['a@b.com']);
  });
});

describe('configReport', () => {
  it('reports presence only, never values', () => {
    const report = configReport(base);
    expect(report['GOOGLE_OAUTH_CLIENT_ID']).toBe(true);
    expect(report['TEST_CUSTOMER_ID']).toBe(false);
    expect(report['DEV_BEARER_TOKEN']).toBe(false);
    expect(Object.values(report).every((v) => typeof v === 'boolean')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('client-secret');
  });
});
