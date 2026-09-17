/**
 * Google Ads API errors → messages a person can act on (CLAUDE.md).
 *
 * Two jobs:
 *  1. turn a `GoogleAdsFailure` into readable Thai, keeping the raw payload so
 *     it can be stored in `error_json` (SPEC §10) — the original is never lost
 *  2. say whether a failure is worth retrying, which is the whole basis of the
 *     backoff in `client.ts`
 *
 * Runtime-agnostic: no Workers or Node APIs (SPEC §2 D1).
 */

/** One entry from `error.details[].errors[]`. */
export interface AdsErrorDetail {
  /** e.g. `authorizationError` → `USER_PERMISSION_DENIED`. */
  codeGroup?: string;
  code?: string;
  message?: string;
  /** Dotted field path when the error points at one, e.g. `operations[0].create.name`. */
  fieldPath?: string;
}

export interface ParsedAdsFailure {
  status: number;
  /** Google's own top-level message. */
  message?: string;
  /** gRPC-style status such as PERMISSION_DENIED. */
  statusName?: string;
  requestId?: string;
  details: AdsErrorDetail[];
}

/**
 * Failures worth retrying after a short wait. Everything else means the
 * request was wrong, not unlucky, and retrying only wastes quota.
 */
const RETRYABLE_HTTP = new Set([408, 500, 502, 503, 504]);

/**
 * Codes that recover on their own within seconds. Note the deliberate absence
 * of `RESOURCE_EXHAUSTED`: that is the daily quota being gone, which will not
 * come back before tomorrow, so retrying it is pure waste. Its short-lived
 * sibling `RESOURCE_TEMPORARILY_EXHAUSTED` is the one to retry.
 */
const RETRYABLE_CODES = new Set([
  'RESOURCE_TEMPORARILY_EXHAUSTED',
  'INTERNAL_ERROR',
  'TRANSIENT_ERROR',
  'DEADLINE_EXCEEDED',
  'CONCURRENT_MODIFICATION',
  'REQUEST_ERROR_UNSPECIFIED',
]);

/** Thai explanations keyed by the specific error code Google returns. */
const CODE_MESSAGES: Record<string, string> = {
  USER_PERMISSION_DENIED:
    'บัญชี Google ที่ใช้อยู่ไม่มีสิทธิ์ในบัญชีโฆษณานี้ — ตรวจสิทธิ์ใน Google Ads หรือถ้าเข้าผ่าน MCC ต้องตั้ง LOGIN_CUSTOMER_ID',
  CUSTOMER_NOT_ENABLED: 'บัญชีโฆษณานี้ยังไม่เปิดใช้งาน หรือถูกระงับอยู่',
  NOT_ADS_USER: 'บัญชี Google นี้ไม่ได้ผูกกับ Google Ads',
  AUTHENTICATION_ERROR: 'access token ใช้ไม่ได้ — ขอ token ใหม่แล้วลองอีกครั้ง',
  OAUTH_TOKEN_EXPIRED: 'access token หมดอายุ — ระบบจะขอใหม่ให้อัตโนมัติ',
  OAUTH_TOKEN_REVOKED: 'สิทธิ์ถูกเพิกถอน — ต้องรัน `pnpm auth:google` ใหม่',
  RESOURCE_EXHAUSTED:
    'ใช้โควตา API ครบของวันนี้แล้ว — รอถึงวันถัดไป หรือขอสิทธิ์ระดับ Basic เพื่อเพิ่มโควตา',
  RESOURCE_TEMPORARILY_EXHAUSTED: 'ยิงถี่เกินไป ระบบจะรอแล้วลองใหม่ให้',
  QUERY_ERROR: 'คำสั่ง GAQL ไม่ถูกต้อง',
  UNRECOGNIZED_FIELD: 'อ้างถึงฟิลด์ที่ไม่มีอยู่ใน API เวอร์ชันนี้ — ตรวจชื่อฟิลด์กับเอกสาร',
  UNEXPECTED_END_OF_QUERY: 'คำสั่ง GAQL ไม่สมบูรณ์',
  REQUIRED: 'ขาดฟิลด์ที่จำเป็น',
  IMMUTABLE_FIELD: 'ฟิลด์นี้แก้ไม่ได้หลังสร้างแล้ว',
  DUPLICATE_NAME: 'ชื่อซ้ำกับของที่มีอยู่แล้ว',
  CONCURRENT_MODIFICATION: 'มีการแก้ไขพร้อมกัน ระบบจะลองใหม่ให้',
  INTERNAL_ERROR: 'Google ขัดข้องชั่วคราว ระบบจะลองใหม่ให้',
  CUSTOMER_NOT_FOUND: 'ไม่พบบัญชีนี้ — ตรวจ Customer ID (ตัวเลข 10 หลักไม่มีขีด)',
};

/** Fallbacks by HTTP status when no specific code is recognised. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'คำสั่งหรือพารามิเตอร์ไม่ถูกต้อง',
  401: 'ยืนยันตัวตนไม่ผ่าน — access token ใช้ไม่ได้',
  403: 'ไม่มีสิทธิ์เข้าถึง — ตรวจสิทธิ์ของบัญชี, LOGIN_CUSTOMER_ID, และระดับสิทธิ์ API ของ Cloud project',
  404: 'ไม่พบสิ่งที่ร้องขอ',
  408: 'หมดเวลารอ',
  429: 'เรียก API ถี่เกินไป หรือเกินโควตา',
  500: 'Google ขัดข้องชั่วคราว',
  502: 'Google ขัดข้องชั่วคราว',
  503: 'บริการไม่พร้อมใช้งานชั่วคราว',
  504: 'Google ตอบกลับช้าเกินไป',
};

export class AdsApiError extends Error {
  override name = 'AdsApiError';

  constructor(
    readonly status: number,
    /** Untouched response body, for `error_json`. */
    readonly raw: string,
    readonly failure: ParsedAdsFailure,
  ) {
    super(describeFailure(failure));
  }

  /** Worth another attempt after a wait? */
  get retryable(): boolean {
    return isRetryable(this.failure);
  }

  /** The specific codes Google returned, for logging and tests. */
  get codes(): string[] {
    return this.failure.details.map((d) => d.code).filter((c): c is string => Boolean(c));
  }

  static fromResponse(status: number, body: string): AdsApiError {
    return new AdsApiError(status, body, parseFailure(status, body));
  }
}

/** Pull the useful parts out of Google's error envelope. */
export function parseFailure(status: number, body: string): ParsedAdsFailure {
  const failure: ParsedAdsFailure = { status, details: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Not JSON — a proxy or gateway page. Keep a short excerpt as the message.
    if (body.trim() !== '') failure.message = body.slice(0, 300);
    return failure;
  }

  // Some endpoints return the envelope wrapped in a single-element array.
  const envelope = (Array.isArray(parsed) ? parsed[0] : parsed) as
    | { error?: Record<string, unknown> }
    | undefined;
  const error = envelope?.error;
  if (!error) return failure;

  if (typeof error['message'] === 'string') failure.message = error['message'];
  if (typeof error['status'] === 'string') failure.statusName = error['status'];

  for (const detail of asArray(error['details'])) {
    const record = detail as Record<string, unknown>;
    if (typeof record['requestId'] === 'string') failure.requestId = record['requestId'];
    for (const entry of asArray(record['errors'])) {
      failure.details.push(parseDetail(entry as Record<string, unknown>));
    }
  }

  return failure;
}

function parseDetail(entry: Record<string, unknown>): AdsErrorDetail {
  const detail: AdsErrorDetail = {};
  if (typeof entry['message'] === 'string') detail.message = entry['message'];

  const errorCode = entry['errorCode'];
  if (errorCode && typeof errorCode === 'object') {
    const [group, code] = Object.entries(errorCode as Record<string, unknown>)[0] ?? [];
    if (group) detail.codeGroup = group;
    if (typeof code === 'string') detail.code = code;
  }

  const location = entry['location'] as { fieldPathElements?: unknown } | undefined;
  const path = asArray(location?.fieldPathElements)
    .map((element) => {
      const el = element as { fieldName?: string; index?: number };
      if (!el.fieldName) return '';
      return el.index === undefined ? el.fieldName : `${el.fieldName}[${el.index}]`;
    })
    .filter(Boolean);
  if (path.length > 0) detail.fieldPath = path.join('.');

  return detail;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isRetryable(failure: ParsedAdsFailure): boolean {
  // A specific code always wins: a 429 can be either a momentary rate limit
  // (retry) or the day's quota being gone (do not).
  for (const detail of failure.details) {
    if (detail.code && RETRYABLE_CODES.has(detail.code)) return true;
    if (detail.code && CODE_MESSAGES[detail.code] && !RETRYABLE_CODES.has(detail.code)) {
      return false;
    }
  }
  if (failure.status === 429) {
    // Unlabelled 429 is treated as a rate limit, which backoff handles.
    return true;
  }
  return RETRYABLE_HTTP.has(failure.status);
}

/** Build the human-readable message, most specific part first. */
export function describeFailure(failure: ParsedAdsFailure): string {
  const lines: string[] = [];

  const first = failure.details.find((d) => d.code && CODE_MESSAGES[d.code]);
  const headline = first?.code
    ? CODE_MESSAGES[first.code]
    : STATUS_MESSAGES[failure.status];
  lines.push(headline ?? `Google Ads API ตอบกลับ HTTP ${failure.status}`);

  for (const detail of failure.details) {
    const parts: string[] = [];
    if (detail.message) parts.push(detail.message);
    if (detail.code) parts.push(`[${detail.code}]`);
    if (detail.fieldPath) parts.push(`ที่ ${detail.fieldPath}`);
    if (parts.length > 0) lines.push(`  · ${parts.join(' ')}`);
  }

  if (failure.details.length === 0 && failure.message) {
    lines.push(`  · ${failure.message}`);
  }

  lines.push(`  (HTTP ${failure.status}${failure.requestId ? `, request ${failure.requestId}` : ''})`);
  return lines.join('\n');
}
