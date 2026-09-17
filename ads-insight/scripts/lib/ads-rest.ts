/**
 * Just enough Google Ads REST to satisfy the M0 gate (SPEC §4).
 *
 * The real client — retries, quota counting, GAQL builder, full error mapping —
 * is `src/ads/client.ts` in M1. Nothing here should grow beyond a read-only
 * `searchStream` call.
 */
export const ADS_API_HOST = 'https://googleads.googleapis.com';

export interface SearchStreamOptions {
  apiVersion: string;
  customerId: string;
  accessToken: string;
  query: string;
  /** Set only when the account is reached through an MCC. */
  loginCustomerId?: string;
}

/** One `{ results, fieldMask }` chunk of a searchStream response. */
interface SearchStreamChunk {
  results?: Record<string, unknown>[];
  fieldMask?: string;
}

export async function searchStream(
  options: SearchStreamOptions,
): Promise<Record<string, unknown>[]> {
  const url = `${ADS_API_HOST}/${options.apiVersion}/customers/${options.customerId}/googleAds:searchStream`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.accessToken}`,
    'content-type': 'application/json',
  };
  if (options.loginCustomerId) headers['login-customer-id'] = options.loginCustomerId;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: options.query }),
  });
  const text = await res.text();
  if (!res.ok) throw new AdsApiError(res.status, text);

  return flattenSearchStream(JSON.parse(text));
}

/** searchStream returns an array of chunks; callers just want the rows. */
export function flattenSearchStream(payload: unknown): Record<string, unknown>[] {
  const chunks: SearchStreamChunk[] = Array.isArray(payload)
    ? (payload as SearchStreamChunk[])
    : [payload as SearchStreamChunk];
  return chunks.flatMap((chunk) => chunk.results ?? []);
}

/**
 * Accounts the authorizing user can reach **directly**.
 *
 * Access through a manager account shows up as the manager itself, not its
 * children — expand those with a `customer_client` query against the manager.
 */
export async function listAccessibleCustomers(options: {
  apiVersion: string;
  accessToken: string;
}): Promise<string[]> {
  const url = `${ADS_API_HOST}/${options.apiVersion}/customers:listAccessibleCustomers`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { authorization: `Bearer ${options.accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new AdsApiError(res.status, text);
  return parseAccessibleCustomers(JSON.parse(text));
}

/** `{ resourceNames: ["customers/123..."] }` -> `["123..."]`. */
export function parseAccessibleCustomers(payload: unknown): string[] {
  const names = (payload as { resourceNames?: unknown }).resourceNames;
  if (!Array.isArray(names)) return [];
  return names
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.replace(/^customers\//, ''))
    .filter((id) => /^\d+$/.test(id));
}

/**
 * Ask the API which fields exist, instead of guessing from memory or docs
 * (CLAUDE.md: "ชื่อ field ใน GAQL ใช้ GoogleAdsFieldService").
 *
 * Not scoped to a customer — it is metadata about the API version itself.
 */
export async function searchFields(options: {
  apiVersion: string;
  accessToken: string;
  query: string;
}): Promise<Record<string, unknown>[]> {
  const url = `${ADS_API_HOST}/${options.apiVersion}/googleAdsFields:search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: options.query, pageSize: 200 }),
  });
  const text = await res.text();
  if (!res.ok) throw new AdsApiError(res.status, text);
  const body = JSON.parse(text) as { results?: Record<string, unknown>[] };
  return body.results ?? [];
}

export class AdsApiError extends Error {
  override name = 'AdsApiError';
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(explainAdsError(status, body));
  }
}

/**
 * Surface the useful part of a GoogleAdsFailure. The raw body stays on the
 * error object — SPEC §5 wants it kept, not discarded.
 */
export function explainAdsError(status: number, body: string): string {
  let message = '';
  const detailMessages: string[] = [];

  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string;
        status?: string;
        details?: { errors?: { message?: string; errorCode?: Record<string, string> }[] }[];
      };
    };
    message = parsed.error?.message ?? '';
    for (const detail of parsed.error?.details ?? []) {
      for (const err of detail.errors ?? []) {
        const code = err.errorCode ? Object.values(err.errorCode)[0] : undefined;
        detailMessages.push(code ? `${err.message ?? ''} [${code}]`.trim() : (err.message ?? ''));
      }
    }
  } catch {
    message = body.slice(0, 300);
  }

  const hints: Record<number, string> = {
    400: 'คำสั่ง GAQL หรือพารามิเตอร์ไม่ถูกต้อง',
    401: 'access token ใช้ไม่ได้ — ตรวจ refresh token แล้วรัน `pnpm auth:google` ใหม่',
    403:
      'ไม่มีสิทธิ์เข้าถึงบัญชีนี้ — ตรวจว่า (ก) บัญชี Google ที่ให้สิทธิ์เข้าถึง Customer ID นี้ได้จริง ' +
      '(ข) ถ้าเข้าผ่าน MCC ต้องตั้ง LOGIN_CUSTOMER_ID (ค) Cloud project ได้รับสิทธิ์ Explorer ขึ้นไปแล้ว',
    404: 'ไม่พบบัญชีนี้ — ตรวจ Customer ID (ตัวเลข 10 หลักไม่มีขีด)',
    429: 'เกินโควตาการเรียก API ของวันนี้',
    // ณ ก.ย. 2026 Google เลิกใช้ developer token แล้ว (DECISIONS D11) — โค้ดนี้จึงไม่ส่ง header ตัวนั้น
    // ถ้า API ยังบ่นหา developer token แปลว่านโยบายไม่ตรงกับที่ SPEC เข้าใจ ให้บันทึกลง DECISIONS
  };

  const parts = [`Google Ads API ตอบกลับ HTTP ${status}`];
  const hint = hints[status];
  if (hint) parts.push(`— ${hint}`);
  // When nothing could be parsed out, the guessed hint is all the caller would
  // see and it may be actively misleading. Show the body so the real cause is
  // visible (this is how the v26 404 stayed a mystery for a round).
  if (!message && detailMessages.length === 0) {
    const excerpt = body.trim() === '' ? '(ว่างเปล่า)' : body.slice(0, 500);
    parts.push(`\n  body ดิบจาก Google: ${excerpt}`);
  }
  if (/developer.?token/i.test(body)) {
    parts.push(
      '\n  ⚠️ Google ขอ developer token ซึ่ง SPEC เข้าใจว่าถูกยกเลิกไปแล้ว (DECISIONS D11) — ' +
        'ตรวจนโยบายล่าสุดที่ developers.google.com/google-ads/api แล้วบันทึกผลลง docs/DECISIONS.md',
    );
  }
  if (message) parts.push(`\n  ข้อความจาก Google: ${message}`);
  for (const detail of detailMessages) {
    if (detail) parts.push(`\n  · ${detail}`);
  }
  return parts.join(' ');
}
