import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchTermsTool } from '../../src/mcp/tools/search-terms';
import { fakeAdsClient } from './helpers/fake-ads-client';
import { callToolJson, connectTestClient } from './helpers/mcp-test-client';
import type { AuthProps } from '../../src/auth/types';
import type { ToolEnv } from '../../src/mcp/tools/shared';

const env: ToolEnv = { DEFAULT_CUSTOMER_ID: '1234567890', ACCOUNT_TZ: 'Asia/Bangkok' };
const auth: AuthProps = { email: 'owner@example.com' };

function termRow(term: string, clicks: number, costMicros: number, conversions = 0) {
  return {
    searchTermView: { searchTerm: term, status: 'NONE' },
    campaign: { id: '1', name: 'c' },
    adGroup: { id: '2', name: 'ag' },
    metrics: {
      impressions: String(clicks * 5),
      clicks: String(clicks),
      costMicros: String(costMicros),
      conversions,
    },
  };
}

async function callSearchTermsTool(rows: ReturnType<typeof termRow>[]) {
  const client = fakeAdsClient([rows]);
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerSearchTermsTool(server, { client, env, auth });
  const mcpClient = await connectTestClient(server);
  return callToolJson(mcpClient, 'gads_get_search_terms');
}

describe('gads_get_search_terms', () => {
  it('flags a term burning budget with zero conversions', async () => {
    const { json } = await callSearchTermsTool([
      termRow('เน็ตฟรี', 20, 150_000_000, 0), // ฿150, 20 clicks, 0 conversions
    ]);
    expect(json.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('฿150')]),
    );
  });

  it('does not flag a term that converted, however much it cost', async () => {
    const { json } = await callSearchTermsTool([termRow('โปรเน็ต ais', 20, 150_000_000, 3)]);
    expect(json.warnings).toBeUndefined();
  });

  it('does not flag a term below the cost floor even with zero conversions', async () => {
    const { json } = await callSearchTermsTool([termRow('คำเล็กๆ', 10, 10_000_000, 0)]); // ฿10
    expect(json.warnings).toBeUndefined();
  });

  it('marks search_term as untrusted — it is free text typed by the public', async () => {
    const { json } = await callSearchTermsTool([termRow('x', 1, 1, 0)]);
    expect(json.meta.untrusted_fields).toContain('search_term');
  });
});
