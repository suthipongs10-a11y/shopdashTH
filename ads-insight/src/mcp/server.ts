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
import { registerRunGaqlTool } from './tools/run-gaql';
import type { ToolDeps } from './tools/shared';

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

function buildServer(deps: ToolDeps): McpServer {
  const server = new McpServer({ name: 'ads-insight', version: '0.1.0' });
  registerRunGaqlTool(server, deps);
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
