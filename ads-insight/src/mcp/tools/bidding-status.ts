/**
 * `gads_get_bidding_status` (SPEC §6.3) — which bidding strategy each
 * campaign runs today.
 *
 * `campaign.bidding_strategy_type` is proven against the live account via
 * `test/fixtures/campaigns.json` (M1) — the real capture shows
 * TARGET_SPEND, MAXIMIZE_CONVERSIONS and TARGET_IMPRESSION_SHARE all coming
 * back cleanly through this exact field.
 *
 * Scaled back from SPEC's full description for M2: per-strategy target
 * values (e.g. `campaign.target_spend.cpc_bid_ceiling_micros`) live under a
 * different nested field per strategy type and aren't proven against this
 * account yet (its campaigns are TARGET_SPEND, which sets no target value at
 * all); "สถานะ learning/limited" and "ประวัติเปลี่ยนกลยุทธ์" need
 * `change_event`, which is `gads_get_change_history`'s job and explicitly
 * M3 (SPEC §12). Tracked in STATUS.md rather than guessed at here.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { customerIdShape, resolveCustomerId, runTool, type ToolDeps } from './shared';

const QUERY = `
  SELECT campaign.id,
         campaign.name,
         campaign.status,
         campaign.advertising_channel_type,
         campaign.bidding_strategy_type
  FROM campaign
  WHERE campaign.status != 'REMOVED'
  ORDER BY campaign.id
  LIMIT 500`;

interface CampaignRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    biddingStrategyType?: string;
  };
}

export function registerBiddingStatusTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_bidding_status',
    {
      title: 'ดูกลยุทธ์การเสนอราคาปัจจุบัน',
      description:
        'รายชื่อแคมเปญพร้อมกลยุทธ์การเสนอราคาที่ใช้อยู่ตอนนี้ (ไม่รวมแคมเปญที่ลบแล้ว) — ' +
        'ยังไม่รวมค่า target ต่อกลยุทธ์และประวัติการเปลี่ยนกลยุทธ์ (ดู gads_get_change_history ใน M3)',
      inputSchema: customerIdShape,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const rows = (await deps.client.search(customerId, QUERY, {
          trusted: true,
        })) as CampaignRow[];

        const campaigns = rows.map((row) => {
          const c = row.campaign ?? {};
          return {
            campaign_id: c.id,
            campaign_name: c.name,
            status: c.status,
            channel_type: c.advertisingChannelType,
            bidding_strategy_type: c.biddingStrategyType,
          };
        });

        return {
          meta: {
            customer_id: customerId,
            row_count: campaigns.length,
            untrusted_fields: ['campaign_name'],
          },
          rows: campaigns,
        };
      }),
  );
}
