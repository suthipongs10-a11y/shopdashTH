/**
 * `gads_get_impression_share` (SPEC §6.3) — per campaign, how much
 * available impression share is lost to budget vs. to rank.
 *
 * All three metric fields are proven against the live account via
 * `test/fixtures/campaign-metrics-30d.json` (M1) — the same query shape
 * this tool builds is exactly what was captured there.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { microsToUnits, round1 } from '../../ads/money';
import { buildMeta, truncateRows } from '../../services/format';
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
           metrics.impressions,
           metrics.cost_micros,
           metrics.search_impression_share,
           metrics.search_budget_lost_impression_share,
           metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE ${dateClause}
      AND campaign.advertising_channel_type = 'SEARCH'
    LIMIT 500`;
}

interface ImpressionShareRow {
  campaign?: { id?: string; name?: string };
  metrics?: {
    impressions?: string;
    costMicros?: string;
    searchImpressionShare?: number;
    searchBudgetLostImpressionShare?: number;
    searchRankLostImpressionShare?: number;
  };
}

export function registerImpressionShareTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_impression_share',
    {
      title: 'ดูส่วนแบ่ง impression ที่เสียไป',
      description:
        'Impression share ของแคมเปญ Search แต่ละตัว แยกว่าเสียเพราะงบไม่พอ (budget) หรือเสียเพราะ ' +
        'อันดับ/บิดสู้ไม่ไหว (rank) — เฉพาะแคมเปญประเภท Search เพราะ field ชุดนี้มีความหมายเฉพาะ search auction',
      inputSchema: { ...customerIdShape, ...daysShape },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        const rows = (await deps.client.search(customerId, buildQuery(dateRangeClause(range)), {
          trusted: true,
        })) as ImpressionShareRow[];

        const perCampaign = rows
          .filter((r) => Number(r.metrics?.impressions ?? '0') > 0)
          .map((r) => {
            const m = r.metrics ?? {};
            const won = m.searchImpressionShare;
            const lostBudget = m.searchBudgetLostImpressionShare;
            const lostRank = m.searchRankLostImpressionShare;
            return {
              campaign_id: r.campaign?.id,
              campaign_name: r.campaign?.name,
              impressions: Number(m.impressions ?? '0'),
              cost: Math.round(microsToUnits(m.costMicros ?? '0') * 100) / 100,
              // Google reports these as 0-1 fractions; SPEC §6.1 wants 0-100.
              impression_share_pct: won === undefined ? undefined : round1(won * 100),
              lost_to_budget_pct: lostBudget === undefined ? undefined : round1(lostBudget * 100),
              lost_to_rank_pct: lostRank === undefined ? undefined : round1(lostRank * 100),
            };
          });

        const truncated = truncateRows(perCampaign, {
          limit: 500,
          impact: (r) => r.cost,
        });

        const worstBudgetLoss = [...perCampaign]
          .filter((r) => r.lost_to_budget_pct !== undefined)
          .sort((a, b) => (b.lost_to_budget_pct ?? 0) - (a.lost_to_budget_pct ?? 0))[0];
        const warnings: string[] = [];
        if (worstBudgetLoss && (worstBudgetLoss.lost_to_budget_pct ?? 0) >= 20) {
          warnings.push(
            `${worstBudgetLoss.campaign_name} เสีย impression share ${worstBudgetLoss.lost_to_budget_pct}% เพราะงบไม่พอ — พิจารณาเพิ่มงบถ้าอยากได้ traffic เพิ่ม`,
          );
        }

        return {
          meta: {
            ...buildMeta({
              customerId,
              accountTz: deps.env.ACCOUNT_TZ,
              dateRange: range,
              rowCount: truncated.row_count,
              returned: truncated.returned,
              truncated: truncated.truncated,
              opsUsed: deps.client.opsUsed(),
              untrustedFields: ['campaign_name'],
            }),
          },
          rows: truncated.rows,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
