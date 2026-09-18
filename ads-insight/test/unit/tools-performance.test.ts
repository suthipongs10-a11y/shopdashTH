import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPerformanceTool } from '../../src/mcp/tools/performance';
import { fakeAdsClient } from './helpers/fake-ads-client';
import { callToolJson, connectTestClient } from './helpers/mcp-test-client';
import type { AuthProps } from '../../src/auth/types';
import type { ToolEnv } from '../../src/mcp/tools/shared';

const env: ToolEnv = { DEFAULT_CUSTOMER_ID: '1234567890', ACCOUNT_TZ: 'Asia/Bangkok' };
const auth: AuthProps = { email: 'owner@example.com' };

function campaignRow(id: string, name: string, clicks: number, costMicros: number, conversions = 0) {
  return {
    campaign: { id, name },
    metrics: {
      impressions: String(clicks * 10),
      clicks: String(clicks),
      costMicros: String(costMicros),
      conversions,
      conversionsValue: conversions * 100,
    },
  };
}

async function callPerformanceTool(
  currentRows: ReturnType<typeof campaignRow>[],
  previousRows: ReturnType<typeof campaignRow>[],
  args: Record<string, unknown> = {},
) {
  // fetchTotalsByCampaign is called twice: current period, then the prior
  // period for comparison (src/mcp/tools/performance.ts).
  const client = fakeAdsClient([currentRows, previousRows]);
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPerformanceTool(server, { client, env, auth });
  const mcpClient = await connectTestClient(server);
  const { json, isError, text } = await callToolJson(mcpClient, 'gads_get_performance', args);
  return { result: json, isError, text, queries: client.queries };
}

describe('gads_get_performance', () => {
  it('defaults to level=account and sums every campaign into one row', async () => {
    const { result, isError } = await callPerformanceTool(
      [campaignRow('1', 'a', 100, 50_000_000), campaignRow('2', 'b', 50, 25_000_000)],
      [],
    );
    expect(isError).toBe(false);
    expect(result.rows).toEqual([expect.objectContaining({ scope: 'account', clicks: 150, cost: 75 })]);
  });

  it('level=campaign returns one row per campaign, not summed', async () => {
    const { result } = await callPerformanceTool(
      [campaignRow('1', 'name-a', 100, 50_000_000), campaignRow('2', 'name-b', 50, 25_000_000)],
      [],
      { level: 'campaign' },
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campaign_id: '1', campaign_name: 'name-a', clicks: 100 }),
        expect.objectContaining({ campaign_id: '2', campaign_name: 'name-b', clicks: 50 }),
      ]),
    );
  });

  it('sums multiple daily rows for the same campaign before deriving metrics', async () => {
    const { result } = await callPerformanceTool(
      [
        campaignRow('1', 'a', 50, 25_000_000), // day 1
        campaignRow('1', 'a', 50, 25_000_000), // day 2 — same campaign
      ],
      [],
      { level: 'campaign' },
    );
    expect(result.rows).toEqual([expect.objectContaining({ campaign_id: '1', clicks: 100, cost: 50 })]);
  });

  it('computes delta_pct against the prior period of equal length', async () => {
    const { result } = await callPerformanceTool(
      [campaignRow('1', 'a', 120, 60_000_000)], // current: 120 clicks
      [campaignRow('1', 'a', 100, 50_000_000)], // previous: 100 clicks
    );
    expect(result.summary.delta_pct.clicks).toBe(20); // (120-100)/100 * 100
    expect(result.summary.delta_pct.cost).toBe(20);
  });

  it('omits a delta_pct entry when the metric is absent from the prior period', async () => {
    const { result } = await callPerformanceTool(
      [campaignRow('1', 'a', 10, 5_000_000, 2)], // current has conversions
      [campaignRow('1', 'a', 10, 5_000_000, 0)], // previous has none — no CPA to compare from
    );
    expect('cpa' in result.summary.delta_pct).toBe(false);
  });

  it('rejects level=ad_group and level=keyword as not yet supported, without calling AdsClient', async () => {
    for (const level of ['ad_group', 'keyword']) {
      const { isError, text, queries } = await callPerformanceTool([], [], { level });
      expect(isError).toBe(true);
      expect(text).toContain('ยังไม่รองรับ');
      expect(queries).toHaveLength(0);
    }
  });

  it('includes both date_range and compare_range in meta', async () => {
    const { result } = await callPerformanceTool([], [], { days: 7 });
    expect(result.meta.date_range).toBeDefined();
    expect(result.meta.compare_range).toBeDefined();
    // the compare range ends exactly the day before the date range starts
    const dayBefore = new Date(`${result.meta.date_range.start}T00:00:00Z`);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    expect(result.meta.compare_range.end).toBe(dayBefore.toISOString().slice(0, 10));
  });
});
