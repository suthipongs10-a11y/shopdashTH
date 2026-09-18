/**
 * `gads_get_account_overview` (SPEC §6.3) — the "start here" tool: account
 * identity, every campaign with its budget and status, current API quota.
 *
 * `customer.*` fields are proven via `scripts/check-access.ts` (Gate M0);
 * the campaign/budget fields are proven via `test/fixtures/campaigns.json`
 * (M1) — that capture returned 8 campaigns through exactly this shape.
 *
 * Deliberately missing three sections SPEC's table lists for this tool:
 * goals, pending alerts, pending change sets. All three read from D1
 * (`goals`, `alerts`, `change_sets` — SPEC §10), which does not exist before
 * M3. Rather than return empty arrays that look like "no goals set" when the
 * real answer is "this feature doesn't exist yet," they're left out of the
 * response entirely and `meta.not_yet_available` names them.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { microsToUnits } from '../../ads/money';
import { customerIdShape, resolveCustomerId, runTool, type ToolDeps } from './shared';

const CUSTOMER_QUERY = `
  SELECT customer.id,
         customer.descriptive_name,
         customer.currency_code,
         customer.time_zone,
         customer.auto_tagging_enabled,
         customer.manager,
         customer.test_account
  FROM customer`;

const CAMPAIGNS_QUERY = `
  SELECT campaign.id,
         campaign.name,
         campaign.status,
         campaign.advertising_channel_type,
         campaign.bidding_strategy_type,
         campaign_budget.amount_micros
  FROM campaign
  ORDER BY campaign.id
  LIMIT 200`;

interface CustomerRow {
  customer?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
    autoTaggingEnabled?: boolean;
    manager?: boolean;
    testAccount?: boolean;
  };
}

interface CampaignRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    biddingStrategyType?: string;
  };
  campaignBudget?: { amountMicros?: string };
}

export function registerAccountOverviewTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_account_overview',
    {
      title: 'ภาพรวมบัญชี',
      description:
        'ข้อมูลบัญชี, แคมเปญทั้งหมดพร้อมงบและสถานะ, และโควตา API ที่ใช้ไปในคำขอนี้ — จุดเริ่มก่อนวิเคราะห์อะไรอื่น ' +
        '(ยังไม่มีส่วนเป้าหมาย/alert ค้าง/change set ค้าง — มาใน M3 เพราะต้องใช้ฐานข้อมูล)',
      inputSchema: customerIdShape,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const [customerRows, campaignRows] = await Promise.all([
          deps.client.search(customerId, CUSTOMER_QUERY, { trusted: true }),
          deps.client.search(customerId, CAMPAIGNS_QUERY, { trusted: true }),
        ]);

        const customer = (customerRows[0] as CustomerRow | undefined)?.customer;
        const campaigns = (campaignRows as CampaignRow[])
          .filter((r) => r.campaign?.status !== 'REMOVED')
          .map((r) => {
            const c = r.campaign ?? {};
            const budgetMicros = r.campaignBudget?.amountMicros;
            return {
              campaign_id: c.id,
              campaign_name: c.name,
              status: c.status,
              channel_type: c.advertisingChannelType,
              bidding_strategy_type: c.biddingStrategyType,
              daily_budget: budgetMicros === undefined ? undefined : microsToUnits(budgetMicros),
            };
          });

        const enabledCampaigns = campaigns.filter((c) => c.status === 'ENABLED');
        const dailyBudgetTotal =
          Math.round(
            enabledCampaigns.reduce((sum, c) => sum + (c.daily_budget ?? 0), 0) * 100,
          ) / 100;

        const warnings: string[] = [];
        if (customer?.testAccount) {
          warnings.push('บัญชีนี้เป็น test account — ไม่มีการยิงโฆษณาจริง ตัวเลขจะเป็น 0 เสมอ');
        }
        if (enabledCampaigns.length === 0) {
          warnings.push('ไม่มีแคมเปญที่เปิดใช้งานอยู่เลย');
        }

        return {
          meta: {
            customer_id: customerId,
            currency: customer?.currencyCode ?? 'THB',
            timezone: customer?.timeZone ?? deps.env.ACCOUNT_TZ,
            row_count: campaigns.length,
            ops_used: deps.client.opsUsed(),
            untrusted_fields: ['account_name', 'campaign_name'],
            not_yet_available: ['goals', 'alerts', 'pending_change_sets'],
          },
          summary: {
            account_name: customer?.descriptiveName,
            auto_tagging_enabled: customer?.autoTaggingEnabled,
            enabled_campaign_count: enabledCampaigns.length,
            total_campaign_count: campaigns.length,
            enabled_daily_budget_total: dailyBudgetTotal,
          },
          rows: campaigns,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
