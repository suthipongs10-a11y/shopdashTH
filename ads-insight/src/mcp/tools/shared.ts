/**
 * What every `gads_*` tool has in common (SPEC §6.1).
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AdsClient } from '../../ads/client';
import { AdsApiError } from '../../ads/errors';
import type { AuthProps } from '../../auth/types';

/**
 * The only two `Env` fields any tool reads. Named locally rather than
 * importing the real `Env` (which carries the ambient `D1Database` /
 * `KVNamespace` types `tsconfig.scripts.json` deliberately excludes — same
 * reasoning as `PendingLoginStore` in `src/auth/pending-login.ts`), so tool
 * tests build a plain object instead of needing `@cloudflare/workers-types`
 * in scope. A real `Env` satisfies this structurally; `src/mcp/server.ts`
 * passes it through unchanged.
 */
export interface ToolEnv {
  DEFAULT_CUSTOMER_ID: string;
  ACCOUNT_TZ: string;
}

/** Everything a `register*Tool` function needs — one client, one env, one
 * caller identity, built once per request in `src/mcp/server.ts`. */
export interface ToolDeps {
  client: AdsClient;
  env: ToolEnv;
  auth: AuthProps;
}

/**
 * SPEC §6.1 point 7: "ทุก tool รับ `customer_id?` (default = `DEFAULT_CUSTOMER_ID`)".
 * Spread this into every tool's input shape rather than repeating the
 * z.string() + description at each call site.
 */
export const customerIdShape = {
  customer_id: z
    .string()
    .optional()
    .describe(
      'Customer ID ของบัญชี Google Ads (ตัวเลข 10 หลัก) — ถ้าไม่ระบุ ใช้บัญชีหลักของระบบ',
    ),
};

/** Pick the account a tool call should read: the caller's override, or the
 * server's default. Format validation happens inside `AdsClient` itself. */
export function resolveCustomerId(env: Pick<ToolEnv, 'DEFAULT_CUSTOMER_ID'>, input: string | undefined): string {
  const trimmed = input?.trim();
  return trimmed && trimmed !== '' ? trimmed : env.DEFAULT_CUSTOMER_ID;
}

/** A tool's successful result: JSON, exactly as SPEC §6.2 shapes it. */
export function toolResult(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

/**
 * A tool's failure result.
 *
 * MCP tool errors are reported *in* the result (`isError: true`), not as a
 * JSON-RPC protocol error — that is what lets the calling model see the
 * message and adjust, rather than the call just failing opaquely. Google Ads
 * errors already carry a Thai explanation (`src/ads/errors.ts`); anything
 * else still gets a message, never a bare stack trace (CLAUDE.md, SPEC §11
 * "ไม่มีหน้าใดแสดง raw error" applies here too).
 */
export function toolError(err: unknown): CallToolResult {
  const message =
    err instanceof AdsApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Run a tool's body, turning any throw into a proper tool-error result
 * instead of an unhandled rejection the transport would have to guess about. */
export async function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return toolResult(await fn());
  } catch (err) {
    return toolError(err);
  }
}

/** Shared by every tool that takes a trailing window of days rather than an
 * explicit start/end — SPEC's own tool table talks about "30 วัน" windows,
 * not calendar-picker ranges. */
export const daysShape = {
  days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .optional()
    .describe('จำนวนวันย้อนหลัง (ค่าเริ่มต้น 30, สูงสุด 90) — นับถึงเมื่อวาน'),
};

export interface DateRange {
  start: string;
  end: string;
}

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` for "today" in `timeZone`, matching how Google reports
 * `segments.date` (a calendar date in the account's own time zone). */
function todayIso(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve a `days` input into an explicit `{start, end}` window ending
 * yesterday, in the account's own time zone — matching Google's own
 * definition of `LAST_N_DAYS` (today itself is excluded: today's data is
 * still arriving). Building the literal dates here, rather than passing
 * GAQL's `DURING LAST_30_DAYS` straight through, means the tool can put the
 * *exact* dates in `meta.date_range` (SPEC §6.2) without re-deriving them
 * from a keyword.
 */
export function resolveDateRange(accountTz: string, days: number | undefined): DateRange {
  const n = days ?? 30;
  const end = addDays(todayIso(accountTz), -1);
  const start = addDays(end, -(n - 1));
  return { start, end };
}

/** The period immediately before `range`, the same length — SPEC §6.2's
 * `compare_range`, used for every tool's `delta_pct`. */
export function priorPeriod(range: DateRange): DateRange {
  const lengthDays = Math.round(
    (new Date(`${range.end}T00:00:00Z`).getTime() - new Date(`${range.start}T00:00:00Z`).getTime()) /
      DAY_MS,
  ) + 1;
  return { start: addDays(range.start, -lengthDays), end: addDays(range.start, -1) };
}

/** `segments.date BETWEEN '...' AND '...'` — the one place this literal
 * gets built, so every tool filters dates the same way. */
export function dateRangeClause(range: DateRange): string {
  return `segments.date BETWEEN '${range.start}' AND '${range.end}'`;
}
