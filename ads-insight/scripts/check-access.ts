/**
 * M0 gate check (SPEC §4, §12) — prove the Google Ads API works end to end:
 * refresh token → access token → GAQL query against the real account.
 *
 *   pnpm check:access [customer_id]
 *
 * Read-only. Exits 0 when the gate passes, 1 otherwise.
 */
import { loadConfig, mask, requireVar } from './lib/config';
import { assertCustomerId, formatCustomerId } from './lib/customer-id';
import { refreshAccessToken, type OAuthClient } from './lib/google-auth';
import { searchStream } from './lib/ads-rest';

/** The exact probe SPEC §4 step 7 asks for. */
const CUSTOMER_QUERY = `
  SELECT customer.id,
         customer.descriptive_name,
         customer.currency_code,
         customer.time_zone,
         customer.auto_tagging_enabled,
         customer.manager,
         customer.test_account
  FROM customer
`;

interface CustomerRow {
  customer?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
    autoTaggingEnabled?: boolean;
    manager?: boolean;
    testAccount?: boolean;
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  const client: OAuthClient = {
    clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
  };
  const refreshToken = requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN');
  const apiVersion = requireVar(config, 'ADS_API_VERSION');

  const rawCustomerId = process.argv[2] ?? config['DEFAULT_CUSTOMER_ID'] ?? '';
  if (!rawCustomerId.trim()) {
    throw new Error(
      'ยังไม่ได้ระบุ Customer ID — ใส่ DEFAULT_CUSTOMER_ID ใน .dev.vars ' +
        'หรือส่งเป็นอาร์กิวเมนต์: pnpm check:access 1234567890',
    );
  }
  const customerId = assertCustomerId(rawCustomerId, 'Customer ID');

  const rawLoginId = (config['LOGIN_CUSTOMER_ID'] ?? '').trim();
  const loginCustomerId = rawLoginId ? assertCustomerId(rawLoginId, 'LOGIN_CUSTOMER_ID') : undefined;

  console.log('\n=== ตรวจการเข้าถึง Google Ads API (M0) ===\n');
  console.log(`API version      : ${apiVersion}`);
  console.log(`Customer ID      : ${formatCustomerId(customerId)}`);
  console.log(`login-customer-id: ${loginCustomerId ? formatCustomerId(loginCustomerId) : '(ไม่ใช้ — เข้าบัญชีตรง)'}`);
  console.log(`refresh token    : ${mask(refreshToken)}\n`);

  process.stdout.write('1/2 ขอ access token จาก Google... ');
  const tokens = await refreshAccessToken(client, refreshToken);
  console.log(`สำเร็จ (อายุ ${tokens.expires_in} วินาที)`);

  process.stdout.write('2/2 ยิง GAQL query ตาราง customer... ');
  const rows = (await searchStream({
    apiVersion,
    customerId,
    accessToken: tokens.access_token,
    query: CUSTOMER_QUERY,
    ...(loginCustomerId ? { loginCustomerId } : {}),
  })) as CustomerRow[];
  console.log(`สำเร็จ (${rows.length} แถว)\n`);

  const customer = rows[0]?.customer;
  if (!customer) throw new Error('query สำเร็จแต่ไม่มีข้อมูลบัญชีกลับมา');

  console.log('--- ข้อมูลบัญชี ---');
  console.log(`ชื่อบัญชี   : ${customer.descriptiveName ?? '(ไม่มีชื่อ)'}`);
  console.log(`Customer ID: ${formatCustomerId(customer.id ?? customerId)}`);
  console.log(`สกุลเงิน    : ${customer.currencyCode ?? '?'}`);
  console.log(`ไทม์โซน     : ${customer.timeZone ?? '?'}`);
  console.log(`auto-tagging: ${customer.autoTaggingEnabled ? 'เปิด' : 'ปิด'}`);
  console.log(`ประเภท      : ${describeAccountType(customer)}\n`);

  const warnings = collectWarnings(customer, config);
  if (warnings.length > 0) {
    console.log('--- ข้อควรตรวจ ---');
    for (const warning of warnings) console.log(`⚠️  ${warning}`);
    console.log('');
  }

  console.log('✅ Gate M0 ผ่าน: เรียก Google Ads API ด้วยบัญชีจริงได้แล้ว');
  console.log('   อัปเดต STATUS.md แล้วรอผู้ใช้ยืนยันก่อนเริ่ม M1\n');
}

function describeAccountType(customer: NonNullable<CustomerRow['customer']>): string {
  const labels: string[] = [];
  if (customer.manager) labels.push('manager (MCC)');
  if (customer.testAccount) labels.push('test account');
  if (labels.length === 0) labels.push('บัญชีโฆษณาปกติ');
  return labels.join(', ');
}

function collectWarnings(
  customer: NonNullable<CustomerRow['customer']>,
  config: Record<string, string>,
): string[] {
  const warnings: string[] = [];

  if (customer.manager) {
    warnings.push(
      'บัญชีนี้เป็น manager (MCC) — ไม่มีข้อมูล performance โดยตรง ' +
        'ให้ใช้ Customer ID ของบัญชีลูกเป็น DEFAULT_CUSTOMER_ID และตั้งบัญชีนี้เป็น LOGIN_CUSTOMER_ID',
    );
  }
  if (customer.currencyCode && customer.currencyCode !== 'THB') {
    warnings.push(
      `สกุลเงินของบัญชีคือ ${customer.currencyCode} ไม่ใช่ THB — ` +
        'ข้อความในระบบสมมติว่าเป็นบาท ให้บันทึกเรื่องนี้ใน docs/DECISIONS.md',
    );
  }
  const accountTz = (config['ACCOUNT_TZ'] ?? '').trim();
  if (customer.timeZone && accountTz && customer.timeZone !== accountTz) {
    warnings.push(
      `ไทม์โซนบัญชี (${customer.timeZone}) ไม่ตรงกับ ACCOUNT_TZ ใน wrangler.toml (${accountTz}) — ` +
        'การคำนวณ pacing รายวันจะเพี้ยน ให้แก้ ACCOUNT_TZ ให้ตรง',
    );
  }
  if (customer.autoTaggingEnabled === false) {
    warnings.push('auto-tagging ปิดอยู่ — conversion tracking อาจไม่ครบ (PLAYBOOK ข้อ 1)');
  }
  if (!(config['TEST_CUSTOMER_ID'] ?? '').trim()) {
    warnings.push(
      'ยังไม่ได้ตั้ง TEST_CUSTOMER_ID — ต้องมีก่อนทดสอบ mutate ใน M4 (ห้าม mutate บัญชีจริง)',
    );
  }

  return warnings;
}

main().catch((err: unknown) => {
  console.error(`\n❌ Gate M0 ยังไม่ผ่าน\n${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
