/**
 * `gads_get_performance` (SPEC §6.3) — the flexible performance tool:
 * a level, a date window, and a comparison against the period before it.
 *
 * `campaign` + `segments.date` + every metric field this file selects is
 * proven against the live account via
 * `test/fixtures/campaign-metrics-30d.json` (M1).
 *
 * Scaled back from SPEC's full description for M2: `level` supports
 * `account` (campaign rows summed into one total — built on the same proven
 * query, not a separate `FROM customer ... segments.date` combination this
 * project hasn't verified) and `campaign`. `ad_group` and `keyword` return a
 * clear "not yet" error rather than a query built on an unverified
 * resource+segment combination — SPEC's `segments` list (device, network,
 * week, month) is similarly narrowed to `date` only for now. Widening either
 * is tracked in STATUS.md, not guessed at here.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deltaMetrics, deriveMetrics, sumTotals, type RawTotals } from '../../services/metrics';
import { buildMeta, truncateRows } from '../../services/format';
import {
  customerIdShape,
  daysShape,
  dateRangeClause,
  priorPeriod,
  resolveCustomerId,
  resolveDateRange,
  runTool,
  type DateRange,
  type ToolDeps,
} from './shared';
import { z } from 'zod';

const SUPPORTED_LEVELS = ['account', 'campaign'] as const;
type Level = (typeof SUPPORTED_LEVELS)[number];

function buildQuery(dateClause: string): string {
  return `
    SELECT campaign.id,
           campaign.name,
           segments.date,
           metrics.impressions,
           metrics.clicks,
           metrics.cost_micros,
           metrics.conversions,
           metrics.conversions_value
    FROM campaign
    WHERE ${dateClause}
    ORDER BY segments.date
    LIMIT 1000`;
}

interface PerformanceRow {
  campaign?: { id?: string; name?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
  };
}

function toTotals(r: PerformanceRow): RawTotals {
  return {
    impressions: Number(r.metrics?.impressions ?? '0'),
    clicks: Number(r.metrics?.clicks ?? '0'),
    costMicros: Number(r.metrics?.costMicros ?? '0'),
    conversions: r.metrics?.conversions ?? 0,
    conversionsValue: r.metrics?.conversionsValue ?? 0,
  };
}

async function fetchTotalsByCampaign(
  deps: ToolDeps,
  customerId: string,
  range: DateRange,
): Promise<Map<string, { name: string | undefined; totals: RawTotals }>> {
  const rows = (await deps.client.search(customerId, buildQuery(dateRangeClause(range)), {
    trusted: true,
  })) as PerformanceRow[];

  const byCampaign = new Map<string, { name: string | undefined; totals: RawTotals[] }>();
  for (const r of rows) {
    const id = r.campaign?.id ?? 'unknown';
    const entry = byCampaign.get(id) ?? { name: r.campaign?.name, totals: [] };
    entry.totals.push(toTotals(r));
    byCampaign.set(id, entry);
  }

  const out = new Map<string, { name: string | undefined; totals: RawTotals }>();
  for (const [id, entry] of byCampaign) {
    out.set(id, { name: entry.name, totals: sumTotals(entry.totals) });
  }
  return out;
}

export function registerPerformanceTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_performance',
    {
      title: 'ดูประสิทธิภาพ พร้อมเทียบช่วงก่อนหน้า',
      description:
        'ตัวชี้วัดหลัก (คลิก, ค่าใช้จ่าย, conversion, CTR, CPC, CPA, ROAS) ระดับบัญชีหรือระดับแคมเปญ ' +
        'ในช่วงเวลาที่ระบุ พร้อมเทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน — เวอร์ชันนี้รองรับ level=account/campaign เท่านั้น',
      inputSchema: {
        ...customerIdShape,
        ...daysShape,
        level: z
          .enum(['account', 'campaign', 'ad_group', 'keyword'])
          .optional()
          .describe('ระดับที่จะดู — เวอร์ชันนี้รองรับ account และ campaign เท่านั้น (ค่าเริ่มต้น account)'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days, level }) =>
      runTool(async () => {
        const resolvedLevel = (level ?? 'account') as Level | 'ad_group' | 'keyword';
        if (!SUPPORTED_LEVELS.includes(resolvedLevel as Level)) {
          throw new Error(
            `level="${resolvedLevel}" ยังไม่รองรับในเวอร์ชันนี้ — รองรับเฉพาะ account และ campaign ` +
              '(ad_group/keyword ยังไม่ได้ตรวจ field ชื่อจริงกับ API)',
          );
        }

        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        const compareRange = priorPeriod(range);

        const [current, previous] = await Promise.all([
          fetchTotalsByCampaign(deps, customerId, range),
          fetchTotalsByCampaign(deps, customerId, compareRange),
        ]);

        const currentTotal = sumTotals([...current.values()].map((v) => v.totals));
        const previousTotal = sumTotals([...previous.values()].map((v) => v.totals));
        const summary = deriveMetrics(currentTotal);
        const previousSummary = deriveMetrics(previousTotal);

        let rows: unknown[];
        if (resolvedLevel === 'account') {
          rows = [{ scope: 'account', ...deriveMetrics(currentTotal) }];
        } else {
          const campaignRows = [...current.entries()].map(([id, { name, totals }]) => ({
            campaign_id: id,
            campaign_name: name,
            ...deriveMetrics(totals),
          }));
          const truncated = truncateRows(campaignRows, {
            limit: 500,
            impact: (r) => r.cost,
          });
          rows = truncated.rows;
        }

        return {
          meta: buildMeta({
            customerId,
            accountTz: deps.env.ACCOUNT_TZ,
            dateRange: range,
            compareRange,
            rowCount: rows.length,
            returned: rows.length,
            truncated: false,
            opsUsed: deps.client.opsUsed(),
            ...(resolvedLevel === 'campaign' ? { untrustedFields: ['campaign_name'] } : {}),
          }),
          summary: {
            ...summary,
            delta_pct: deltaMetrics(previousSummary, summary),
          },
          rows,
        };
      }),
  );
}
