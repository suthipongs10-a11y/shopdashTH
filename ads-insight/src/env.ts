import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { configReport, parseConfig, type AppConfig } from './config';

/**
 * Worker bindings (SPEC §3, §5.4). This is the only place that names
 * Cloudflare-specific types; validation lives in `src/config.ts` so the core
 * stays portable (SPEC §2 D1).
 */
export interface Env {
  // vars — wrangler.toml [vars]
  ENV: string;
  ACCOUNT_TZ: string;
  ADS_API_VERSION: string;
  DEFAULT_CUSTOMER_ID: string;
  LOGIN_CUSTOMER_ID: string;
  TEST_CUSTOMER_ID: string;
  // secrets — .dev.vars locally, `wrangler secret put` when deployed
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_ADS_REFRESH_TOKEN: string;
  OWNER_EMAILS: string;
  TOKEN_ENC_KEY: string;
  SESSION_SECRET: string;
  DEV_BEARER_TOKEN?: string;
  // bindings
  DB: D1Database;
  /** Grants/clients/tokens for @cloudflare/workers-oauth-provider, plus our
   * own short-lived state (src/auth/pending-login.ts) under a distinct key
   * prefix — see the comment in wrangler.toml. */
  OAUTH_KV: KVNamespace;
  /** Injected by OAuthProvider itself (M2) — not a real binding to configure. */
  OAUTH_PROVIDER: OAuthHelpers;
}

/** Validate the Worker environment, throwing `ConfigError` if incomplete. */
export function envConfig(env: Env): AppConfig {
  return parseConfig(env as unknown as Record<string, unknown>);
}

/** Presence-only report of the Worker environment, safe to serve from /health. */
export function envReport(env: Env): Record<string, boolean> {
  return { ...configReport(env as unknown as Record<string, unknown>), DB: Boolean(env.DB) };
}
