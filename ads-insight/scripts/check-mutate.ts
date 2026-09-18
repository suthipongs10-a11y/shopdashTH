/**
 * Gate M1 (SPEC §12) — prove `validateOnly` works against a **test account**.
 *
 *   pnpm check:mutate
 *
 * This is the last item of the M1 gate, and it deliberately uses the real
 * `src/ads/client.ts` rather than the thin helpers in `scripts/lib/` (D17).
 * The point of the gate is that the client this project will actually ship
 * works end to end against Google — a script that reimplements the request
 * would prove nothing about it.
 *
 * It checks both directions, because an error path that has never run is not a
 * feature:
 *   1. a valid operation → Google accepts it, nothing is created
 *   2. a deliberately invalid one → `GoogleAdsFailure` comes back and
 *      `explainAdsError()` turns it into Thai
 *
 * Safety: refuses to run unless the target is a test account. CLAUDE.md forbids
 * mutating production, and `validateOnly` is a promise from the server, not
 * something this script can enforce — so it does not rely on it alone.
 */
import { createAdsClient } from '../src/ads/client';
import { AdsApiError, describeFailure } from '../src/ads/errors';
import { loadConfig, requireVar } from './lib/config';
import { assertCustomerId, formatCustomerId } from './lib/customer-id';
import { refreshAccessToken } from './lib/google-auth';

/** A budget is the simplest thing to validate: it references nothing else. */
function validBudgetOperation(): unknown {
  return {
    campaignBudgetOperation: {
      create: {
        name: `ads-insight gate check ${Date.now()}`,
        amountMicros: '50000000', // ฿50/day — never created, validateOnly
        deliveryMethod: 'STANDARD',
        explicitlyShared: false,
      },
    },
  };
}

/** Same shape, one value Google must reject. */
function invalidBudgetOperation(): unknown {
  return {
    campaignBudgetOperation: {
      create: {
        name: `ads-insight gate check invalid ${Date.now()}`,
        amountMicros: '-1',
        deliveryMethod: 'STANDARD',
      },
    },
  };
}

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const apiVersion = requireVar(config, 'ADS_API_VERSION');

  const rawTestId = (config['TEST_CUSTOMER_ID'] ?? '').trim();
  if (rawTestId === '') {
    fail(
      'ยังไม่ได้ตั้ง TEST_CUSTOMER_ID ใน .dev.vars\n' +
        '   ต้องสร้าง test account ก่อน — ดูขั้นตอนใน docs/SETUP-GOOGLE-CLOUD.md ข้อ 10',
    );
  }
  const testCustomerId = assertCustomerId(rawTestId, 'TEST_CUSTOMER_ID');

  const productionId = (config['DEFAULT_CUSTOMER_ID'] ?? '').replace(/\D/g, '');
  if (productionId !== '' && productionId === testCustomerId) {
    fail(
      'TEST_CUSTOMER_ID ตรงกับ DEFAULT_CUSTOMER_ID — นั่นคือบัญชีจริง\n' +
        '   สคริปต์นี้ยิงคำสั่งแก้ไข (แม้จะเป็น validateOnly) จึงไม่ยอมรันกับบัญชีจริง',
    );
  }

  // A test client lives under a test manager account, so the request has to say
  // which manager it is coming through. Without it Google answers 404 — an
  // error that reads like "the account does not exist" and sends people hunting
  // for the wrong problem.
  const rawLoginId = (
    config['TEST_LOGIN_CUSTOMER_ID'] ??
    config['LOGIN_CUSTOMER_ID'] ??
    ''
  ).trim();
  const loginCustomerId = rawLoginId
    ? assertCustomerId(rawLoginId, 'TEST_LOGIN_CUSTOMER_ID')
    : undefined;

  console.log('\n=== Gate M1: validateOnly บน test account ===\n');
  console.log(`test account : ${formatCustomerId(testCustomerId)}`);
  console.log(
    `ผ่าน manager : ${loginCustomerId ? formatCustomerId(loginCustomerId) : '(ไม่ได้ตั้ง — ถ้าได้ 404 ให้ตั้ง TEST_LOGIN_CUSTOMER_ID)'}`,
  );
  console.log(`API version  : ${apiVersion}\n`);

  const tokens = await refreshAccessToken(
    {
      clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN'),
  );

  const client = createAdsClient({
    apiVersion,
    getAccessToken: async () => tokens.access_token,
    ...(loginCustomerId ? { loginCustomerId } : {}),
    // One shot per check: a gate that silently retries hides a flaky result.
    retry: { maxRetries: 0 },
  });

  // ── 1. reachable, and really a test account ────────────────────────────────
  process.stdout.write('1. อ่านข้อมูลบัญชี                 ');
  let isTestAccount: boolean | undefined;
  try {
    // `customer.test_account` is what makes this check meaningful. If v25
    // rejects the field name, the error below prints it in full — confirm with
    // `pnpm fields test_account` rather than guessing a replacement.
    const rows = await client.search(
      testCustomerId,
      'SELECT customer.id, customer.descriptive_name, customer.test_account, ' +
        'customer.manager, customer.currency_code, customer.time_zone FROM customer LIMIT 1',
      { trusted: true },
    );
    const customer = (rows[0]?.['customer'] ?? {}) as Record<string, unknown>;
    isTestAccount = customer['testAccount'] === true;
    console.log('✅');
    console.log(`   สกุลเงิน   : ${String(customer['currencyCode'] ?? '—')}`);
    console.log(`   ไทม์โซน    : ${String(customer['timeZone'] ?? '—')}`);
    console.log(`   manager    : ${customer['manager'] === true ? 'ใช่' : 'ไม่ใช่'}`);
    console.log(`   test account: ${isTestAccount ? 'ใช่ ✅' : 'ไม่ใช่ ❌'}`);
  } catch (err) {
    console.log('❌');
    console.log(`   ${(err instanceof Error ? err.message : String(err)).replace(/\n/g, '\n   ')}`);
    fail('อ่านบัญชีไม่สำเร็จ — แก้ข้อนี้ก่อนแล้วค่อยรันใหม่');
  }

  if (isTestAccount !== true) {
    fail(
      'บัญชีนี้ไม่ใช่ test account (customer.test_account ไม่เป็น true)\n' +
        '   ไม่ยิงคำสั่งแก้ไขต่อ — CLAUDE.md ห้ามทดสอบ mutate กับบัญชีที่ไม่ใช่บัญชีทดสอบ',
    );
  }

  // ── 2. a valid operation validates ────────────────────────────────────────
  process.stdout.write('\n2. validateOnly กับคำสั่งที่ถูก     ');
  try {
    const response = await client.mutate(testCustomerId, [validBudgetOperation()], {
      validateOnly: true,
    });
    console.log('✅');
    // Google returns no resource names for a validate-only call — if it did,
    // something was actually created and that is a bug worth shouting about.
    const created = response.mutateOperationResponses ?? [];
    if (created.some((item) => JSON.stringify(item).includes('resourceName'))) {
      fail('validateOnly คืน resourceName กลับมา — แปลว่าอาจสร้างของจริง ต้องตรวจทันที');
    }
    console.log('   ไม่มีอะไรถูกสร้างจริง (ไม่มี resourceName กลับมา)');
  } catch (err) {
    console.log('❌');
    console.log(`   ${(err instanceof Error ? err.message : String(err)).replace(/\n/g, '\n   ')}`);
    fail('คำสั่งที่ควรผ่าน กลับไม่ผ่าน');
  }

  // ── 3. an invalid operation fails, in Thai ────────────────────────────────
  process.stdout.write('\n3. คำสั่งที่ผิด ต้องถูกปฏิเสธ        ');
  try {
    await client.mutate(testCustomerId, [invalidBudgetOperation()], { validateOnly: true });
    console.log('❌');
    fail('Google รับคำสั่งที่ควรผิด (งบติดลบ) — สมมติฐานเรื่อง validation ผิด ต้องตรวจ');
  } catch (err) {
    if (!(err instanceof AdsApiError)) {
      console.log('❌');
      console.log(`   ${err instanceof Error ? err.message : String(err)}`);
      fail('ได้ error ที่ไม่ใช่ AdsApiError — error mapping ยังไม่ครอบเคสนี้');
    }
    console.log('✅');
    console.log(`   ข้อความที่ผู้ใช้จะเห็น: ${describeFailure(err.failure, err.raw)}`);
    console.log(`   โค้ดจาก Google         : ${err.codes.join(', ') || '(แกะไม่ได้)'}`);
    console.log(`   retry ได้ไหม           : ${err.retryable ? 'ได้' : 'ไม่ได้ (ถูกต้อง)'}`);
  }

  console.log(`\nใช้ไป ${client.opsUsed()} operations`);
  console.log('\n✅ Gate M1 ข้อ "validateOnly บน test account" ผ่าน\n');
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
