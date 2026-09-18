/**
 * `gads_get_time_performance` (SPEC §6.3) — performance by hour × day of
 * week, for deciding whether an ad schedule would help.
 *
 * `campaign.id`, `segments.hour`, `segments.day_of_week`,
 * `metrics.clicks/cost_micros/conversions` are proven against the live
 * account via `test/fixtures/hour-of-day-30d.json` (M1). `metrics
 * .impressions` is added on top of that (needed for CTR) — not itself
 * captured at this exact segment combination, but it is the single most
 * standard metric field in the API and already proven at the same
 * `campaign` resource level in every other query in this file.
 *
 * Scaled back from SPEC's full description for M2: rolling low-data hours
 * into 3-hour buckets and cross-referencing the *current* ad schedule
 * (`campaign_criterion` with criterion type `AD_SCHEDULE`) are both left for
 * a follow-up rather than guessed at now — the second needs its own query
 * against a resource this project hasn't touched yet.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { microsToUnits, round1, safeDivide } from '../../ads/money';
import { buildMeta } from '../../services/format';
import {
  customerIdShape,
  daysShape,
  dateRangeClause,
  resolveCustomerId,
  resolveDateRange,
  runTool,
  type ToolDeps,
} from './shared';

function buildQuery(dateClause: string): string {
  return `
    SELECT campaign.id,
           campaign.name,
           segments.hour,
           segments.day_of_week,
           metrics.impressions,
           metrics.clicks,
           metrics.cost_micros,
           metrics.conversions
    FROM campaign
    WHERE ${dateClause}
    LIMIT 1000`;
}

interface TimeRow {
  campaign?: { id?: string; name?: string };
  segments?: { hour?: number; dayOfWeek?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
}

const DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export function registerTimePerformanceTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_time_performance',
    {
      title: 'ดูประสิทธิภาพตามชั่วโมงและวันในสัปดาห์',
      description:
        'ตารางคลิก/ค่าใช้จ่าย/conversion แยกตามชั่วโมง × วันในสัปดาห์ ทุกแคมเปญรวมกัน (หรือระบุ ' +
        'campaign_id เดียว) — ใช้ดูว่าช่วงไหนคุ้มค่าที่สุด ก่อนจะตั้ง ad schedule',
      inputSchema: {
        ...customerIdShape,
        ...daysShape,
        campaign_id: z
          .string()
          .optional()
          .describe('ระบุถ้าต้องการดูเฉพาะแคมเปญเดียว — ไม่ระบุ = รวมทุกแคมเปญ'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days, campaign_id }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        let query = buildQuery(dateRangeClause(range));
        if (campaign_id) {
          query = query.replace('LIMIT 1000', `AND campaign.id = ${Number(campaign_id)}\n    LIMIT 1000`);
        }
        const rows = (await deps.client.search(customerId, query, {
          trusted: true,
        })) as TimeRow[];

        // Aggregate across campaigns into one cell per (day, hour) — a
        // single campaign_id filter already narrows to one campaign above,
        // so this sum is either "everything" or "just that campaign".
        const cells = new Map<
          string,
          { day: string; hour: number; impressions: number; clicks: number; costMicros: number; conversions: number }
        >();
        for (const r of rows) {
          const day = r.segments?.dayOfWeek ?? 'UNKNOWN';
          const hour = r.segments?.hour ?? 0;
          const key = `${day}:${hour}`;
          const cell = cells.get(key) ?? {
            day,
            hour,
            impressions: 0,
            clicks: 0,
            costMicros: 0,
            conversions: 0,
          };
          cell.impressions += Number(r.metrics?.impressions ?? '0');
          cell.clicks += Number(r.metrics?.clicks ?? '0');
          cell.costMicros += Number(r.metrics?.costMicros ?? '0');
          cell.conversions += r.metrics?.conversions ?? 0;
          cells.set(key, cell);
        }

        const table = [...cells.values()]
          .filter((c) => c.clicks > 0 || c.impressions > 0)
          .sort((a, b) => DAY_ORDER.indexOf(a.day as (typeof DAY_ORDER)[number]) -
              DAY_ORDER.indexOf(b.day as (typeof DAY_ORDER)[number]) || a.hour - b.hour)
          .map((c) => {
            const cost = microsToUnits(c.costMicros);
            const ctr = safeDivide(c.clicks, c.impressions);
            return {
              day_of_week: c.day,
              hour: c.hour,
              impressions: c.impressions,
              clicks: c.clicks,
              cost: Math.round(cost * 100) / 100,
              conversions: c.conversions,
              ctr_pct: ctr === undefined ? undefined : round1(ctr * 100),
            };
          });

        const lowDataCells = table.filter((c) => c.clicks > 0 && c.clicks < 5).length;
        const warnings: string[] = [];
        if (lowDataCells > 0) {
          warnings.push(
            `${lowDataCells} ช่วงเวลามีคลิกน้อยกว่า 5 ครั้งในช่วงนี้ — ตัวเลข CTR ของช่วงนั้นอาจไม่นิ่ง`,
          );
        }

        return {
          meta: buildMeta({
            customerId,
            accountTz: deps.env.ACCOUNT_TZ,
            dateRange: range,
            rowCount: table.length,
            returned: table.length,
            truncated: false,
            opsUsed: deps.client.opsUsed(),
          }),
          rows: table,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
