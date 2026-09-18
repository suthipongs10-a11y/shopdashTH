/**
 * `gads_get_ads` (SPEC §6.3) — Responsive Search Ad content and performance.
 *
 * The base ad/campaign/ad_group identity fields and the four metrics are the
 * same fields already proven elsewhere in this project (`campaign.id/name`,
 * `ad_group.id/name`, `metrics.*`).
 *
 * `ad_group_ad.ad.responsive_search_ad.headlines/descriptions`,
 * `ad_group_ad.ad_strength` and `ad_group_ad.policy_summary.approval_status`
 * are **not** fixture-proven — this account's ads were never captured. They
 * are included anyway because RSA content is most of this tool's point and
 * these are long-stable, heavily-documented parts of the API, unlike the
 * quality-score components left out of `gads_get_keywords` — but unlike
 * every other query in this file, run `pnpm fields responsive_search_ad`
 * and `pnpm fields ad_strength` against the real account before trusting
 * this one (CLAUDE.md — check, don't guess). If any of the three reject,
 * `runTool`'s error path surfaces Google's exact rejection so the field name
 * to fix is never a mystery (the same "always show the raw body" rule that
 * caught the campaigns.json date-field mistake in M1).
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
    SELECT ad_group_ad.ad.id,
           ad_group_ad.ad.type,
           ad_group_ad.status,
           ad_group_ad.ad_strength,
           ad_group_ad.policy_summary.approval_status,
           ad_group_ad.ad.responsive_search_ad.headlines,
           ad_group_ad.ad.responsive_search_ad.descriptions,
           campaign.id,
           campaign.name,
           ad_group.id,
           ad_group.name,
           metrics.impressions,
           metrics.clicks,
           metrics.cost_micros,
           metrics.conversions
    FROM ad_group_ad
    WHERE ${dateClause}
      AND ad_group_ad.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 200`;
}

interface AssetText {
  text?: string;
  pinnedField?: string;
}

interface AdRow {
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  adGroupAd?: {
    status?: string;
    adStrength?: string;
    policySummary?: { approvalStatus?: string };
    ad?: {
      id?: string;
      type?: string;
      responsiveSearchAd?: { headlines?: AssetText[]; descriptions?: AssetText[] };
    };
  };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
}

export function registerAdsTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_ads',
    {
      title: 'ดูเนื้อหาและประสิทธิภาพของแอด',
      description:
        'เนื้อหาแอด (headline/description ของ Responsive Search Ad), ad strength, สถานะการอนุมัติ ' +
        'จาก Google, และประสิทธิภาพ — เนื้อหาแอดเป็นข้อความที่ร้านเขียนเอง ไม่ใช่ข้อมูลจากลูกค้า',
      inputSchema: { ...customerIdShape, ...daysShape },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id, days }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const range = resolveDateRange(deps.env.ACCOUNT_TZ, days);
        const rows = (await deps.client.search(customerId, buildQuery(dateRangeClause(range)), {
          trusted: true,
        })) as AdRow[];

        const ads = rows.map((r) => {
          const impressions = Number(r.metrics?.impressions ?? '0');
          const clicks = Number(r.metrics?.clicks ?? '0');
          const cost = microsToUnits(r.metrics?.costMicros ?? '0');
          const ctr = safeDivide(clicks, impressions);
          const rsa = r.adGroupAd?.ad?.responsiveSearchAd;
          return {
            ad_id: r.adGroupAd?.ad?.id,
            ad_type: r.adGroupAd?.ad?.type,
            status: r.adGroupAd?.status,
            ad_strength: r.adGroupAd?.adStrength,
            approval_status: r.adGroupAd?.policySummary?.approvalStatus,
            headlines: rsa?.headlines?.map((h) => h.text).filter((t): t is string => Boolean(t)),
            descriptions: rsa?.descriptions
              ?.map((d) => d.text)
              .filter((t): t is string => Boolean(t)),
            campaign_id: r.campaign?.id,
            campaign_name: r.campaign?.name,
            ad_group_id: r.adGroup?.id,
            ad_group_name: r.adGroup?.name,
            impressions,
            clicks,
            cost: Math.round(cost * 100) / 100,
            conversions: r.metrics?.conversions ?? 0,
            ctr_pct: ctr === undefined ? undefined : round1(ctr * 100),
          };
        });

        const truncated = truncateRows(ads, { limit: 50, impact: (r) => r.cost });

        const disapproved = ads.filter(
          (a) => a.approval_status && a.approval_status !== 'APPROVED',
        );
        const warnings: string[] = [];
        if (disapproved.length > 0) {
          warnings.push(`${disapproved.length} แอดยังไม่ผ่านการอนุมัติเต็มรูปแบบจาก Google`);
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
            untrustedFields: ['headlines', 'descriptions', 'campaign_name', 'ad_group_name'],
          }),
          rows: truncated.rows,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
