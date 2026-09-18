/**
 * Drive a real `McpServer` through the actual MCP protocol in tests,
 * in-process — no HTTP, no transport bugs to work around, but also no
 * reaching into the SDK's private fields to shortcut the call, which broke
 * once already (the internal record's callback lives under `.handler`, not
 * `.callback` — found only by reading the SDK's own source, the same
 * "check, don't guess" this project applies to every other dependency).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export async function connectTestClient(server: McpServer): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/**
 * Call a tool and parse its text content as JSON — the shape a *successful*
 * call returns (`src/mcp/tools/shared.ts`'s `toolResult`). An error result
 * is plain Thai text, not JSON (`toolError`), so `json` comes back
 * `undefined` for those rather than throwing on the parse.
 */
export async function callToolJson(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ json: any; text: string; isError: boolean }> {
  const result = await client.callTool({ name, arguments: args });
  const first = (result['content'] as { type: string; text?: string }[])[0];
  const text = first?.type === 'text' ? (first.text ?? '') : '';
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { json, text, isError: result['isError'] === true };
}
