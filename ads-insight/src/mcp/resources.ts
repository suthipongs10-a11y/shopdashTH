/**
 * `gads://playbook` resource (SPEC §6.6) — Claude's analysis framework,
 * served straight from `docs/PLAYBOOK.md` so the file stays the one source
 * of truth (edit the doc, the resource changes, no code to keep in sync).
 *
 * Bundled in at build time via wrangler's `[[rules]]` text-module entry
 * (wrangler.toml) — confirmed against this exact wrangler version with a
 * throwaway Worker that imported the file and served its length before this
 * was written for real, not assumed to work from wrangler's general docs.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import playbookMarkdown from '../../docs/PLAYBOOK.md';

export const PLAYBOOK_URI = 'gads://playbook';

export function registerPlaybookResource(server: McpServer): void {
  server.registerResource(
    'playbook',
    PLAYBOOK_URI,
    {
      title: 'Ads Insight Playbook',
      description:
        'กรอบวิเคราะห์และกฎเหล็กสำหรับ Claude — ลำดับการตรวจ, เกณฑ์ตัดสินใจ, กฎการเสนอเปลี่ยนแปลง',
      mimeType: 'text/markdown',
    },
    (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: playbookMarkdown }],
    }),
  );
}
