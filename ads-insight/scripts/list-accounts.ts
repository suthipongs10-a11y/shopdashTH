/**
 * M0 — list every Google Ads account the refresh token can reach.
 *
 *   pnpm list:accounts [--no-children]
 *
 * Answers the M0 checklist item "จด Customer ID จริง / login-customer-id" by
 * showing the real hierarchy instead of making you hunt for IDs in the UI, and
 * prints the exact wrangler.toml values to paste.
 *
 * Read-only.
 */
import { loadConfig, requireVar } from './lib/config';
import { formatCustomerId } from './lib/customer-id';
import { refreshAccessToken, type OAuthClient } from './lib/google-auth';
import { AdsApiError, listAccessibleCustomers, searchStream } from './lib/ads-rest';
import {
  dedupeAccounts,
  formatAccountLine,
  parseCustomerClientRow,
  parseCustomerRow,
  recommendSettings,
  sortAccounts,
  type AccountSummary,
} from './lib/accounts';

const CUSTOMER_QUERY = `
  SELECT customer.id,
         customer.descriptive_name,
         customer.currency_code,
         customer.time_zone,
         customer.manager,
         customer.test_account
  FROM customer
`;

/** Run against a manager with login-customer-id set; returns the whole subtree. */
const CUSTOMER_CLIENT_QUERY = `
  SELECT customer_client.id,
         customer_client.descriptive_name,
         customer_client.currency_code,
         customer_client.time_zone,
         customer_client.manager,
         customer_client.test_account,
         customer_client.level,
         customer_client.status,
         customer_client.hidden
  FROM customer_client
  WHERE customer_client.level <= 2
`;

async function main(): Promise<void> {
  const expandChildren = !process.argv.includes('--no-children');
  const config = loadConfig();
  const client: OAuthClient = {
    clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
  };
  const refreshToken = requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN');
  const apiVersion = requireVar(config, 'ADS_API_VERSION');

  console.log('\n=== บัญชี Google Ads ที่ refresh token นี้เข้าถึงได้ (M0) ===\n');

  const tokens = await refreshAccessToken(client, refreshToken);
  const accessToken = tokens.access_token;
  let apiCalls = 1;

  const topLevelIds = await listAccessibleCustomers({ apiVersion, accessToken });
  apiCalls += 1;

  if (topLevelIds.length === 0) {
    console.log('ไม่พบบัญชีใดเลย — Gmail ที่ใช้ล็อกอินอาจยังไม่ได้รับสิทธิ์ในบัญชี Google Ads ใดๆ');
    console.log('ถ้าเพิ่งรับคำเชิญ ให้กดยอมรับในอีเมลก่อน แล้วรันใหม่\n');
    return;
  }

  console.log(`เข้าถึงได้โดยตรง ${topLevelIds.length} บัญชี — กำลังดึงรายละเอียด...\n`);

  const all: AccountSummary[] = [];
  /** account id -> the top-level account it was reached through */
  const reachedVia = new Map<string, string>();

  for (const customerId of topLevelIds) {
    let account: AccountSummary | undefined;
    try {
      const rows = await searchStream({ apiVersion, customerId, accessToken, query: CUSTOMER_QUERY });
      apiCalls += 1;
      account = rows.map(parseCustomerRow).find(Boolean);
    } catch (err) {
      console.log(`⚠️  ${formatCustomerId(customerId)} — อ่านรายละเอียดไม่ได้: ${describe(err)}`);
      continue;
    }
    if (!account) continue;

    all.push(account);
    reachedVia.set(account.id, account.id);

    if (!account.isManager || !expandChildren) continue;

    // Children of an MCC are not returned by listAccessibleCustomers.
    try {
      const rows = await searchStream({
        apiVersion,
        customerId,
        accessToken,
        query: CUSTOMER_CLIENT_QUERY,
        loginCustomerId: customerId,
      });
      apiCalls += 1;
      for (const child of rows.map(parseCustomerClientRow)) {
        if (!child || child.id === account.id) continue;
        all.push(child);
        if (!reachedVia.has(child.id)) reachedVia.set(child.id, account.id);
      }
    } catch (err) {
      console.log(
        `⚠️  ${formatCustomerId(customerId)} เป็น MCC แต่อ่านบัญชีลูกไม่ได้: ${describe(err)}`,
      );
    }
  }

  const accounts = sortAccounts(dedupeAccounts(all));

  console.log('--- ผังบัญชี ---');
  for (const account of accounts) console.log(formatAccountLine(account));
  console.log('');

  const recommendation = recommendSettings(accounts, reachedVia);

  console.log('--- ค่าที่แนะนำให้ใส่ใน wrangler.toml [vars] ---');
  for (const key of ['DEFAULT_CUSTOMER_ID', 'LOGIN_CUSTOMER_ID', 'TEST_CUSTOMER_ID'] as const) {
    const value = recommendation[key];
    if (value) {
      console.log(`${key} = "${value}"`);
      continue;
    }
    const reason = recommendation.emptyReasons[key] ?? 'เลือกเอง ดูผังด้านบน';
    console.log(`${key} = ""   # ← ${reason}`);
  }
  console.log('');

  if (recommendation.notes.length > 0) {
    console.log('--- ข้อควรทราบ ---');
    for (const note of recommendation.notes) console.log(`• ${note}`);
    console.log('');
  }

  console.log(`ใช้ไป ${apiCalls} API call`);
  if (recommendation.DEFAULT_CUSTOMER_ID) {
    console.log(`ขั้นต่อไป: pnpm check:access ${recommendation.DEFAULT_CUSTOMER_ID}\n`);
  } else {
    console.log('ขั้นต่อไป: เลือก Customer ID แล้วรัน `pnpm check:access <id>`\n');
  }
}

function describe(err: unknown): string {
  if (err instanceof AdsApiError) return err.message.split('\n')[0] ?? err.message;
  return err instanceof Error ? err.message : String(err);
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
