import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerKeywordsTool } from '../../src/mcp/tools/keywords';
import { fakeAdsClient } from './helpers/fake-ads-client';
import { callToolJson, connectTestClient } from './helpers/mcp-test-client';
import type { AuthProps } from '../../src/auth/types';
import type { ToolEnv } from '../../src/mcp/tools/shared';

const env: ToolEnv = { DEFAULT_CUSTOMER_ID: '1234567890', ACCOUNT_TZ: 'Asia/Bangkok' };
const auth: AuthProps = { email: 'owner@example.com' };

/** One keyword row, in the exact shape `AdsClient.search()` returns. */
function keywordRow(opts: {
  id: string;
  text: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions?: number;
  qualityScore?: number;
}) {
  return {
    campaign: { id: '100', name: 'name-1' },
    adGroup: { id: '200', name: 'ag-1' },
    adGroupCriterion: {
      criterionId: opts.id,
      status: 'ENABLED',
      keyword: { text: opts.text, matchType: 'BROAD' },
      ...(opts.qualityScore === undefined ? {} : { qualityInfo: { qualityScore: opts.qualityScore } }),
    },
    metrics: {
      impressions: String(opts.impressions),
      clicks: String(opts.clicks),
      costMicros: String(opts.costMicros),
      conversions: opts.conversions ?? 0,
    },
  };
}

async function callKeywordsTool(rows: ReturnType<typeof keywordRow>[]) {
  const client = fakeAdsClient([rows]);
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerKeywordsTool(server, { client, env, auth });
  const mcpClient = await connectTestClient(server);
  const { json, isError } = await callToolJson(mcpClient, 'gads_get_keywords');
  return { result: json, isError, queries: client.queries };
}

describe('gads_get_keywords', () => {
  it('computes cost and CTR per keyword from raw counts', async () => {
    const { result, isError } = await callKeywordsTool([
      keywordRow({ id: '1', text: 'text-1', impressions: 1000, clicks: 50, costMicros: 200_000_000 }),
    ]);
    expect(isError).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cost).toBe(200);
    expect(result.rows[0].ctr_pct).toBe(5); // 50/1000 * 100
  });

  it('rolls up everything past the top 50 into one "others" row, cost summed', async () => {
    const rows = Array.from({ length: 55 }, (_, i) =>
      keywordRow({
        id: String(i),
        text: `text-${i}`,
        impressions: 100,
        clicks: 1,
        costMicros: (55 - i) * 1_000_000,
      }),
    );
    const { result } = await callKeywordsTool(rows);
    expect(result.rows).toHaveLength(51); // top 50 + 1 others row
    expect(result.meta.row_count).toBe(55);
    expect(result.meta.truncated).toBe(true);
    const others = result.rows[50];
    expect(others.text).toBe('(อื่นๆ 5 คำ)');
    // the 5 lowest-cost rows (i=50..54) cost 5,4,3,2,1 baht each
    expect(others.cost).toBe(15);
  });

  it('warns about keywords with high impressions but zero clicks', async () => {
    const { result } = await callKeywordsTool([
      keywordRow({ id: '1', text: 'no-clicks', impressions: 5000, clicks: 0, costMicros: 0 }),
      keywordRow({ id: '2', text: 'normal', impressions: 100, clicks: 10, costMicros: 50_000_000 }),
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('impression ≥1,000 แต่ไม่มีคลิกเลย')]),
    );
  });

  it('warns about keywords that have never served at all', async () => {
    const { result } = await callKeywordsTool([
      keywordRow({ id: '1', text: 'never-served', impressions: 0, clicks: 0, costMicros: 0 }),
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('ไม่เคยแสดงผลเลย')]),
    );
  });

  it('carries no warnings when nothing is unusual', async () => {
    const { result } = await callKeywordsTool([
      keywordRow({
        id: '1',
        text: 'fine',
        impressions: 100,
        clicks: 10,
        costMicros: 50_000_000,
        conversions: 5,
      }),
    ]);
    expect(result.warnings).toBeUndefined();
  });

  it('marks the free-text fields as untrusted', async () => {
    const { result } = await callKeywordsTool([
      keywordRow({ id: '1', text: 'x', impressions: 10, clicks: 1, costMicros: 1 }),
    ]);
    expect(result.meta.untrusted_fields).toEqual(
      expect.arrayContaining(['text', 'campaign_name', 'ad_group_name']),
    );
  });

  it('queries with trusted:true, so its own generated GAQL is never re-validated as user input', async () => {
    const { queries } = await callKeywordsTool([]);
    expect(queries[0]).toContain('FROM keyword_view');
    expect(queries[0]).toContain('ORDER BY metrics.cost_micros DESC');
  });

  it('rejects a days value outside 1-90 at the schema, before the tool body runs', async () => {
    const client = fakeAdsClient([[]]);
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerKeywordsTool(server, { client, env, auth });
    const mcpClient = await connectTestClient(server);
    // The SDK reports a schema-validation failure as a normal CallToolResult
    // with isError:true (confirmed live via wrangler dev against this exact
    // tool), not a rejected request — MCP tool errors are meant to be visible
    // *in* the result so the calling model can see and adjust, never a bare
    // protocol-level rejection.
    const { isError, json } = await callToolJson(mcpClient, 'gads_get_keywords', { days: 200 });
    expect(isError).toBe(true);
    expect(json).toBeUndefined(); // the text is an error message, not JSON
    expect(client.queries).toHaveLength(0); // never reached AdsClient at all
  });
});
