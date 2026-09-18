import { envReport, type Env } from './env';
import { createOAuthProvider } from './oauth';
import { handleMcpRequest } from './mcp/server';

/**
 * Worker entry point (SPEC §3).
 *
 * M2: `/mcp`, `/authorize`, `/oauth/*` and Google login are real
 * (`src/oauth.ts`). Everything else stays a declared stub so the route map
 * is visible and `pnpm dev` boots, but the behaviour lands in the milestone
 * named in the 501 response. Do not fill these in ahead of their milestone
 * (CLAUDE.md "กฎ Gate").
 */
const STUBS: { prefix: string; milestone: string; what: string }[] = [
  // `/connect/google/` — the *ads account* connection (SPEC §5.2, offline
  // `adwords` scope, D1-encrypted refresh token) — is a separate flow from
  // the MCP connector's own login at `/authorize` (M2, above): its storage
  // is the `google_connections` D1 table, which does not exist before M3.
  { prefix: '/connect/google', milestone: 'M3', what: 'เชื่อมบัญชี Google Ads (เก็บใน D1)' },
  { prefix: '/api', milestone: 'M3', what: 'REST API สำหรับ PWA' },
];

const oauthProvider = createOAuthProvider();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        env: env.ENV,
        ads_api_version: env.ADS_API_VERSION,
        account_tz: env.ACCOUNT_TZ,
        // booleans only — never echo secret values
        configured: envReport(env),
      });
    }

    // Dev-only shortcut so Claude Code can attach to a local server without a
    // full OAuth round trip (SPEC §5.1). Checked before the stub list too,
    // since /mcp itself is no longer stubbed.
    if (env.ENV === 'dev' && url.pathname.startsWith('/mcp')) {
      const devAuth = checkDevBearer(request, env);
      if (devAuth) return handleMcpRequest(request, env, devAuth);
    }

    const stub = STUBS.find(
      (s) => url.pathname === s.prefix || url.pathname.startsWith(`${s.prefix}/`),
    );
    if (stub) {
      return json(
        {
          error: 'not_implemented',
          message: `${stub.what} ยังไม่ได้สร้าง — อยู่ใน milestone ${stub.milestone}`,
          milestone: stub.milestone,
        },
        501,
      );
    }

    // Everything else — /mcp (protected), /authorize, /oauth/*,
    // /oauth/google/callback, /.well-known/* — goes through the provider.
    return oauthProvider.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

/** `Authorization: Bearer <DEV_BEARER_TOKEN>`, exact match, `ENV=dev` only. */
function checkDevBearer(request: Request, env: Env): { email: string } | undefined {
  if (!env.DEV_BEARER_TOKEN) return undefined;
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || match[1] !== env.DEV_BEARER_TOKEN) return undefined;
  const [firstOwner] = env.OWNER_EMAILS.split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return { email: firstOwner ?? 'dev@localhost' };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
