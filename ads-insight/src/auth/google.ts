/**
 * Google login for the MCP connector itself (M2, SPEC §5.1) — answers "who is
 * this," gated afterward by the `OWNER_EMAILS` allowlist.
 *
 * This is a different Google OAuth flow from the one that connects the
 * Google Ads account (SPEC §5.2, `/connect/google`, M3): that one requests
 * the `adwords` scope with `access_type=offline` and stores the resulting
 * refresh token, AES-GCM encrypted, in D1. This one requests only
 * `openid email`, needs no offline access, and keeps nothing — once the
 * email is read back, the flow is done and every token here is discarded.
 *
 * Both flows share the same Google Cloud OAuth client (`GOOGLE_OAUTH_CLIENT_ID`
 * / `_SECRET`), which is normal: one OAuth client can be used for more than
 * one scope combination.
 */

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Enough to identify the caller — nothing that needs to be kept afterward. */
export const LOGIN_SCOPES = ['openid', 'email'];

export interface GoogleOAuthClient {
  clientId: string;
  clientSecret: string;
}

/** Build the URL that starts the Google login screen. */
export function buildGoogleLoginUrl(
  client: Pick<GoogleOAuthClient, 'clientId'>,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: LOGIN_SCOPES.join(' '),
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleLoginTokens {
  accessToken: string;
  idToken?: string;
}

/** Exchange the code Google's redirect carried for tokens. */
export async function exchangeGoogleLoginCode(
  client: GoogleOAuthClient,
  code: string,
  redirectUri: string,
): Promise<GoogleLoginTokens> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new GoogleLoginError(res.status, text);
  const body = JSON.parse(text) as { access_token?: string; id_token?: string };
  if (!body.access_token) {
    throw new GoogleLoginError(res.status, text, 'Google ไม่ส่ง access_token กลับมา');
  }
  return body.id_token === undefined
    ? { accessToken: body.access_token }
    : { accessToken: body.access_token, idToken: body.id_token };
}

/**
 * Read the caller's email back from Google.
 *
 * Returns `undefined` rather than throwing on anything short of a verified
 * email — this feeds an allowlist gate, so "can't tell who this is" and
 * "not on the list" should both just mean access is refused, not a 500.
 */
export async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  let body: { email?: string; email_verified?: boolean };
  try {
    body = (await res.json()) as { email?: string; email_verified?: boolean };
  } catch {
    return undefined;
  }
  // An unverified email is exactly the case an allowlist gate exists to
  // guard against — a Google account whose address isn't confirmed as theirs.
  if (body.email_verified === false) return undefined;
  return body.email;
}

export class GoogleLoginError extends Error {
  override name = 'GoogleLoginError';
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string,
  ) {
    super(message ?? GoogleLoginError.describe(status, body));
  }

  private static describe(status: number, body: string): string {
    try {
      const parsed = JSON.parse(body) as { error?: string; error_description?: string };
      const parts = [`Google OAuth ตอบกลับ HTTP ${status}`];
      if (parsed.error) parts.push(`(${parsed.error})`);
      if (parsed.error_description) parts.push(`— ${parsed.error_description}`);
      return parts.join(' ');
    } catch {
      return `Google OAuth ตอบกลับ HTTP ${status}: ${body.slice(0, 300)}`;
    }
  }
}
