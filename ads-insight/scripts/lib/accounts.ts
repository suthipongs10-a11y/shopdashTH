/**
 * Shaping and recommending Google Ads account settings (M0, SPEC §4 step 6).
 *
 * Pure functions only — no network, no file access — so the interesting logic
 * is unit-testable without a live account. `scripts/list-accounts.ts` supplies
 * the API responses.
 */
import { formatCustomerId } from './customer-id';

export interface AccountSummary {
  id: string;
  name?: string;
  currency?: string;
  timeZone?: string;
  isManager: boolean;
  isTest: boolean;
  isHidden: boolean;
  status?: string;
  /** Depth under the manager the query ran against; 0 = the manager itself. */
  level: number;
}

/** Google Ads REST returns int64 fields as strings; booleans may be absent. */
function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return fallback;
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** A row from `SELECT customer.* FROM customer`. */
export function parseCustomerRow(row: Record<string, unknown>): AccountSummary | undefined {
  const c = row['customer'] as Record<string, unknown> | undefined;
  const id = toText(c?.['id']);
  if (!c || !id) return undefined;
  return {
    id,
    ...(toText(c['descriptiveName']) ? { name: toText(c['descriptiveName'])! } : {}),
    ...(toText(c['currencyCode']) ? { currency: toText(c['currencyCode'])! } : {}),
    ...(toText(c['timeZone']) ? { timeZone: toText(c['timeZone'])! } : {}),
    isManager: c['manager'] === true,
    isTest: c['testAccount'] === true,
    isHidden: false,
    level: 0,
  };
}

/** A row from `SELECT customer_client.* FROM customer_client`. */
export function parseCustomerClientRow(row: Record<string, unknown>): AccountSummary | undefined {
  const c = row['customerClient'] as Record<string, unknown> | undefined;
  const id = toText(c?.['id']);
  if (!c || !id) return undefined;
  return {
    id,
    ...(toText(c['descriptiveName']) ? { name: toText(c['descriptiveName'])! } : {}),
    ...(toText(c['currencyCode']) ? { currency: toText(c['currencyCode'])! } : {}),
    ...(toText(c['timeZone']) ? { timeZone: toText(c['timeZone'])! } : {}),
    isManager: c['manager'] === true,
    isTest: c['testAccount'] === true,
    isHidden: c['hidden'] === true,
    ...(toText(c['status']) ? { status: toText(c['status'])! } : {}),
    level: toNumber(c['level'], 0),
  };
}

/**
 * Shallowest first, then managers, then real accounts before test accounts,
 * then by name. Test accounts sort last because they are never the account
 * you are looking for when picking DEFAULT_CUSTOMER_ID.
 */
export function sortAccounts(accounts: AccountSummary[]): AccountSummary[] {
  return [...accounts].sort(
    (a, b) =>
      a.level - b.level ||
      Number(b.isManager) - Number(a.isManager) ||
      Number(a.isTest) - Number(b.isTest) ||
      (a.name ?? '').localeCompare(b.name ?? '') ||
      a.id.localeCompare(b.id),
  );
}

/** Drop duplicates that appear in more than one manager's tree, keeping the shallowest. */
export function dedupeAccounts(accounts: AccountSummary[]): AccountSummary[] {
  const byId = new Map<string, AccountSummary>();
  for (const account of accounts) {
    const existing = byId.get(account.id);
    if (!existing || account.level < existing.level) byId.set(account.id, account);
  }
  return [...byId.values()];
}

/** One display line per account, indented by hierarchy level. */
export function formatAccountLine(account: AccountSummary): string {
  const indent = '  '.repeat(account.level);
  const labels: string[] = [];
  if (account.isManager) labels.push('MCC');
  if (account.isTest) labels.push('test');
  if (account.isHidden) labels.push('ซ่อน');
  if (account.status && account.status !== 'ENABLED') labels.push(account.status);

  const parts = [
    `${indent}${formatCustomerId(account.id)}`,
    account.name ?? '(ไม่มีชื่อ)',
    [account.currency, account.timeZone].filter(Boolean).join(' · ') || undefined,
    labels.length > 0 ? `[${labels.join(', ')}]` : undefined,
  ].filter(Boolean);

  return parts.join('  ');
}

export type RecommendationKey =
  | 'DEFAULT_CUSTOMER_ID'
  | 'LOGIN_CUSTOMER_ID'
  | 'TEST_CUSTOMER_ID';

export interface Recommendation {
  DEFAULT_CUSTOMER_ID?: string;
  LOGIN_CUSTOMER_ID?: string;
  TEST_CUSTOMER_ID?: string;
  /**
   * Why a value was left blank. An empty LOGIN_CUSTOMER_ID is usually the
   * correct answer rather than a gap, so the caller must not print the same
   * "pick one yourself" hint for every blank.
   */
  emptyReasons: Partial<Record<RecommendationKey, string>>;
  notes: string[];
}

/**
 * Suggest the wrangler.toml values from what the token can actually reach.
 *
 * Rules, in the order the spec cares about (SPEC §4 step 6):
 * - a manager account can never be DEFAULT_CUSTOMER_ID — it has no performance
 *   data of its own; it becomes LOGIN_CUSTOMER_ID instead
 * - test accounts are for TEST_CUSTOMER_ID, never the working account
 * - when several real accounts qualify, pick none and say so rather than guess
 */
export function recommendSettings(
  accounts: AccountSummary[],
  /** Which top-level account each one was reached through, by id. */
  reachedVia: Map<string, string> = new Map(),
): Recommendation {
  const notes: string[] = [];
  const emptyReasons: Partial<Record<RecommendationKey, string>> = {};
  const visible = accounts.filter((a) => !a.isHidden && (a.status ?? 'ENABLED') === 'ENABLED');

  const testAccounts = visible.filter((a) => a.isTest && !a.isManager);
  const realAccounts = visible.filter((a) => !a.isTest && !a.isManager);

  const recommendation: Recommendation = { emptyReasons, notes };

  if (realAccounts.length === 1) {
    const account = realAccounts[0]!;
    recommendation.DEFAULT_CUSTOMER_ID = account.id;
    const via = reachedVia.get(account.id);
    if (via && via !== account.id) {
      recommendation.LOGIN_CUSTOMER_ID = via;
      notes.push(`เข้าผ่าน MCC ${formatCustomerId(via)} — ต้องตั้ง LOGIN_CUSTOMER_ID ด้วย`);
    } else {
      emptyReasons.LOGIN_CUSTOMER_ID = 'ถูกแล้ว — เข้าบัญชีตรง ไม่ได้ผ่าน MCC';
    }
  } else if (realAccounts.length === 0) {
    notes.push(
      'ไม่พบบัญชีโฆษณาจริงที่ใช้งานได้เลย — ตรวจว่า Gmail ที่ใช้ล็อกอินมีสิทธิ์ในบัญชี Google Ads จริง',
    );
    emptyReasons.DEFAULT_CUSTOMER_ID = 'ไม่พบบัญชีโฆษณาจริง';
    emptyReasons.LOGIN_CUSTOMER_ID = 'ยังระบุไม่ได้จนกว่าจะรู้บัญชีหลัก';
  } else {
    notes.push(
      `พบบัญชีโฆษณาจริง ${realAccounts.length} บัญชี — เลือกเองว่าจะใช้ตัวไหนเป็น DEFAULT_CUSTOMER_ID ` +
        '(รอบแรกของโปรเจ็คนี้รองรับบัญชีเดียว ดู SPEC §2 D10)',
    );
    emptyReasons.DEFAULT_CUSTOMER_ID = 'เลือกเอง ดูผังด้านบน';
    emptyReasons.LOGIN_CUSTOMER_ID = 'ตั้งเป็น MCC ถ้าบัญชีที่เลือกอยู่ใต้ MCC มิฉะนั้นเว้นว่าง';
  }

  if (testAccounts.length >= 1) {
    recommendation.TEST_CUSTOMER_ID = testAccounts[0]!.id;
    if (testAccounts.length > 1) {
      notes.push(`พบ test account ${testAccounts.length} ตัว — เลือกมาตัวเดียว`);
    }
  } else {
    notes.push(
      'ยังไม่พบ test account — ต้องสร้างก่อนถึง M4 เพราะห้ามทดสอบ mutate กับบัญชีจริง (CLAUDE.md)',
    );
    emptyReasons.TEST_CUSTOMER_ID = 'ยังไม่มี test account — สร้างก่อนถึง M4';
  }

  const nonThb = visible.filter((a) => !a.isManager && a.currency && a.currency !== 'THB');
  for (const account of nonThb) {
    notes.push(
      `${formatCustomerId(account.id)} ใช้สกุลเงิน ${account.currency} ไม่ใช่ THB — ` +
        'ระบบสมมติว่าเป็นบาท ให้บันทึกเรื่องนี้ใน docs/DECISIONS.md',
    );
  }

  return recommendation;
}
