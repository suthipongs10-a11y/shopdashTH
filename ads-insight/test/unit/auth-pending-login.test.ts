import { describe, expect, it } from 'vitest';
import {
  storePendingLogin,
  takePendingLogin,
  type PendingLoginStore,
} from '../../src/auth/pending-login';
import type { AuthRequest } from '@cloudflare/workers-oauth-provider';

/** In-memory stand-in for the KV slice this module uses — TTL recorded, not enforced. */
function fakeKv(): PendingLoginStore & { size: () => number } {
  const store = new Map<string, string>();
  return {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value);
    },
    delete: async (key) => {
      store.delete(key);
    },
    size: () => store.size,
  };
}

const sampleRequest: AuthRequest = {
  responseType: 'code',
  clientId: 'client-1',
  redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  scope: ['mcp'],
  state: 'client-state',
  codeChallenge: 'challenge',
  codeChallengeMethod: 'S256',
};

describe('storePendingLogin / takePendingLogin', () => {
  it('round-trips the exact AuthRequest object', async () => {
    const kv = fakeKv();
    const id = await storePendingLogin(kv, sampleRequest);
    const pending = await takePendingLogin(kv, id);
    expect(pending?.authRequest).toEqual(sampleRequest);
  });

  it('is one-time use — a second read after the first returns nothing', async () => {
    const kv = fakeKv();
    const id = await storePendingLogin(kv, sampleRequest);
    await takePendingLogin(kv, id);
    expect(await takePendingLogin(kv, id)).toBeUndefined();
    expect(kv.size()).toBe(0);
  });

  it('returns undefined for an id that was never stored', async () => {
    const kv = fakeKv();
    expect(await takePendingLogin(kv, 'never-existed')).toBeUndefined();
  });

  it('returns undefined rather than throwing on a corrupted record', async () => {
    const kv = fakeKv();
    await kv.put('google_login:broken', 'not json');
    expect(await takePendingLogin(kv, 'broken')).toBeUndefined();
  });

  it('generates a different id on every call, so concurrent logins do not collide', async () => {
    const kv = fakeKv();
    const a = await storePendingLogin(kv, sampleRequest);
    const b = await storePendingLogin(kv, { ...sampleRequest, state: 'other' });
    expect(a).not.toBe(b);
    expect((await takePendingLogin(kv, a))?.authRequest.state).toBe('client-state');
    expect((await takePendingLogin(kv, b))?.authRequest.state).toBe('other');
  });
});
