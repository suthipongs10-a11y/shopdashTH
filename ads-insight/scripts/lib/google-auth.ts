/**
 * Minimal Google OAuth helpers for the M0 setup scripts (SPEC §4, §5.2).
 *
 * Local-only: the Worker gets its own implementation in `src/auth/` at M2,
 * where refresh tokens are stored AES-GCM encrypted in D1 rather than in a file.
 */
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** `adwords` is the Google Ads API scope; the other two identify the account. */
export const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/adwords'];

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
}

export function buildAuthUrl(
  client: Pick<OAuthClient, 'clientId'>,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    // offline + consent is what makes Google return a refresh_token
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCode(
  client: OAuthClient,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  return postToken({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
}

export async function refreshAccessToken(
  client: OAuthClient,
  refreshToken: string,
): Promise<TokenResponse> {
  return postToken({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
}

export async function fetchUserEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { email?: string };
  return body.email;
}

async function postToken(form: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new OAuthError(res.status, text);
  return JSON.parse(text) as TokenResponse;
}

/** Turn Google's OAuth error payloads into something actionable, in Thai. */
export class OAuthError extends Error {
  override name = 'OAuthError';
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(explainOAuthError(status, body));
  }
}

export function explainOAuthError(status: number, body: string): string {
  let code = '';
  let description = '';
  try {
    const parsed = JSON.parse(body) as { error?: string; error_description?: string };
    code = parsed.error ?? '';
    description = parsed.error_description ?? '';
  } catch {
    description = body.slice(0, 300);
  }

  const hints: Record<string, string> = {
    invalid_grant:
      'refresh token ใช้ไม่ได้แล้ว (ถูกเพิกถอน หรือหมดอายุเพราะ OAuth consent screen ยังเป็นสถานะ Testing ซึ่งอายุ 7 วัน) — ' +
      'เปลี่ยน consent screen เป็น In production แล้วรัน `pnpm auth:google` ใหม่',
    invalid_client:
      'GOOGLE_OAUTH_CLIENT_ID หรือ GOOGLE_OAUTH_CLIENT_SECRET ไม่ตรงกับ OAuth client ใน Google Cloud',
    redirect_uri_mismatch:
      'redirect URI ไม่ตรงกับที่ลงทะเบียนไว้ใน OAuth client — เพิ่ม URI ที่สคริปต์แสดงลงใน Authorized redirect URIs',
    access_denied: 'ผู้ใช้กดปฏิเสธในหน้าขออนุญาตของ Google',
  };

  const hint = hints[code];
  const parts = [`Google OAuth ตอบกลับ HTTP ${status}`];
  if (code) parts.push(`(${code})`);
  if (hint) parts.push(`— ${hint}`);
  else if (description) parts.push(`— ${description}`);
  return parts.join(' ');
}
