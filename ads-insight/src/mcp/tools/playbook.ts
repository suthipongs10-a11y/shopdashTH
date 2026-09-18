/**
 * `gads_get_playbook` (DECISIONS D27) — the same content as the
 * `gads://playbook` resource, exposed as a tool too.
 *
 * Why both exist: not every MCP client reads resources — D27 found this
 * while checking whether other AI clients (ChatGPT, Copilot, Gemini
 * Enterprise, Cursor) could use this server over the same Streamable HTTP +
 * OAuth transport Claude does. The transport works for all of them; whether
 * a given client's UI surfaces MCP resources to its model is a separate,
 * per-client question this project can't rely on. A tool call is something
 * every MCP client can make.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import playbookMarkdown from '../../../docs/PLAYBOOK.md';
import type { ToolDeps } from './shared';

export function registerPlaybookTool(server: McpServer, _deps: ToolDeps): void {
  server.registerTool(
    'gads_get_playbook',
    {
      title: 'อ่าน Playbook การวิเคราะห์',
      description:
        'กรอบวิเคราะห์และกฎเหล็กที่ควรทำตามก่อนแนะนำหรือเสนอเปลี่ยนแปลงอะไรในบัญชีนี้ — ' +
        'เนื้อหาเดียวกับ MCP resource gads://playbook สำหรับ client ที่ไม่ได้อ่าน resource',
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    // Raw markdown, not the usual meta/rows JSON (SPEC §6.2 shapes analytical
    // results — this tool serves a document, the same content and shape the
    // gads://playbook resource itself carries).
    (): CallToolResult => ({ content: [{ type: 'text', text: playbookMarkdown }] }),
  );
}
