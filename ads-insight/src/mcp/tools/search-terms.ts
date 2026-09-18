/**
 * `gads_get_search_terms` (SPEC §6.3) — actual queries people typed, and
 * whether each is spending money without converting.
 *
 * Every field is proven against the live account via
 * `test/fixtures/search-terms-30d.json` (M1).
 *
 * Search terms are free text typed by the public — `search_term` is always
 * listed in `meta.untrusted_fields` (SPEC §5.4); nothing in this tool or its
 * caller should ever treat that text as an instruction.
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
    SELECT search_term_view.search_term,
           search_term_view.status,
           campaign.id,
           campaign.name,
           ad_group.id,
           ad_group.name,
           metrics.impressions,
           metrics.clicks,
           metrics.cost_micros,
           metrics.conversions
    FROM search_term_view
    WHERE ${dateClause}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500`;
}

interface SearchTermRow {
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  searchTermView?: { searchTerm?: string; status?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
}

export function registerSearchTermsTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_search_terms',
    {
      title: 'ดูคำค้นจริงของลูกค้า',
      description:
        'คำค้นจริงที่ทำให้แอดแสดง พร้อมสถานะว่าเพิ่มเป็นคีย์เวิร์ดแล้วหรือยัง (added) หรือยังไม่ได้ทำอะไร ' +
        '(none) เรียงตามค่าใช้จ่าย — ธงคำที่จ่ายเงินเยอะแต่ไม่มี conversion เลย เป็นตัวเลือก negative keyword',
      inputSchema: { ...customerIdShape, ...daysShape },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        const rows = (await deps.client.search(customerId, buildQuery(dateRangeClause(range)), {
          trusted: true,
        })) as SearchTermRow[];

        const terms = rows.map((r) => {
          const impressions = Number(r.metrics?.impressions ?? '0');
          const clicks = Number(r.metrics?.clicks ?? '0');
          const cost = microsToUnits(r.metrics?.costMicros ?? '0');
          const conversions = r.metrics?.conversions ?? 0;
          const ctr = safeDivide(clicks, impressions);
          return {
            search_term: r.searchTermView?.searchTerm,
            added_status: r.searchTermView?.status,
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

        const truncated = truncateRows(terms, {
          limit: 50,
          impact: (r) => r.cost,
          buildOthers: (omitted) => ({
            search_term: `(อื่นๆ ${omitted.length} คำค้น)`,
            added_status: undefined,
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

        // "เผางบ": spent enough to matter, zero conversions, at least a
        // handful of clicks (one click at low CPC isn't a pattern yet).
        const burningBudget = terms.filter((t) => t.cost >= 100 && t.conversions === 0 && t.clicks >= 5);
        const warnings: string[] = [];
        if (burningBudget.length > 0) {
          const totalBurned = Math.round(burningBudget.reduce((s, t) => s + t.cost, 0) * 100) / 100;
          warnings.push(
            `${burningBudget.length} คำค้นใช้เงินไปรวม ฿${totalBurned} โดยไม่มี conversion เลยในช่วงนี้ — ลองพิจารณาเพิ่มเป็น negative keyword`,
          );
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
            untrustedFields: ['search_term', 'campaign_name', 'ad_group_name'],
          }),
          rows: truncated.rows,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
