import { describe, expect, it } from 'vitest';
import { explainAdsError, flattenSearchStream } from '../../scripts/lib/ads-rest';
import { explainOAuthError } from '../../scripts/lib/google-auth';

describe('flattenSearchStream', () => {
  it('concatenates results across chunks', () => {
    const payload = [
      { results: [{ customer: { id: '1' } }], fieldMask: 'customer.id' },
      { results: [{ customer: { id: '2' } }], fieldMask: 'customer.id' },
    ];
    expect(flattenSearchStream(payload)).toEqual([
      { customer: { id: '1' } },
      { customer: { id: '2' } },
    ]);
  });

  it('treats a chunk with no results as empty', () => {
    expect(flattenSearchStream([{ fieldMask: 'customer.id' }])).toEqual([]);
  });

  it('accepts a single non-array chunk', () => {
    expect(flattenSearchStream({ results: [{ customer: { id: '1' } }] })).toEqual([
      { customer: { id: '1' } },
    ]);
  });
});

describe('explainAdsError', () => {
  it('pulls the message and error code out of a GoogleAdsFailure', () => {
    const body = JSON.stringify({
      error: {
        code: 403,
        message: 'The caller does not have permission',
        details: [
          {
            '@type': 'type.googleapis.com/google.ads.googleads.v25.errors.GoogleAdsFailure',
            errors: [
              {
                message: "User doesn't have permission to access customer.",
                errorCode: { authorizationError: 'USER_PERMISSION_DENIED' },
              },
            ],
          },
        ],
      },
    });
    const explained = explainAdsError(403, body);
    expect(explained).toContain('403');
    expect(explained).toContain('USER_PERMISSION_DENIED');
    expect(explained).toContain('LOGIN_CUSTOMER_ID');
  });

  it('degrades gracefully on a non-JSON body', () => {
    const explained = explainAdsError(500, '<html>upstream exploded</html>');
    expect(explained).toContain('500');
    expect(explained).toContain('upstream exploded');
  });
});

describe('explainOAuthError', () => {
  it('explains invalid_grant in terms of the fix', () => {
    const explained = explainOAuthError(400, JSON.stringify({ error: 'invalid_grant' }));
    expect(explained).toContain('invalid_grant');
    expect(explained).toContain('pnpm auth:google');
  });

  it('falls back to the description for unknown codes', () => {
    const explained = explainOAuthError(
      400,
      JSON.stringify({ error: 'weird_thing', error_description: 'something specific' }),
    );
    expect(explained).toContain('something specific');
  });
});
