/**
 * Exchange the stored Google Ads refresh token for a short-lived access
 * token (SPEC §3 file tree lists this as part of `src/ads/`).
 *
 * Reimplements the same OAuth token-endpoint call `scripts/lib/
 * google-auth.ts` makes for the M0/M1 setup scripts, rather than importing
 * it: that file lives under `tsconfig.scripts.json` (Node types), while
 * `src/ads` must stay runtime-agnostic (CLAUDE.md) — crossing that boundary
 * isn't an option, and the logic is small enough that duplicating it is
 * cheaper than sharing it (same call made in D17 for the M0 scripts).
 */
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class TokenRefreshError extends Error {
  override name = 'TokenRefreshError';
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string,
  ) {
    super(message ?? `ขอ access token ของ Google Ads ไม่สำเร็จ (HTTP ${status}): ${body.slice(0, 300)}`);
  }
}

/**
 * @param fetchImpl injected so callers (and tests) don't depend on the
 *   global — the same pattern `src/ads/client.ts` uses for its own `fetch`.
 */
export interface AccessToken {
  token: string;
  /** Seconds until expiry, as Google reported it — absent only if Google's
   * response left out `expires_in`, which the OAuth spec allows but Google
   * has not been observed to do. */
  expiresInSeconds?: number;
}

export async function refreshGoogleAdsAccessToken(
  creds: GoogleAdsCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<AccessToken> {
  const res = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new TokenRefreshError(res.status, text);

  let body: { access_token?: string; expires_in?: number };
  try {
    body = JSON.parse(text) as { access_token?: string; expires_in?: number };
  } catch {
    throw new TokenRefreshError(res.status, text, 'Google ตอบกลับเป็น JSON ที่แกะไม่ได้');
  }
  if (!body.access_token) {
    throw new TokenRefreshError(res.status, text, 'Google ไม่ส่ง access_token กลับมา');
  }
  return typeof body.expires_in === 'number'
    ? { token: body.access_token, expiresInSeconds: body.expires_in }
    : { token: body.access_token };
}

/** If Google's response omits `expires_in` — allowed by the OAuth spec,
 * never observed from Google in practice — assume the shortest lifetime
 * commonly issued rather than caching something that may already be dead. */
const FALLBACK_TTL_SECONDS = 5 * 60;

/**
 * Memoizes `refreshGoogleAdsAccessToken` in memory for the life of the
 * caller — a Worker isolate reused across nearby requests skips the extra
 * round trip; a cold start just pays for one. Not persisted anywhere (KV/D1
 * caching is SPEC §5.2's job for the multi-account connection flow, M3),
 * so it never leaks past this one process.
 */
export function cachedAccessTokenProvider(
  creds: GoogleAdsCredentials,
  fetchImpl: typeof fetch = fetch,
  // Refresh a little before Google's stated expiry so a request never starts
  // with a token that expires mid-flight.
  earlyRefreshMs = 60_000,
): () => Promise<string> {
  let cached: { token: string; expiresAt: number } | undefined;

  return async () => {
    if (cached && cached.expiresAt > Date.now()) return cached.token;
    const { token, expiresInSeconds } = await refreshGoogleAdsAccessToken(creds, fetchImpl);
    const ttlMs = (expiresInSeconds ?? FALLBACK_TTL_SECONDS) * 1000;
    cached = { token, expiresAt: Date.now() + Math.max(ttlMs - earlyRefreshMs, 0) };
    return token;
  };
}
