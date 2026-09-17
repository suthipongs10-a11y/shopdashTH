/**
 * M1 — capture real Google Ads responses as scrubbed test fixtures.
 *
 *   pnpm capture:fixtures [--keep-search-terms] [--only <ชื่อไฟล์>] [--out test/fixtures]
 *
 * `--only` re-runs a single fixture, which costs one API call instead of seven
 * when one query needs fixing.
 *
 * Why this exists: Google's test accounts carry no performance data at all
 * (SPEC §4), so metrics, pacing and guardrail logic cannot be tested without
 * real responses. Those responses must lose everything identifying first.
 *
 * Runs on the owner's machine — Claude Code has no credentials (DECISIONS D24).
 * Read-only: every query here is a SELECT.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, PROJECT_ROOT, requireVar } from './lib/config';
import { assertCustomerId, formatCustomerId } from './lib/customer-id';
import { refreshAccessToken } from './lib/google-auth';
import { searchStream } from './lib/ads-rest';
import { createScrubber, findLeaks } from './lib/scrub';

interface Context {
  apiVersion: string;
  customerId: string;
  loginCustomerId: string | undefined;
  accessToken: string;
  /** Counts API calls so the run reports its quota cost. */
  countCall: () => void;
}

interface FixtureSpec {
  /** File name, also what the tests refer to. */
  file: string;
  what: string;
  query: string;
}

const LAST_30 = 'segments.date DURING LAST_30_DAYS';

const FIXTURES: FixtureSpec[] = [
  {
    file: 'campaigns.json',
    what: 'แคมเปญทั้งหมด + งบ + กลยุทธ์บิด',
    query: `
      SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
             campaign.bidding_strategy_type,
             campaign_budget.amount_micros, campaign_budget.explicitly_shared
      FROM campaign
      ORDER BY campaign.id
      LIMIT 200`,
  },
  {
    file: 'campaign-metrics-30d.json',
    what: 'metrics ราย campaign ราย วัน 30 วัน — ตัวหลักสำหรับทดสอบ metrics/pacing',
    query: `
      SELECT campaign.id, campaign.name, segments.date,
             metrics.impressions, metrics.clicks, metrics.cost_micros,
             metrics.conversions, metrics.conversions_value,
             metrics.ctr, metrics.average_cpc,
             metrics.search_impression_share,
             metrics.search_budget_lost_impression_share,
             metrics.search_rank_lost_impression_share
      FROM campaign
      WHERE ${LAST_30}
      ORDER BY segments.date
      LIMIT 1000`,
  },
  {
    file: 'search-terms-30d.json',
    what: 'คำค้นจริง — ใช้ทดสอบการหาคำเผาเงิน',
    query: `
      SELECT search_term_view.search_term, search_term_view.status,
             campaign.id, ad_group.id,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM search_term_view
      WHERE ${LAST_30}
      ORDER BY metrics.cost_micros DESC
      LIMIT 500`,
  },
  {
    file: 'keywords-30d.json',
    what: 'keyword + Quality Score — ใช้ทดสอบการวิเคราะห์คุณภาพ',
    query: `
      SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text,
             ad_group_criterion.keyword.match_type, ad_group_criterion.status,
             ad_group_criterion.quality_info.quality_score,
             campaign.id, ad_group.id,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM keyword_view
      WHERE ${LAST_30}
      ORDER BY metrics.cost_micros DESC
      LIMIT 500`,
  },
  {
    file: 'conversion-actions.json',
    what: 'conversion action — PLAYBOOK ข้อ 1 ตรวจ tracking ก่อนอย่างอื่น',
    query: `
      SELECT conversion_action.id, conversion_action.name, conversion_action.type,
             conversion_action.category, conversion_action.status,
             conversion_action.primary_for_goal, conversion_action.counting_type
      FROM conversion_action
      LIMIT 100`,
  },
  {
    file: 'hour-of-day-30d.json',
    what: 'ชั่วโมง × วันในสัปดาห์ — ใช้ทดสอบ ad schedule',
    query: `
      SELECT campaign.id, segments.hour, segments.day_of_week,
             metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE ${LAST_30}
      LIMIT 1000`,
  },
];

function runQuery(ctx: Context, query: string): Promise<Record<string, unknown>[]> {
  ctx.countCall();
  return searchStream({
    apiVersion: ctx.apiVersion,
    customerId: ctx.customerId,
    accessToken: ctx.accessToken,
    query,
    ...(ctx.loginCustomerId ? { loginCustomerId: ctx.loginCustomerId } : {}),
  });
}

function readFlag(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const keepSearchTerms = process.argv.includes('--keep-search-terms');
  const outDir = resolve(PROJECT_ROOT, readFlag('--out') ?? 'test/fixtures');
  const only = readFlag('--only');

  const selected = only
    ? FIXTURES.filter((f) => f.file.includes(only))
    : FIXTURES;
  if (selected.length === 0) {
    throw new Error(
      `--only "${only}" ไม่ตรงกับ fixture ใดเลย · มีให้เลือก: ${FIXTURES.map((f) => f.file).join(', ')}`,
    );
  }

  const config = loadConfig();
  const apiVersion = requireVar(config, 'ADS_API_VERSION');
  const customerId = assertCustomerId(
    requireVar(config, 'DEFAULT_CUSTOMER_ID'),
    'DEFAULT_CUSTOMER_ID',
  );
  const rawLoginId = (config['LOGIN_CUSTOMER_ID'] ?? '').trim();
  const loginCustomerId = rawLoginId
    ? assertCustomerId(rawLoginId, 'LOGIN_CUSTOMER_ID')
    : undefined;

  let apiCalls = 0;
  const tokens = await refreshAccessToken(
    {
      clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN'),
  );
  apiCalls += 1;

  const ctx: Context = {
    apiVersion,
    customerId,
    loginCustomerId,
    accessToken: tokens.access_token,
    countCall: () => {
      apiCalls += 1;
    },
  };

  console.log('\n=== เก็บ fixtures จากบัญชีจริง (M1) ===\n');
  console.log(`บัญชี       : ${formatCustomerId(customerId)}`);
  console.log(`API version : ${apiVersion}`);
  console.log(`เขียนลง      : ${outDir}`);
  console.log(
    `คำค้น        : ${keepSearchTerms ? 'เก็บของจริง (--keep-search-terms)' : 'แทนที่ด้วยค่าสมมติ'}\n`,
  );

  mkdirSync(outDir, { recursive: true });

  // The account name is fetched so the leak check can look for it verbatim.
  const accountName = await fetchAccountName(ctx);

  // One scrubber for the whole run, so ids stay consistent across files and the
  // fixtures can still be joined to one another.
  const scrubber = createScrubber({ keepSearchTerms });
  let written = 0;
  let skipped = 0;

  for (const fixture of selected) {
    process.stdout.write(`• ${fixture.file.padEnd(28)} `);

    let rows: Record<string, unknown>[];
    try {
      rows = await runQuery(ctx, fixture.query);
    } catch (err) {
      skipped += 1;
      // Print the whole error, not just its first line: the GoogleAdsFailure
      // detail underneath is what names the field that was rejected.
      console.log('ข้าม ❌');
      console.log(`    ${(err instanceof Error ? err.message : String(err)).replace(/\n/g, '\n    ')}`);
      continue;
    }

    const payload = {
      _meta: {
        what: fixture.what,
        query: fixture.query.trim().replace(/\s+/g, ' '),
        apiVersion,
        rows: rows.length,
        capturedAt: new Date().toISOString().slice(0, 10),
        scrubbed: true,
        searchTermsKept: keepSearchTerms,
      },
      rows: scrubber.scrub(rows),
    };

    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    const leaks = findLeaks(serialized, {
      customerIds: [customerId, ...(loginCustomerId ? [loginCustomerId] : [])],
      ...(accountName ? { accountNames: [accountName] } : {}),
    });
    if (leaks.length > 0) {
      skipped += 1;
      console.log('❌ ไม่เขียน — ตรวจพบข้อมูลที่ยังไม่ถูกลบ:');
      for (const leak of leaks) console.log(`    ${leak}`);
      continue;
    }

    writeFileSync(resolve(outDir, fixture.file), serialized);
    written += 1;
    console.log(`${String(rows.length).padStart(4)} แถว ✅`);
  }

  const report = scrubber.report();
  console.log('\n--- สิ่งที่ถูกแทนที่ ---');
  console.log(`id          : ${report.ids}`);
  console.log(`ชื่อ         : ${report.names}`);
  console.log(`ข้อความ      : ${report.texts}`);
  console.log(`URL         : ${report.urls}`);
  console.log(`อีเมล/เบอร์  : ${report.contacts}`);

  console.log(`\nเขียนไฟล์ ${written}/${selected.length}${skipped > 0 ? ` (ข้าม ${skipped})` : ''} · ใช้ไป ${apiCalls} API call\n`);

  if (written === 0) {
    console.log('ไม่ได้ไฟล์เลย — ดูข้อความ "ข้าม" ด้านบนว่าติดอะไร\n');
    return;
  }

  console.log('ขั้นต่อไป — ตรวจด้วยตาก่อน commit:');
  console.log(`  1. เปิดไฟล์ใน ${outDir} อ่านสัก 1-2 ไฟล์ว่าไม่มีอะไรระบุตัวตนได้`);
  console.log('  2. git add test/fixtures && git commit');
  console.log('\nสคริปต์ตรวจให้แล้วชั้นหนึ่ง แต่ตาคนคือด่านสุดท้าย\n');
}

async function fetchAccountName(ctx: Context): Promise<string | undefined> {
  try {
    const rows = await runQuery(ctx, 'SELECT customer.descriptive_name FROM customer');
    const customer = rows[0]?.['customer'] as { descriptiveName?: string } | undefined;
    return customer?.descriptiveName;
  } catch {
    // Not fatal: the leak check simply has one fewer needle to look for.
    return undefined;
  }
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
