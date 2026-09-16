import { envReport, type Env } from './env';

/**
 * Worker entry point (SPEC §3).
 *
 * M0 scaffolding: only `/health` is implemented. Every other surface is a
 * declared stub so the route map is visible and `pnpm dev` boots, but the
 * behaviour lands in the milestone named in the 501 response. Do not fill
 * these in ahead of their milestone (CLAUDE.md "กฎ Gate").
 */
const STUBS: { prefix: string; milestone: string; what: string }[] = [
  { prefix: '/mcp', milestone: 'M2', what: 'MCP server (Streamable HTTP)' },
  { prefix: '/oauth', milestone: 'M2', what: 'OAuth provider สำหรับ Claude connector' },
  { prefix: '/connect/google', milestone: 'M2', what: 'เชื่อมบัญชี Google Ads' },
  { prefix: '/api', milestone: 'M3', what: 'REST API สำหรับ PWA' },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    return json({ error: 'not_found', message: 'ไม่พบเส้นทางนี้' }, 404);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
