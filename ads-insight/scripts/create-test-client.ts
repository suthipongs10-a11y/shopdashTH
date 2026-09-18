/**
 * M1 — create a TEST client account via the API, not the website.
 *
 *   pnpm create:test-client            # validateOnly — checks the request, creates nothing
 *   pnpm create:test-client --apply    # actually creates it
 *
 * Why this exists: the account created through the Ads UI wizard has been
 * stuck on `CUSTOMER_NOT_ENABLED` for hours, which waiting did not fix.
 * Google's own docs say a test client account should be created by calling
 * `CustomerService.CreateCustomerClient` against the test manager, not by
 * clicking through the website — the RPC is what marks the new account as
 * exempt from the normal new-account review queue that a web signup goes
 * through regardless of which manager it lands under. That queue is almost
 * certainly what the UI-created account is stuck in.
 *
 * This is account *provisioning*, not an ad-data mutate: CLAUDE.md's "no
 * mutate outside src/services/changes/apply.ts" rule is about changes with
 * real financial stakes on a live account (budgets, campaigns, keywords).
 * This touches only a manager that carries no billing and serves nothing —
 * same class of one-off tooling as scripts/get-refresh-token.ts, not part of
 * the app's ad-management surface (account creation is explicitly out of
 * scope per SPEC §14). That is also why it calls the REST endpoint directly
 * with the same primitives capture-fixtures.ts and check-access.ts use,
 * rather than growing `src/ads/client.ts`, which is scoped to the
 * googleAds:search/mutate surface — this RPC is not part of it and the
 * shipped app will never call it again after this one-time setup.
 *
 * Endpoint confirmed from Google's docs (developers.google.com is blocked
 * from this environment, so this was checked via search rather than fetched
 * directly — same caveat as the rest of docs/SETUP-GOOGLE-CLOUD.md §10):
 *   POST customers/{managerCustomerId}:createCustomerClient
 *   body: { customerClient: { descriptiveName, currencyCode, timeZone }, validateOnly? }
 * If Google rejects a field name here, the full raw body is printed below —
 * never guess a second time silently (that mistake already cost one round
 * on campaigns.json's start_date/end_date).
 */
import { ADS_API_HOST, AdsApiError } from './lib/ads-rest';
import { loadConfig, requireVar, saveDevVar } from './lib/config';
import { assertCustomerId, formatCustomerId } from './lib/customer-id';
import { refreshAccessToken } from './lib/google-auth';

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const config = loadConfig();
  const apiVersion = requireVar(config, 'ADS_API_VERSION');

  const rawManagerId = (
    config['TEST_LOGIN_CUSTOMER_ID'] ??
    config['LOGIN_CUSTOMER_ID'] ??
    ''
  ).trim();
  if (rawManagerId === '') {
    fail(
      'ยังไม่ได้ตั้ง TEST_LOGIN_CUSTOMER_ID ใน .dev.vars\n' +
        '   ต้องมี test manager account ก่อน (docs/SETUP-GOOGLE-CLOUD.md ข้อ 10.1)',
    );
  }
  const managerId = assertCustomerId(rawManagerId, 'TEST_LOGIN_CUSTOMER_ID');

  const productionId = (config['DEFAULT_CUSTOMER_ID'] ?? '').replace(/\D/g, '');
  if (productionId !== '' && productionId === managerId) {
    fail('TEST_LOGIN_CUSTOMER_ID ตรงกับ DEFAULT_CUSTOMER_ID — นั่นคือบัญชีจริง ไม่ยอมสร้างบัญชีลูกใต้บัญชีนั้น');
  }

  console.log('\n=== สร้าง test client account ผ่าน API ===\n');
  console.log(`ผ่าน test manager : ${formatCustomerId(managerId)}`);
  console.log(`API version       : ${apiVersion}`);
  console.log(`โหมด              : ${apply ? 'สร้างจริง' : 'validateOnly (ไม่สร้างจริง — ใส่ --apply เพื่อสร้างจริง)'}\n`);

  const tokens = await refreshAccessToken(
    {
      clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN'),
  );

  const url = `${ADS_API_HOST}/${apiVersion}/customers/${managerId}:createCustomerClient`;
  const body = {
    customerClient: {
      descriptiveName: 'Ads Insight Test Client',
      currencyCode: 'THB',
      timeZone: 'Asia/Bangkok',
    },
    validateOnly: !apply,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tokens.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();

  if (!res.ok) {
    // Full body, unconditionally — a guessed field name shows up here exactly
    // once, not after a truncated message sends someone hunting blind.
    console.error(`\n❌ Google ปฏิเสธคำขอ\n`);
    console.error(new AdsApiError(res.status, text).message);
    console.error(`\n--- raw body ---\n${text}\n`);
    process.exit(1);
  }

  if (!apply) {
    console.log('✅ validateOnly ผ่าน — request ถูกต้อง ยังไม่ได้สร้างอะไรจริง');
    console.log('   รันอีกครั้งพร้อม --apply เพื่อสร้างจริง:\n');
    console.log('   pnpm create:test-client --apply\n');
    return;
  }

  const parsed = JSON.parse(text) as { resourceName?: string; invitationLink?: string };
  const newId = parsed.resourceName?.match(/customers\/(\d+)/)?.[1];
  if (!newId) {
    fail(`สร้างสำเร็จแต่แกะ Customer ID จาก response ไม่ได้ — ตรวจเอง:\n${text}`);
  }

  console.log('✅ สร้างบัญชีลูกสำเร็จ\n');
  console.log(`   Customer ID ใหม่ : ${formatCustomerId(newId)}`);
  if (parsed.invitationLink) console.log(`   Invitation link  : ${parsed.invitationLink}`);

  saveDevVar('TEST_CUSTOMER_ID', newId);
  console.log('\n   บันทึกลง .dev.vars เป็น TEST_CUSTOMER_ID แล้ว (ทับค่าเดิมถ้ามี)');
  console.log('   บัญชีเก่าที่สร้างผ่านเว็บ (ถ้ามี) ยังอยู่เฉยๆ ไม่ได้ถูกลบ — ไม่ใช้ต่อก็ปล่อยไว้ได้');
  console.log('\nขั้นต่อไป: pnpm check:mutate\n');
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
