/**
 * `gads_get_keywords` (SPEC §6.3) — keyword performance with Quality Score.
 *
 * The core fields (criterion id, keyword text/match type, status,
 * `quality_info.quality_score`, campaign/ad_group id, the four raw metrics)
 * are proven against the live account via `test/fixtures/keywords-30d.json`
 * (M1) — that capture returned 374 rows through exactly this shape.
 * `campaign.name` / `ad_group.name` are added on top of that fixture query
 * (it only selected the ids) — the most basic field on any resource and
 * already proven elsewhere (`campaign.name` in `campaigns.json`).
 *
 * Deliberately **not** included: SPEC also lists the Quality Score
 * *components* (`creative_quality_score`, `post_click_quality_score`,
 * `search_predicted_ctr`). They're not proven against this account, and
 * unlike an enrichment field, a wrong name here would fail the whole
 * query — this account's 374 keywords carry no Quality Score data at all
 * yet (STATUS.md), so there was nothing to verify them against. Follow-up:
 * run `pnpm fields quality_info` before adding them (CLAUDE.md — never
 * guess a field name that can take the rest of the query down with it).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { microsToUnits, round1, safeDivide } from '../../ads/money';
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
    SELECT ad_group_criterion.criterion_id,
           ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type,
           ad_group_criterion.status,
           ad_group_criterion.quality_info.quality_score,
           campaign.id,
           campaign.name,
           ad_group.id,
           ad_group.name,
           metrics.impressions,
           metrics.clicks,
           metrics.cost_micros,
           metrics.conversions
    FROM keyword_view
    WHERE ${dateClause}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500`;
}

interface KeywordRow {
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  adGroupCriterion?: {
    criterionId?: string;
    status?: string;
    keyword?: { text?: string; matchType?: string };
    qualityInfo?: { qualityScore?: number };
  };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
}

export function registerKeywordsTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_keywords',
    {
      title: 'ดูประสิทธิภาพคีย์เวิร์ด',
      description:
        'คีย์เวิร์ดทั้งหมดพร้อม Quality Score, ประสิทธิภาพ (คลิก, ค่าใช้จ่าย, CTR, CPC), เรียงตาม ' +
        'ค่าใช้จ่ายมากไปน้อย — ธงคีย์เวิร์ดที่ impression เยอะแต่ CTR ต่ำมาก และคีย์เวิร์ดที่ QS ต่ำแต่เผางบเยอะ',
      inputSchema: { ...customerIdShape, ...daysShape },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        const rows = (await deps.client.search(customerId, buildQuery(dateRangeClause(range)), {
          trusted: true,
        })) as KeywordRow[];

        const keywords = rows.map((r) => {
          const impressions = Number(r.metrics?.impressions ?? '0');
          const clicks = Number(r.metrics?.clicks ?? '0');
          const cost = microsToUnits(r.metrics?.costMicros ?? '0');
          const conversions = r.metrics?.conversions ?? 0;
          const ctr = safeDivide(clicks, impressions);
          const q = r.adGroupCriterion?.qualityInfo;
          return {
            criterion_id: r.adGroupCriterion?.criterionId,
            text: r.adGroupCriterion?.keyword?.text,
            match_type: r.adGroupCriterion?.keyword?.matchType,
            status: r.adGroupCriterion?.status,
            quality_score: q?.qualityScore,
            campaign_id: r.campaign?.id,
            campaign_name: r.campaign?.name,
            ad_group_id: r.adGroup?.id,
            ad_group_name: r.adGroup?.name,
            impressions,
            clicks,
            cost: Math.round(cost * 100) / 100,
            conversions,
            ctr_pct: ctr === undefined ? undefined : round1(ctr * 100),
          };
        });

        const truncated = truncateRows(keywords, {
          limit: 50,
          impact: (r) => r.cost,
          buildOthers: (omitted) => ({
            criterion_id: undefined,
            text: `(อื่นๆ ${omitted.length} คำ)`,
            match_type: undefined,
            status: undefined,
            quality_score: undefined,
            campaign_id: undefined,
            campaign_name: undefined,
            ad_group_id: undefined,
            ad_group_name: undefined,
            impressions: omitted.reduce((s, r) => s + r.impressions, 0),
            clicks: omitted.reduce((s, r) => s + r.clicks, 0),
            cost: Math.round(omitted.reduce((s, r) => s + r.cost, 0) * 100) / 100,
            conversions: omitted.reduce((s, r) => s + r.conversions, 0),
            ctr_pct: undefined,
          }),
        });

        const noImpressionsEver = keywords.filter((k) => k.impressions === 0).length;
        const highImpressionsNoClicks = keywords.filter(
          (k) => k.impressions >= 1000 && k.clicks === 0,
        ).length;
        const warnings: string[] = [];
        if (highImpressionsNoClicks > 0) {
          warnings.push(
            `${highImpressionsNoClicks} คำมี impression ≥1,000 แต่ไม่มีคลิกเลยในช่วงนี้ — คำอาจไม่ตรงเจตนาคนค้น`,
          );
        }
        if (noImpressionsEver > 0) {
          warnings.push(`${noImpressionsEver} คำไม่เคยแสดงผลเลยในช่วงนี้`);
        }

        return {
          meta: buildMeta({
            customerId,
            accountTz: deps.env.ACCOUNT_TZ,
            dateRange: range,
            rowCount: truncated.row_count,
            returned: truncated.returned,
            truncated: truncated.truncated,
            opsUsed: deps.client.opsUsed(),
            untrustedFields: ['text', 'campaign_name', 'ad_group_name'],
          }),
          rows: truncated.rows,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
