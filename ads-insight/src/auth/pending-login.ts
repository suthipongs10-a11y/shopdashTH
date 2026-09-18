/**
 * Stashes the MCP client's original authorization request while the browser
 * is off at Google's login screen (M2, SPEC §5.1).
 *
 * `OAuthHelpers.completeAuthorization()` must be called with the exact
 * `AuthRequest` object `parseAuthRequest()` returned — the provider's own
 * docs are explicit that a request rebuilt from untrusted values must never
 * be used to construct a redirect. Round-tripping it through the `state`
 * query parameter would work, but `state` then rides through the browser's
 * address bar and Google's own request logs carrying the caller's redirect
 * URI, scopes and PKCE challenge. Instead only a random id crosses through
 * Google as `state`; the request itself sits server-side in KV.
 */
import type { AuthRequest } from '@cloudflare/workers-oauth-provider';

const KEY_PREFIX = 'google_login:';
/** Long enough to read a Google consent screen, short enough that an
 * abandoned login doesn't leave the request sitting around for long. */
const TTL_SECONDS = 600;

export interface PendingLogin {
  authRequest: AuthRequest;
}

/**
 * The slice of `KVNamespace` this module actually uses.
 *
 * Named locally rather than importing the ambient `KVNamespace` type: this
 * file otherwise has no Workers dependency, and a real `KVNamespace` value
 * satisfies this structurally, so callers pass `env.OAUTH_KV` unchanged
 * while tests pass a plain in-memory `Map` wrapper without needing
 * `@cloudflare/workers-types` in scope (`tsconfig.scripts.json` deliberately
 * excludes it — it clashes with Node's own globals).
 */
export interface PendingLoginStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

/** Store `authRequest`, returning the id to pass as Google's `state`. */
export async function storePendingLogin(
  kv: PendingLoginStore,
  authRequest: AuthRequest,
): Promise<string> {
  const id = crypto.randomUUID();
  const record: PendingLogin = { authRequest };
  await kv.put(keyFor(id), JSON.stringify(record), { expirationTtl: TTL_SECONDS });
  return id;
}

/**
 * Retrieve and delete the pending request for `id`.
 *
 * One-time use by design: a replayed Google callback (a refreshed browser
 * tab, a resent request) must not be able to complete the same MCP
 * authorization twice.
 */
export async function takePendingLogin(
  kv: PendingLoginStore,
  id: string,
): Promise<PendingLogin | undefined> {
  const raw = await kv.get(keyFor(id));
  if (raw === null) return undefined;
  await kv.delete(keyFor(id));
  try {
    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if (!parsed.authRequest) return undefined;
    return { authRequest: parsed.authRequest };
  } catch {
    return undefined;
  }
}
