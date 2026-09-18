import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAccountOverviewTool } from '../../src/mcp/tools/account-overview';
import { fakeAdsClient } from './helpers/fake-ads-client';
import { callToolJson, connectTestClient } from './helpers/mcp-test-client';
import type { AuthProps } from '../../src/auth/types';
import type { ToolEnv } from '../../src/mcp/tools/shared';

const env: ToolEnv = { DEFAULT_CUSTOMER_ID: '1234567890', ACCOUNT_TZ: 'Asia/Bangkok' };
const auth: AuthProps = { email: 'owner@example.com' };

const customerRow = (overrides: Record<string, unknown> = {}) => [
  {
    customer: {
      id: '1234567890',
      descriptiveName: 'ร้านทดสอบ',
      currencyCode: 'THB',
      timeZone: 'Asia/Bangkok',
      autoTaggingEnabled: true,
      manager: false,
      testAccount: false,
      ...overrides,
    },
  },
];

const campaignRows = [
  {
    campaign: { id: '1', name: 'a', status: 'ENABLED', advertisingChannelType: 'SEARCH', biddingStrategyType: 'TARGET_SPEND' },
    campaignBudget: { amountMicros: '500000000' },
  },
  {
    campaign: { id: '2', name: 'b', status: 'REMOVED', advertisingChannelType: 'SEARCH', biddingStrategyType: 'TARGET_SPEND' },
    campaignBudget: { amountMicros: '300000000' },
  },
];

async function callAccountOverview(customer = customerRow(), campaigns = campaignRows) {
  const client = fakeAdsClient([customer, campaigns]);
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerAccountOverviewTool(server, { client, env, auth });
  const mcpClient = await connectTestClient(server);
  return callToolJson(mcpClient, 'gads_get_account_overview');
}

describe('gads_get_account_overview', () => {
  it('filters out REMOVED campaigns from the row list', async () => {
    const { json } = await callAccountOverview();
    expect(json.rows).toHaveLength(1);
    expect(json.rows[0].campaign_id).toBe('1');
    expect(json.summary.total_campaign_count).toBe(1);
  });

  it('names goals/alerts/change-sets as not yet available rather than empty', async () => {
    const { json } = await callAccountOverview();
    expect(json.meta.not_yet_available).toEqual(
      expect.arrayContaining(['goals', 'alerts', 'pending_change_sets']),
    );
    expect(json.summary.goals).toBeUndefined();
    expect(json.summary.alerts).toBeUndefined();
  });

  it('warns when the account is a test account', async () => {
    const { json } = await callAccountOverview(customerRow({ testAccount: true }));
    expect(json.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('test account')]),
    );
  });

  it('warns when there are no enabled campaigns', async () => {
    const { json } = await callAccountOverview(customerRow(), [
      {
        campaign: {
          id: '1',
          name: 'a',
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          biddingStrategyType: 'TARGET_SPEND',
        },
        campaignBudget: { amountMicros: '100' },
      },
    ]);
    expect(json.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('ไม่มีแคมเปญที่เปิดใช้งาน')]),
    );
  });

  it('sums daily budget across enabled campaigns only', async () => {
    const { json } = await callAccountOverview();
    // Only campaign 1 (฿500 budget) is ENABLED; campaign 2 is REMOVED.
    expect(json.summary.enabled_daily_budget_total).toBe(500);
  });
});
