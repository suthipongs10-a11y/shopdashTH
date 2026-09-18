import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildGoogleLoginUrl,
  exchangeGoogleLoginCode,
  fetchGoogleEmail,
  GoogleLoginError,
  LOGIN_SCOPES,
} from '../../src/auth/google';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildGoogleLoginUrl', () => {
  it('asks for only openid + email — never offline access', () => {
    const url = new URL(
      buildGoogleLoginUrl({ clientId: 'client-1' }, 'https://worker.example/oauth/google/callback', 'state-abc'),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://worker.example/oauth/google/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(LOGIN_SCOPES.join(' '));
    expect(url.searchParams.get('state')).toBe('state-abc');
    // This flow never keeps a token, so it must never ask for offline access —
    // that would just make the consent screen bigger for nothing kept.
    expect(url.searchParams.get('access_type')).toBeNull();
    expect(url.searchParams.get('prompt')).toBeNull();
  });
});

describe('exchangeGoogleLoginCode', () => {
  it('posts the authorization_code grant and returns the tokens', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('the-code');
      expect(body.get('client_id')).toBe('client-1');
      expect(body.get('client_secret')).toBe('shh');
      expect(body.get('redirect_uri')).toBe('https://worker.example/oauth/google/callback');
      return new Response(JSON.stringify({ access_token: 'at-1', id_token: 'idt-1' }), {
        status: 200,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const tokens = await exchangeGoogleLoginCode(
      { clientId: 'client-1', clientSecret: 'shh' },
      'the-code',
      'https://worker.example/oauth/google/callback',
    );
    expect(tokens).toEqual({ accessToken: 'at-1', idToken: 'idt-1' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('omits idToken rather than storing it as undefined when Google leaves it out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ access_token: 'at-1' }), { status: 200 })),
    );
    const tokens = await exchangeGoogleLoginCode(
      { clientId: 'c', clientSecret: 's' },
      'code',
      'https://worker.example/cb',
    );
    expect(tokens).toEqual({ accessToken: 'at-1' });
    expect('idToken' in tokens).toBe(false);
  });

  it('throws GoogleLoginError with the parsed error on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: 'invalid_grant', error_description: 'Bad code' }),
            { status: 400 },
          ),
      ),
    );
    await expect(
      exchangeGoogleLoginCode({ clientId: 'c', clientSecret: 's' }, 'bad-code', 'https://x/cb'),
    ).rejects.toThrow(/invalid_grant.*Bad code/);
  });

  it('throws when Google returns 200 with no access_token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    await expect(
      exchangeGoogleLoginCode({ clientId: 'c', clientSecret: 's' }, 'code', 'https://x/cb'),
    ).rejects.toThrow(/access_token/);
  });
});

describe('fetchGoogleEmail', () => {
  it('returns the email for a verified account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ email: 'owner@example.com', email_verified: true }), {
            status: 200,
          }),
      ),
    );
    await expect(fetchGoogleEmail('at-1')).resolves.toBe('owner@example.com');
  });

  it('refuses an unverified email — an allowlist gate cannot trust it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ email: 'someone@example.com', email_verified: false }), {
            status: 200,
          }),
      ),
    );
    await expect(fetchGoogleEmail('at-1')).resolves.toBeUndefined();
  });

  it('returns undefined rather than throwing on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(fetchGoogleEmail('bad-token')).resolves.toBeUndefined();
  });

  it('returns undefined on an unparsable body instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
    await expect(fetchGoogleEmail('at-1')).resolves.toBeUndefined();
  });
});

describe('GoogleLoginError', () => {
  it('falls back to a slice of the raw body when it cannot parse JSON', () => {
    const err = new GoogleLoginError(500, 'internal error, not json');
    expect(err.message).toContain('500');
    expect(err.message).toContain('internal error, not json');
  });
});
