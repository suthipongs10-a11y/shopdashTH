/**
 * `gads_get_conversion_setup` (SPEC §6.3) — PLAYBOOK's own first rule is to
 * check conversion tracking before anything else, so this is deliberately
 * one of the simplest tools: is auto-tagging on, and what conversion
 * actions exist with which one is primary.
 *
 * Every field here is proven against the live account already — the
 * `customer.*` fields via `scripts/check-access.ts` (Gate M0), the
 * `conversion_action.*` fields via the captured fixture
 * `test/fixtures/conversion-actions.json` (M1) — nothing here is a guess.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { customerIdShape, resolveCustomerId, runTool, type ToolDeps } from './shared';

const CUSTOMER_QUERY = `
  SELECT customer.auto_tagging_enabled
  FROM customer`;

const CONVERSION_ACTIONS_QUERY = `
  SELECT conversion_action.id,
         conversion_action.name,
         conversion_action.type,
         conversion_action.category,
         conversion_action.status,
         conversion_action.primary_for_goal,
         conversion_action.counting_type
  FROM conversion_action
  LIMIT 100`;

interface CustomerRow {
  customer?: { autoTaggingEnabled?: boolean };
}

interface ConversionActionRow {
  conversionAction?: {
    id?: string;
    name?: string;
    type?: string;
    category?: string;
    status?: string;
    primaryForGoal?: boolean;
    countingType?: string;
  };
}

export function registerConversionSetupTool(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    'gads_get_conversion_setup',
    {
      title: 'ตรวจการตั้งค่า conversion tracking',
      description:
        'ดู auto-tagging และรายการ conversion action ทั้งหมด พร้อมบอกว่าตัวไหนเป็น primary — ' +
        'สิ่งแรกที่ควรตรวจก่อนวิเคราะห์อะไรอื่น เพราะถ้า tracking ไม่ถูกต้อง ตัวเลขที่เหลือทั้งหมดเชื่อไม่ได้',
      inputSchema: customerIdShape,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ customer_id }) =>
      runTool(async () => {
        const customerId = resolveCustomerId(deps.env, customer_id);
        const [customerRows, actionRows] = await Promise.all([
          deps.client.search(customerId, CUSTOMER_QUERY, { trusted: true }),
          deps.client.search(customerId, CONVERSION_ACTIONS_QUERY, { trusted: true }),
        ]);

        const customer = (customerRows[0] as CustomerRow | undefined)?.customer;
        const actions = (actionRows as ConversionActionRow[]).map((row) => {
          const a = row.conversionAction ?? {};
          return {
            id: a.id,
            name: a.name,
            type: a.type,
            category: a.category,
            status: a.status,
            is_primary: a.primaryForGoal === true,
            counting_type: a.countingType,
          };
        });
        const primaryCount = actions.filter((a) => a.is_primary && a.status === 'ENABLED').length;

        const warnings: string[] = [];
        if (customer?.autoTaggingEnabled === false) {
          warnings.push('Auto-tagging ปิดอยู่ — GCLID อาจไม่ถูกส่งมาด้วย ทำให้ผูก conversion ไม่ได้แม่นยำ');
        }
        if (actions.length === 0) {
          warnings.push('บัญชีนี้ยังไม่มี conversion action เลย');
        } else if (primaryCount === 0) {
          warnings.push('ไม่มี conversion action ที่เปิดใช้งานและตั้งเป็น primary goal');
        } else if (primaryCount > 1) {
          warnings.push(`มี conversion action ที่เป็น primary goal และเปิดใช้งานอยู่ ${primaryCount} ตัว`);
        }

        return {
          meta: { customer_id: customerId, currency: 'THB', row_count: actions.length },
          summary: {
            auto_tagging_enabled: customer?.autoTaggingEnabled ?? undefined,
            conversion_action_count: actions.length,
            primary_count: primaryCount,
          },
          rows: actions,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
      }),
  );
}
