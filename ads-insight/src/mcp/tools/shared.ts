/**
 * What every `gads_*` tool has in common (SPEC §6.1).
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AdsClient } from '../../ads/client';
import { AdsApiError } from '../../ads/errors';
import type { AuthProps } from '../../auth/types';
import type { Env } from '../../env';

/** Everything a `register*Tool` function needs — one client, one env, one
 * caller identity, built once per request in `src/mcp/server.ts`. */
export interface ToolDeps {
  client: AdsClient;
  env: Env;
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
export function resolveCustomerId(env: Env, input: string | undefined): string {
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
