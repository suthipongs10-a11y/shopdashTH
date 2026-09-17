/**
 * Google Ads REST client (SPEC §2 D3, §4).
 *
 * REST over `fetch`, no gRPC library — Workers cannot run gRPC, and this keeps
 * us off a wrapper that lags the API.
 *
 * Runtime-agnostic (SPEC §2 D1): `fetch`, the token source, the clock and the
 * sleep function all arrive as parameters, so the same client runs on Workers,
 * on Node, and against fakes in tests with no real timers.
 */
import { AdsApiError } from './errors';
import { assertLimit, validateRawGaql } from './gaql';

export const ADS_API_HOST = 'https://googleads.googleapis.com';

/** Everything the client needs from its host environment. */
export interface AdsClientDeps {
  /** API version, e.g. `v25`. From `ADS_API_VERSION` so it moves without a code change. */
  apiVersion: string;
  /** Returns a valid access token; called per request so refresh stays outside. */
  getAccessToken: () => Promise<string>;
  /** Set only when reaching the account through a manager account. */
  loginCustomerId?: string;
  fetch?: typeof fetch;
  /** Called after every attempt so `quota_usage` can be kept (SPEC §9.1). */
  onOps?: (used: number) => void;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected in tests to make backoff deterministic. */
  random?: () => number;
  retry?: Partial<RetryPolicy>;
}

export interface RetryPolicy {
  /** Attempts after the first. 0 disables retrying. */
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

export interface SearchOptions {
  /** Overrides the client default, for multi-account use later (SPEC D10). */
  loginCustomerId?: string;
  /** Skip the read-only/allowlist check — only for queries this codebase built. */
  trusted?: boolean;
  maxLimit?: number;
}

export interface MutateOptions {
  loginCustomerId?: string;
  /**
   * Ask Google to check the operations without applying them. Defaults to
   * **true**: CLAUDE.md forbids mutating a production account without it, so
   * the dangerous value is the one a caller has to type out.
   */
  validateOnly?: boolean;
  /** SPEC §7.7 applies a change set atomically, so this defaults to false. */
  partialFailure?: boolean;
}

export interface AdsClient {
  search(customerId: string, query: string, options?: SearchOptions): Promise<AdsRow[]>;
  mutate(
    customerId: string,
    mutateOperations: unknown[],
    options?: MutateOptions,
  ): Promise<MutateResponse>;
  /** Operations consumed since the client was created. */
  opsUsed(): number;
}

export type AdsRow = Record<string, unknown>;

export interface MutateResponse {
  mutateOperationResponses?: Record<string, unknown>[];
  partialFailureError?: unknown;
  [key: string]: unknown;
}

export function createAdsClient(deps: AdsClientDeps): AdsClient {
  const doFetch = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = deps.random ?? Math.random;
  const retry: RetryPolicy = { ...DEFAULT_RETRY, ...deps.retry };
  let ops = 0;

  async function request(
    path: string,
    body: unknown,
    loginCustomerId: string | undefined,
  ): Promise<string> {
    const url = `${ADS_API_HOST}/${deps.apiVersion}/${path}`;
    let lastError: AdsApiError | undefined;

    for (let attempt = 0; attempt <= retry.maxRetries; attempt += 1) {
      const token = await deps.getAccessToken();
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      };
      const login = loginCustomerId ?? deps.loginCustomerId;
      if (login) headers['login-customer-id'] = login;

      // Counted per attempt, not per call: a retry costs quota too.
      ops += 1;
      deps.onOps?.(ops);

      const response = await doFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (response.ok) return text;

      lastError = AdsApiError.fromResponse(response.status, text);
      if (!lastError.retryable || attempt === retry.maxRetries) throw lastError;

      await sleep(backoffDelay(attempt, retry, random));
    }

    /* c8 ignore next */
    throw lastError ?? new Error('unreachable');
  }

  return {
    async search(customerId, query, options = {}) {
      const checked = options.trusted
        ? query
        : validateRawGaql(query, {
            addLimitIfMissing: true,
            ...(options.maxLimit === undefined ? {} : { maxLimit: options.maxLimit }),
          });
      const text = await request(
        `customers/${assertCustomerId(customerId)}/googleAds:searchStream`,
        { query: checked },
        options.loginCustomerId,
      );
      return flattenSearchStream(parseJson(text));
    },

    async mutate(customerId, mutateOperations, options = {}) {
      if (mutateOperations.length === 0) {
        throw new Error('mutate ต้องมีอย่างน้อย 1 operation');
      }
      const text = await request(
        `customers/${assertCustomerId(customerId)}/googleAds:mutate`,
        {
          mutateOperations,
          // Default to the safe value; callers opt into the real thing.
          validateOnly: options.validateOnly ?? true,
          partialFailure: options.partialFailure ?? false,
        },
        options.loginCustomerId,
      );
      return parseJson(text) as MutateResponse;
    },

    opsUsed: () => ops,
  };
}

/**
 * Exponential backoff with full jitter. Without jitter, several requests that
 * fail together retry together and hit the same limit again.
 */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs);
  return Math.round(random() * ceiling);
}

/**
 * searchStream answers with an array of `{ results, fieldMask }` chunks;
 * callers want the rows.
 */
export function flattenSearchStream(payload: unknown): AdsRow[] {
  const chunks = Array.isArray(payload) ? payload : [payload];
  const rows: AdsRow[] = [];
  for (const chunk of chunks) {
    const results = (chunk as { results?: unknown })?.results;
    if (Array.isArray(results)) rows.push(...(results as AdsRow[]));
  }
  return rows;
}

function parseJson(text: string): unknown {
  if (text.trim() === '') return [];
  try {
    return JSON.parse(text);
  } catch {
    throw new AdsApiError(
      200,
      text,
      { status: 200, message: 'Google ตอบกลับด้วยเนื้อหาที่ไม่ใช่ JSON', details: [] },
    );
  }
}

const CUSTOMER_ID_RE = /^\d{10}$/;

function assertCustomerId(customerId: string): string {
  const id = customerId.replace(/[\s-]/g, '');
  if (!CUSTOMER_ID_RE.test(id)) {
    throw new Error(`Customer ID ไม่ถูกต้อง: "${customerId}" — ต้องเป็นตัวเลข 10 หลัก`);
  }
  return id;
}

export { assertLimit };
