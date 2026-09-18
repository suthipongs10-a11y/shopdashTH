/**
 * `gads_run_gaql` (SPEC §6.3) — the escape hatch when none of the other
 * read tools cover what's needed. Read-only by construction: `AdsClient
 * .search()` runs every query it doesn't mark `trusted` through
 * `validateRawGaql` (`src/ads/gaql.ts`), which rejects anything but a single
 * `SELECT`, checks every field against the resource allowlist, and caps
 * `LIMIT` at 1000 — this tool passes the caller's query straight through
 * without that flag, so none of that is re-implemented here.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { customerIdShape, resolveCustomerId, runTool, type ToolDeps } from './shared';

export function registerRunGaqlTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_run_gaql',
    {
      title: 'รัน GAQL query อิสระ',
      description:
        'รัน Google Ads Query Language (GAQL) query แบบอิสระ สำหรับกรณีที่ tool อื่นไม่ครอบคลุม ' +
        'อนุญาตเฉพาะคำสั่ง SELECT เดียว บังคับ LIMIT ไม่เกิน 1000 และตรวจชื่อ field กับ allowlist ' +
        'ก่อนส่งไป Google — คำสั่งที่ไม่ผ่านจะถูกปฏิเสธก่อนถึง API เสมอ',
      inputSchema: {
        ...customerIdShape,
        query: z
          .string()
          .min(1)
          .describe('GAQL เต็ม เช่น "SELECT campaign.id, campaign.name FROM campaign"'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, query }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const rows = await deps.client.search(customerId, query);
        return {
          meta: {
            customer_id: customerId,
            row_count: rows.length,
            // A free-form query can select anything, so every value in the
            // result — not just a known few keys — may be account-authored
            // text (SPEC §5.4).
            untrusted_fields: ['*'],
          },
          rows,
        };
      }),
  );
}
