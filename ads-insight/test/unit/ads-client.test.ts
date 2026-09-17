import { describe, expect, it } from 'vitest';
import { AdsApiError } from '../../src/ads/errors';
import {
  backoffDelay,
  createAdsClient,
  DEFAULT_RETRY,
  flattenSearchStream,
  type AdsClientDeps,
} from '../../src/ads/client';

interface Call {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A fetch stand-in that replays queued responses and records what it got. */
function fakeFetch(responses: { status: number; body: string }[]) {
  const calls: Call[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? '{}')),
    });
    const next = responses.shift() ?? { status: 500, body: '' };
    return new Response(next.body, { status: next.status });
  };
  return { fn: fn as unknown as typeof fetch, calls };
}

function ok(rows: Record<string, unknown>[]): { status: number; body: string } {
  return { status: 200, body: JSON.stringify([{ results: rows, fieldMask: 'campaign.id' }]) };
}

function client(
  responses: { status: number; body: string }[],
  overrides: Partial<AdsClientDeps> = {},
) {
  const fetcher = fakeFetch(responses);
  const slept: number[] = [];
  const instance = createAdsClient({
    apiVersion: 'v25',
    getAccessToken: async () => 'test-token',
    fetch: fetcher.fn,
    sleep: async (ms) => {
      slept.push(ms);
    },
    random: () => 1, // full jitter at its maximum, so delays are predictable
    ...overrides,
  });
  return { instance, calls: fetcher.calls, slept };
}

const QUERY = 'SELECT campaign.id FROM campaign LIMIT 10';

describe('search', () => {
  it('posts to the versioned searchStream endpoint with a bearer token', async () => {
    const { instance, calls } = client([ok([{ campaign: { id: '1' } }])]);
    const rows = await instance.search('1234567890', QUERY);

    expect(rows).toEqual([{ campaign: { id: '1' } }]);
    expect(calls[0]?.url).toBe(
      'https://googleads.googleapis.com/v25/customers/1234567890/googleAds:searchStream',
    );
    expect(calls[0]?.headers['authorization']).toBe('Bearer test-token');
    expect(calls[0]?.body).toEqual({ query: QUERY });
  });

  it('sends login-customer-id only when there is one', async () => {
    const without = client([ok([])]);
    await without.instance.search('1234567890', QUERY);
    expect(without.calls[0]?.headers['login-customer-id']).toBeUndefined();

    const withMcc = client([ok([])], { loginCustomerId: '1111111111' });
    await withMcc.instance.search('1234567890', QUERY);
    expect(withMcc.calls[0]?.headers['login-customer-id']).toBe('1111111111');
  });

  it('lets a call override the client-level login-customer-id', async () => {
    const { instance, calls } = client([ok([])], { loginCustomerId: '1111111111' });
    await instance.search('1234567890', QUERY, { loginCustomerId: '2222222222' });
    expect(calls[0]?.headers['login-customer-id']).toBe('2222222222');
  });

  it('accepts a dashed customer id and normalises it', async () => {
    const { instance, calls } = client([ok([])]);
    await instance.search('123-456-7890', QUERY);
    expect(calls[0]?.url).toContain('/customers/1234567890/');
  });

  it('rejects a malformed customer id before making a request', async () => {
    const { instance, calls } = client([ok([])]);
    await expect(instance.search('123', QUERY)).rejects.toThrow(/Customer ID/);
    expect(calls).toHaveLength(0);
  });

  it('validates untrusted queries and adds the missing LIMIT', async () => {
    const { instance, calls } = client([ok([])]);
    await instance.search('1234567890', 'SELECT campaign.id FROM campaign');
    expect(calls[0]?.body).toEqual({ query: 'SELECT campaign.id FROM campaign LIMIT 1000' });
  });

  it('refuses a non-SELECT query without calling the API', async () => {
    const { instance, calls } = client([ok([])]);
    await expect(instance.search('1234567890', 'DELETE FROM campaign')).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it('skips validation for queries this codebase built', async () => {
    const { instance, calls } = client([ok([])]);
    // billing_setup is off the allowlist; trusted callers bypass that check
    await instance.search('1234567890', 'SELECT billing_setup.id FROM billing_setup', {
      trusted: true,
    });
    expect(calls).toHaveLength(1);
  });

  it('concatenates rows across stream chunks', async () => {
    const body = JSON.stringify([
      { results: [{ campaign: { id: '1' } }] },
      { results: [{ campaign: { id: '2' } }] },
      { fieldMask: 'campaign.id' },
    ]);
    const { instance } = client([{ status: 200, body }]);
    expect(await instance.search('1234567890', QUERY)).toHaveLength(2);
  });

  it('treats an empty body as no rows', async () => {
    const { instance } = client([{ status: 200, body: '' }]);
    expect(await instance.search('1234567890', QUERY)).toEqual([]);
  });
});

describe('retry', () => {
  it('retries a transient failure and returns the eventual success', async () => {
    const { instance, calls, slept } = client([
      { status: 503, body: '' },
      { status: 503, body: '' },
      ok([{ campaign: { id: '1' } }]),
    ]);
    expect(await instance.search('1234567890', QUERY)).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(slept).toEqual([500, 1000]); // base, then doubled
  });

  it('gives up after maxRetries and throws the last error', async () => {
    const { instance, calls } = client(
      Array.from({ length: 5 }, () => ({ status: 503, body: '' })),
      { retry: { maxRetries: 2 } },
    );
    await expect(instance.search('1234567890', QUERY)).rejects.toBeInstanceOf(AdsApiError);
    expect(calls).toHaveLength(3); // first attempt plus two retries
  });

  it('does not retry a request that was simply wrong', async () => {
    const { instance, calls } = client([
      { status: 403, body: JSON.stringify({ error: { message: 'no' } }) },
    ]);
    await expect(instance.search('1234567890', QUERY)).rejects.toBeInstanceOf(AdsApiError);
    expect(calls).toHaveLength(1);
  });

  it('does not retry once the daily quota is gone', async () => {
    // retrying this before tomorrow cannot help, so it must fail fast
    const body = JSON.stringify({
      error: {
        code: 429,
        details: [{ errors: [{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' } }] }],
      },
    });
    const { instance, calls } = client([{ status: 429, body }]);
    await expect(instance.search('1234567890', QUERY)).rejects.toThrow(/โควตา/);
    expect(calls).toHaveLength(1);
  });

  it('retries a momentary rate limit', async () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        details: [{ errors: [{ errorCode: { quotaError: 'RESOURCE_TEMPORARILY_EXHAUSTED' } }] }],
      },
    });
    const { instance, calls } = client([{ status: 429, body }, ok([])]);
    await instance.search('1234567890', QUERY);
    expect(calls).toHaveLength(2);
  });

  it('can be disabled entirely', async () => {
    const { instance, calls } = client([{ status: 503, body: '' }], { retry: { maxRetries: 0 } });
    await expect(instance.search('1234567890', QUERY)).rejects.toBeInstanceOf(AdsApiError);
    expect(calls).toHaveLength(1);
  });

  it('asks for a fresh token on every attempt', async () => {
    let issued = 0;
    const { instance, calls } = client([{ status: 503, body: '' }, ok([])], {
      getAccessToken: async () => `token-${++issued}`,
    });
    await instance.search('1234567890', QUERY);
    expect(calls.map((c) => c.headers['authorization'])).toEqual([
      'Bearer token-1',
      'Bearer token-2',
    ]);
  });
});

describe('quota counting', () => {
  it('counts every attempt, including retries, because each one costs quota', async () => {
    const seen: number[] = [];
    const { instance } = client([{ status: 503, body: '' }, ok([])], {
      onOps: (used) => seen.push(used),
    });
    await instance.search('1234567890', QUERY);
    expect(seen).toEqual([1, 2]);
    expect(instance.opsUsed()).toBe(2);
  });

  it('keeps counting across calls', async () => {
    const { instance } = client([ok([]), ok([])]);
    await instance.search('1234567890', QUERY);
    await instance.search('1234567890', QUERY);
    expect(instance.opsUsed()).toBe(2);
  });
});

describe('mutate', () => {
  const op = [{ campaignOperation: { update: { resourceName: 'customers/1/campaigns/2' } } }];

  it('defaults to validateOnly, so a caller must ask to touch a real account', async () => {
    const { instance, calls } = client([{ status: 200, body: '{}' }]);
    await instance.mutate('1234567890', op);
    expect(calls[0]?.body).toMatchObject({ validateOnly: true, partialFailure: false });
    expect(calls[0]?.url).toContain('googleAds:mutate');
  });

  it('applies for real only when explicitly told to', async () => {
    const { instance, calls } = client([{ status: 200, body: '{}' }]);
    await instance.mutate('1234567890', op, { validateOnly: false });
    expect(calls[0]?.body).toMatchObject({ validateOnly: false });
  });

  it('refuses an empty operation list', async () => {
    const { instance, calls } = client([{ status: 200, body: '{}' }]);
    await expect(instance.mutate('1234567890', [])).rejects.toThrow(/operation/);
    expect(calls).toHaveLength(0);
  });
});

describe('backoffDelay', () => {
  it('doubles each attempt up to the ceiling', () => {
    const at = (attempt: number) => backoffDelay(attempt, DEFAULT_RETRY, () => 1);
    expect(at(0)).toBe(500);
    expect(at(1)).toBe(1000);
    expect(at(2)).toBe(2000);
    expect(at(10)).toBe(DEFAULT_RETRY.maxDelayMs);
  });

  it('spreads retries out with jitter so simultaneous failures do not resynchronise', () => {
    expect(backoffDelay(2, DEFAULT_RETRY, () => 0)).toBe(0);
    expect(backoffDelay(2, DEFAULT_RETRY, () => 0.5)).toBe(1000);
    expect(backoffDelay(2, DEFAULT_RETRY, () => 1)).toBe(2000);
  });
});

describe('flattenSearchStream', () => {
  it('handles chunk arrays, single objects and missing results', () => {
    expect(flattenSearchStream([{ results: [1, 2] }, { results: [3] }])).toEqual([1, 2, 3]);
    expect(flattenSearchStream({ results: [1] })).toEqual([1]);
    expect(flattenSearchStream([{ fieldMask: 'x' }])).toEqual([]);
    expect(flattenSearchStream([])).toEqual([]);
  });
});
