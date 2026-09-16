import { describe, expect, it } from 'vitest';
import {
  assertCustomerId,
  formatCustomerId,
  isCustomerId,
  normalizeCustomerId,
} from '../../scripts/lib/customer-id';

describe('normalizeCustomerId', () => {
  it('strips the dashes and spaces copied from the Google Ads UI', () => {
    expect(normalizeCustomerId('123-456-7890')).toBe('1234567890');
    expect(normalizeCustomerId(' 123 456 7890 ')).toBe('1234567890');
  });
});

describe('isCustomerId', () => {
  it('accepts 10 digits in either form', () => {
    expect(isCustomerId('1234567890')).toBe(true);
    expect(isCustomerId('123-456-7890')).toBe(true);
  });

  it('rejects wrong lengths and non-digits', () => {
    expect(isCustomerId('123456789')).toBe(false);
    expect(isCustomerId('12345678901')).toBe(false);
    expect(isCustomerId('123456789a')).toBe(false);
    expect(isCustomerId('')).toBe(false);
  });
});

describe('assertCustomerId', () => {
  it('returns the normalized id', () => {
    expect(assertCustomerId('123-456-7890', 'Customer ID')).toBe('1234567890');
  });

  it('names the offending setting in the error', () => {
    expect(() => assertCustomerId('nope', 'LOGIN_CUSTOMER_ID')).toThrow(/LOGIN_CUSTOMER_ID/);
  });
});

describe('formatCustomerId', () => {
  it('formats to the 123-456-7890 display form', () => {
    expect(formatCustomerId('1234567890')).toBe('123-456-7890');
  });

  it('passes through anything that is not a customer id', () => {
    expect(formatCustomerId('nope')).toBe('nope');
  });
});
