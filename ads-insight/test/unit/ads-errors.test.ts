import { describe, expect, it } from 'vitest';
import { AdsApiError, describeFailure, isRetryable, parseFailure } from '../../src/ads/errors';

/** The shape Google actually returns for a GoogleAdsFailure. */
function failureBody(
  errors: { message?: string; errorCode?: Record<string, string>; location?: unknown }[],
  extra: { status?: string; message?: string; requestId?: string } = {},
): string {
  return JSON.stringify({
    error: {
      code: 400,
      message: extra.message ?? 'Request contains an invalid argument.',
      status: extra.status ?? 'INVALID_ARGUMENT',
      details: [
        {
          '@type': 'type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure',
          requestId: extra.requestId,
          errors,
        },
      ],
    },
  });
}

describe('parseFailure', () => {
  it('extracts code group, code, message and request id', () => {
    const body = failureBody(
      [
        {
          message: "User doesn't have permission to access customer.",
          errorCode: { authorizationError: 'USER_PERMISSION_DENIED' },
        },
      ],
      { requestId: 'abc123' },
    );
    const failure = parseFailure(403, body);
    expect(failure.details).toHaveLength(1);
    expect(failure.details[0]).toMatchObject({
      codeGroup: 'authorizationError',
      code: 'USER_PERMISSION_DENIED',
    });
    expect(failure.requestId).toBe('abc123');
    expect(failure.statusName).toBe('INVALID_ARGUMENT');
  });

  it('flattens the field path so the message can point at the operation', () => {
    const body = failureBody([
      {
        message: 'Too low.',
        errorCode: { campaignBudgetError: 'INVALID_BUDGET_AMOUNT' },
        location: {
          fieldPathElements: [
            { fieldName: 'operations', index: 0 },
            { fieldName: 'create' },
            { fieldName: 'amountMicros' },
          ],
        },
      },
    ]);
    expect(parseFailure(400, body).details[0]?.fieldPath).toBe('operations[0].create.amountMicros');
  });

  it('collects every error, not just the first', () => {
    const body = failureBody([
      { errorCode: { fieldError: 'REQUIRED' } },
      { errorCode: { stringLengthError: 'TOO_LONG' } },
    ]);
    expect(parseFailure(400, body).details).toHaveLength(2);
  });

  it('survives a non-JSON body from a proxy', () => {
    const failure = parseFailure(502, '<html>Bad Gateway</html>');
    expect(failure.details).toEqual([]);
    expect(failure.message).toContain('Bad Gateway');
  });

  it('survives an empty body', () => {
    expect(parseFailure(503, '').details).toEqual([]);
  });

  it('handles the envelope arriving wrapped in an array', () => {
    const body = `[${failureBody([{ errorCode: { internalError: 'INTERNAL_ERROR' } }])}]`;
    expect(parseFailure(500, body).details[0]?.code).toBe('INTERNAL_ERROR');
  });
});

describe('isRetryable', () => {
  it('retries transient server failures', () => {
    for (const status of [408, 500, 502, 503, 504]) {
      expect(isRetryable({ status, details: [] })).toBe(true);
    }
  });

  it('does not retry a request that was simply wrong', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(isRetryable({ status, details: [] })).toBe(false);
    }
  });

  it('separates a momentary rate limit from the daily quota being gone', () => {
    // both arrive as HTTP 429; only one of them recovers within seconds
    const rateLimited = parseFailure(
      429,
      failureBody([{ errorCode: { quotaError: 'RESOURCE_TEMPORARILY_EXHAUSTED' } }]),
    );
    const outOfQuota = parseFailure(
      429,
      failureBody([{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' } }]),
    );
    expect(isRetryable(rateLimited)).toBe(true);
    expect(isRetryable(outOfQuota)).toBe(false);
  });

  it('treats an unlabelled 429 as a rate limit', () => {
    expect(isRetryable({ status: 429, details: [] })).toBe(true);
  });

  it('retries a concurrent modification', () => {
    const failure = parseFailure(
      400,
      failureBody([{ errorCode: { databaseError: 'CONCURRENT_MODIFICATION' } }]),
    );
    expect(isRetryable(failure)).toBe(true);
  });

  it('does not retry a permission problem even on a retryable-looking status', () => {
    const failure = parseFailure(
      503,
      failureBody([{ errorCode: { authorizationError: 'USER_PERMISSION_DENIED' } }]),
    );
    expect(isRetryable(failure)).toBe(false);
  });
});

describe('describeFailure', () => {
  it('leads with an actionable explanation, not Google’s wording', () => {
    const message = describeFailure(
      parseFailure(403, failureBody([{ errorCode: { authorizationError: 'USER_PERMISSION_DENIED' } }])),
    );
    expect(message).toContain('LOGIN_CUSTOMER_ID');
    expect(message).toContain('USER_PERMISSION_DENIED');
  });

  it('tells the user quota is gone for the day rather than "try again"', () => {
    const message = describeFailure(
      parseFailure(429, failureBody([{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' } }])),
    );
    expect(message).toContain('โควตา');
    expect(message).toContain('Basic');
  });

  it('falls back to a status explanation when the code is unknown', () => {
    const message = describeFailure(
      parseFailure(400, failureBody([{ errorCode: { someNewError: 'NEVER_SEEN_BEFORE' } }])),
    );
    expect(message).toContain('ไม่ถูกต้อง');
    expect(message).toContain('NEVER_SEEN_BEFORE');
  });

  it('always states the HTTP status and request id for support', () => {
    const message = describeFailure(
      parseFailure(500, failureBody([{ errorCode: { internalError: 'INTERNAL_ERROR' } }], { requestId: 'req-9' })),
    );
    expect(message).toContain('HTTP 500');
    expect(message).toContain('req-9');
  });
});

describe('AdsApiError', () => {
  it('keeps the raw body for error_json while exposing a readable message', () => {
    const body = failureBody([{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' } }]);
    const error = AdsApiError.fromResponse(429, body);
    expect(error.raw).toBe(body);
    expect(error.message).toContain('โควตา');
    expect(error.retryable).toBe(false);
    expect(error.codes).toEqual(['RESOURCE_EXHAUSTED']);
    expect(error).toBeInstanceOf(Error);
  });

  it('marks a transient failure retryable', () => {
    const error = AdsApiError.fromResponse(503, '');
    expect(error.retryable).toBe(true);
  });
});
