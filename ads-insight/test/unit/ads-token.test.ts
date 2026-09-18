import { describe, expect, it, vi } from 'vitest';
import {
  cachedAccessTokenProvider,
  refreshGoogleAdsAccessToken,
  TokenRefreshError,
} from '../../src/ads/token';

const creds = { clientId: 'client-1', clientSecret: 'shh', refreshToken: 'refresh-1' };

function fakeFetch(responses: { status: number; body: string }[]) {
  const calls: RequestInit[] = [];
  const fn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    const next = responses.shift() ?? { status: 500, body: '' };
    return new Response(next.body, { status: next.status });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('refreshGoogleAdsAccessToken', () => {
  it('posts the refresh_token grant with the given credentials', async () => {
    const { fn, calls } = fakeFetch([
      { status: 200, body: JSON.stringify({ access_token: 'at-1', expires_in: 3599 }) },
    ]);
    const result = await refreshGoogleAdsAccessToken(creds, fn);
    expect(result).toEqual({ token: 'at-1', expiresInSeconds: 3599 });

    const body = new URLSearchParams(String(calls[0]?.body));
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('client_id')).toBe('client-1');
    expect(body.get('client_secret')).toBe('shh');
    expect(body.get('refresh_token')).toBe('refresh-1');
  });

  it('omits expiresInSeconds rather than inventing one when Google leaves it out', async () => {
    const { fn } = fakeFetch([{ status: 200, body: JSON.stringify({ access_token: 'at-1' }) }]);
    const result = await refreshGoogleAdsAccessToken(creds, fn);
    expect(result).toEqual({ token: 'at-1' });
    expect('expiresInSeconds' in result).toBe(false);
  });

  it('throws TokenRefreshError on a non-2xx response', async () => {
    const { fn } = fakeFetch([
      { status: 400, body: JSON.stringify({ error: 'invalid_grant' }) },
    ]);
    await expect(refreshGoogleAdsAccessToken(creds, fn)).rejects.toBeInstanceOf(TokenRefreshError);
  });

  it('throws when the response has no access_token', async () => {
    const { fn } = fakeFetch([{ status: 200, body: JSON.stringify({}) }]);
    await expect(refreshGoogleAdsAccessToken(creds, fn)).rejects.toThrow(/access_token/);
  });

  it('throws rather than crashing on an unparsable body', async () => {
    const { fn } = fakeFetch([{ status: 200, body: 'not json' }]);
    await expect(refreshGoogleAdsAccessToken(creds, fn)).rejects.toThrow(/แกะไม่ได้/);
  });
});

describe('cachedAccessTokenProvider', () => {
  it('only calls the token endpoint once while the cached token is still fresh', async () => {
    const { fn } = fakeFetch([
      { status: 200, body: JSON.stringify({ access_token: 'at-1', expires_in: 3600 }) },
    ]);
    const getToken = cachedAccessTokenProvider(creds, fn);
    expect(await getToken()).toBe('at-1');
    expect(await getToken()).toBe('at-1');
    expect(await getToken()).toBe('at-1');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('refreshes again once the cached token is past its (early-refresh) expiry', async () => {
    const { fn } = fakeFetch([
      { status: 200, body: JSON.stringify({ access_token: 'at-1', expires_in: 1 }) },
      { status: 200, body: JSON.stringify({ access_token: 'at-2', expires_in: 3600 }) },
    ]);
    // earlyRefreshMs larger than the 1s TTL above, so the cached entry is
    // already "expired" the instant it is stored — the next call must refetch.
    const getToken = cachedAccessTokenProvider(creds, fn, 5_000);
    expect(await getToken()).toBe('at-1');
    expect(await getToken()).toBe('at-2');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('falls back to a short TTL rather than caching indefinitely when expires_in is missing', async () => {
    const { fn } = fakeFetch([
      { status: 200, body: JSON.stringify({ access_token: 'at-1' }) },
      { status: 200, body: JSON.stringify({ access_token: 'at-2', expires_in: 3600 }) },
    ]);
    // earlyRefreshMs longer than the fallback TTL forces an immediate re-fetch,
    // proving the fallback path does expire rather than caching forever.
    const getToken = cachedAccessTokenProvider(creds, fn, 6 * 60_000);
    expect(await getToken()).toBe('at-1');
    expect(await getToken()).toBe('at-2');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
