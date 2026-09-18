/**
 * OAuth 2.1 authorization server for the MCP connector (M2, SPEC §5.1).
 *
 * Two things happen here, and only one of them is this project's job:
 *  - Standard OAuth between this Worker and the MCP client (Claude) is
 *    handled almost entirely by `@cloudflare/workers-oauth-provider`.
 *  - Deciding *who* is authorizing is not — the provider's own docs say
 *    plainly that it is not an identity provider. This Worker answers that
 *    by sending the browser to Google (`src/auth/google.ts`) and checking
 *    the resulting email against `OWNER_EMAILS`.
 *
 * `/authorize` and `/oauth/google/callback` both belong to the provider's
 * `defaultHandler` for exactly this reason ("Your authorizeEndpoint belongs
 * to the application's defaultHandler because user authentication and
 * consent are application-specific" — package README).
 */
import {
  AuthorizationError,
  OAuthProvider,
  type AuthRequest,
} from '@cloudflare/workers-oauth-provider';
import { buildGoogleLoginUrl, exchangeGoogleLoginCode, fetchGoogleEmail } from './auth/google';
import { storePendingLogin, takePendingLogin } from './auth/pending-login';
import type { AuthProps } from './auth/types';
import { ownerEmails } from './config';
import type { Env } from './env';
import { handleMcpRequest } from './mcp/server';

/**
 * The only OAuth scope this server issues. Read vs. write is enforced inside
 * tool/service logic (guardrails, `READ_ONLY_MODE` — SPEC §5.4, from M4),
 * not by finer-grained scopes at this layer — there is nothing yet to scope
 * more finely, since M2 has no write tools.
 */
const MCP_SCOPE = 'mcp';

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

/** This Worker's own callback URL for Google — derived from the incoming
 * request so dev (`localhost:8787`) and prod both work with no code change. */
function googleCallbackUrl(request: Request): string {
  return `${new URL(request.url).origin}/oauth/google/callback`;
}

/** Step 1: validate the MCP client's request, then hand off to Google. */
async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (err) {
    if (!(err instanceof AuthorizationError)) throw err;
    if (!err.redirectUri) {
      // Unknown client or invalid redirect URI — nothing safe to redirect to.
      return textResponse(err.description, 400);
    }
    const redirect = new URL(err.redirectUri);
    redirect.searchParams.set('error', err.code);
    redirect.searchParams.set('error_description', err.description);
    if (err.state) redirect.searchParams.set('state', err.state);
    if (err.issuer) redirect.searchParams.set('iss', err.issuer);
    return Response.redirect(redirect.toString(), 302);
  }

  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) return textResponse('ไม่รู้จัก OAuth client นี้', 400);

  const pendingId = await storePendingLogin(env.OAUTH_KV, oauthRequest);
  const loginUrl = buildGoogleLoginUrl(
    { clientId: env.GOOGLE_OAUTH_CLIENT_ID },
    googleCallbackUrl(request),
    pendingId,
  );
  return Response.redirect(loginUrl, 302);
}

/** Step 2: Google has confirmed who signed in, or the login was abandoned. */
async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pendingId = url.searchParams.get('state');
  if (!pendingId) {
    return textResponse('ลิงก์ล็อกอินไม่ถูกต้อง (ไม่มี state) — เริ่มใหม่จาก Claude', 400);
  }

  const pending = await takePendingLogin(env.OAUTH_KV, pendingId);
  if (!pending) {
    return textResponse('ลิงก์ล็อกอินหมดอายุหรือถูกใช้ไปแล้ว — กลับไปเริ่มใหม่จาก Claude', 400);
  }
  const { authRequest } = pending;

  /** An OAuth error redirect back to the MCP client, built only from the
   * *original* validated request — never from this request's own query
   * string (see module doc: the provider's redirect-safety rule). */
  function denyToClient(code: string, description: string): Response {
    const redirect = new URL(authRequest.redirectUri);
    redirect.searchParams.set('error', code);
    redirect.searchParams.set('error_description', description);
    redirect.searchParams.set('state', authRequest.state);
    if (authRequest.issuer) redirect.searchParams.set('iss', authRequest.issuer);
    return Response.redirect(redirect.toString(), 302);
  }

  const googleError = url.searchParams.get('error');
  if (googleError) return denyToClient('access_denied', 'ผู้ใช้ปฏิเสธการล็อกอินที่ Google');

  const code = url.searchParams.get('code');
  if (!code) return textResponse('ไม่มี authorization code จาก Google', 400);

  let email: string | undefined;
  try {
    const tokens = await exchangeGoogleLoginCode(
      { clientId: env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET },
      code,
      googleCallbackUrl(request),
    );
    email = await fetchGoogleEmail(tokens.accessToken);
  } catch (err) {
    return textResponse(
      `ล็อกอินกับ Google ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  if (!email) {
    return textResponse('อ่านอีเมลจากบัญชี Google ไม่ได้ — ลองใหม่อีกครั้ง', 502);
  }

  const allowed = ownerEmails({ OWNER_EMAILS: env.OWNER_EMAILS }).includes(email.toLowerCase());
  if (!allowed) {
    // A page for the human, not an OAuth error redirect: the MCP client did
    // nothing wrong here, so this isn't a machine response Claude should
    // parse or retry.
    return textResponse(`บัญชี ${email} ไม่มีสิทธิ์เข้าถึง Ads Insight — ติดต่อเจ้าของระบบ`, 403);
  }

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: email,
    metadata: { email },
    scope: authRequest.scope,
    props: { email } satisfies AuthProps,
  });
  return Response.redirect(redirectTo, 302);
}

async function defaultHandlerFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/authorize') return handleAuthorize(request, env);
  if (url.pathname === '/oauth/google/callback') return handleGoogleCallback(request, env);
  return textResponse('ไม่พบเส้นทางนี้', 404);
}

async function apiHandlerFetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // workers-oauth-provider augments `ctx` with `.props` at runtime after a
  // successful token check (its README: "This handler will receive the
  // authenticated user properties in ctx.props") — a shape its own exported
  // types don't carry on the plain `ExecutionContext`, so this one read is
  // asserted rather than declared on the parameter.
  const props = (ctx as ExecutionContext & { props?: AuthProps }).props;
  return handleMcpRequest(request, env, props ?? { email: 'unknown' });
}

/**
 * Built once per module load (Worker isolate), not per request — the
 * provider is stateless itself; all real state lives in `OAUTH_KV`.
 */
export function createOAuthProvider(): OAuthProvider<Env> {
  return new OAuthProvider<Env>({
    apiRoute: '/mcp',
    apiHandler: { fetch: apiHandlerFetch },
    defaultHandler: { fetch: defaultHandlerFetch },
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    // MCP 2026-07-28 deprecates DCR for new clients in favor of CIMD
    // (DECISIONS D35), but not every client speaks CIMD yet — enabling both
    // keeps whichever one a given client supports working.
    clientRegistrationEndpoint: '/oauth/register',
    clientIdMetadataDocumentEnabled: true,
    scopesSupported: [MCP_SCOPE],
    resourceMetadata: {
      scopes_supported: [MCP_SCOPE],
      resource_name: 'Ads Insight',
    },
  });
}
