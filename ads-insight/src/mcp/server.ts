/**
 * MCP server bootstrap (M2, SPEC §3, §6).
 *
 * One `McpServer` and one transport per request, run stateelessly
 * (`sessionIdGenerator: undefined`): a Worker isolate is not somewhere to
 * keep a live MCP session across requests without a Durable Object, and the
 * Streamable HTTP transport explicitly supports stateless mode for exactly
 * this. Registering the read tools per request is cheap — closures over
 * already-built dependencies, no I/O — so this costs nothing measurable.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createAdsClient } from '../ads/client';
import { cachedAccessTokenProvider } from '../ads/token';
import type { AuthProps } from '../auth/types';
import type { Env } from '../env';
import { registerAccountOverviewTool } from './tools/account-overview';
import { registerAdsTool } from './tools/ads';
import { registerBiddingStatusTool } from './tools/bidding-status';
import { registerConversionSetupTool } from './tools/conversion-setup';
import { registerImpressionShareTool } from './tools/impression-share';
import { registerKeywordsTool } from './tools/keywords';
import { registerPerformanceTool } from './tools/performance';
import { registerRunGaqlTool } from './tools/run-gaql';
import { registerSearchTermsTool } from './tools/search-terms';
import type { ToolDeps } from './tools/shared';
import { registerTimePerformanceTool } from './tools/time-performance';

/** One access-token cache per Worker isolate. Module scope on purpose: it
 * outlives any single request, so a warm isolate skips the refresh for the
 * next call — see `src/ads/token.ts` for why this is safe to keep in memory
 * only. Built lazily so a request that never calls it never pays for it. */
let cachedGetAccessToken: (() => Promise<string>) | undefined;

function getAccessTokenFor(env: Env): () => Promise<string> {
  cachedGetAccessToken ??= cachedAccessTokenProvider({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: env.GOOGLE_ADS_REFRESH_TOKEN,
  });
  return cachedGetAccessToken;
}

function buildToolDeps(env: Env, auth: AuthProps): ToolDeps {
  const client = createAdsClient({
    apiVersion: env.ADS_API_VERSION,
    getAccessToken: getAccessTokenFor(env),
    ...(env.LOGIN_CUSTOMER_ID ? { loginCustomerId: env.LOGIN_CUSTOMER_ID } : {}),
  });
  return { client, env, auth };
}

/**
 * SPEC §12 M2 names exactly these ten read tools. The other six in §6.3's
 * full table (`get_audience_breakdown`, `get_landing_pages`,
 * `get_policy_issues`, `get_assets`, `get_recommendations`,
 * `get_change_history`) are explicitly M3 — CLAUDE.md's gate rule is not to
 * build them ahead of that milestone even though they'd slot into this same
 * list just as easily.
 */
function buildServer(deps: ToolDeps): McpServer {
  const server = new McpServer({ name: 'ads-insight', version: '0.1.0' });
  registerRunGaqlTool(server, deps);
  registerAccountOverviewTool(server, deps);
  registerConversionSetupTool(server, deps);
  registerBiddingStatusTool(server, deps);
  registerImpressionShareTool(server, deps);
  registerKeywordsTool(server, deps);
  registerSearchTermsTool(server, deps);
  registerAdsTool(server, deps);
  registerTimePerformanceTool(server, deps);
  registerPerformanceTool(server, deps);
  return server;
}

/** Handle one HTTP request for `/mcp`. `auth` has already been checked
 * (OAuth grant or the dev-bearer-token bypass) by the caller. */
export async function handleMcpRequest(
  request: Request,
  env: Env,
  auth: AuthProps,
): Promise<Response> {
  const server = buildServer(buildToolDeps(env, auth));
  // No `sessionIdGenerator` key at all — under `exactOptionalPropertyTypes`
  // that's how you leave an optional field unset; passing the literal
  // `undefined` as a value is a type error. Omitting it is what puts the
  // transport in stateless mode (see the class doc in the SDK).
  const transport = new WebStandardStreamableHTTPServerTransport({});
  await server.connect(transport);
  return transport.handleRequest(request);
}
