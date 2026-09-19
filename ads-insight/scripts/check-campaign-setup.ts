/**
 * Diagnose why an ENABLED campaign shows no impressions/clicks — read-only,
 * no deployment or MCP server needed, so it can answer "why is there no
 * traffic yet" the same day the question comes up rather than waiting on
 * M2's Cloudflare deployment.
 *
 * Checks the things that make a campaign structurally unable to serve at
 * all, which a brand-new campaign is the classic way to hit: no ad groups,
 * no keywords, no enabled ads, an ad still pending Google's review.
 *
 *   pnpm check:campaign-setup [customer_id]
 *
 * Queries `ad_group` / `ad_group_criterion` / `ad_group_ad` directly (config
 * resources, not stats views) rather than `keyword_view`, so a keyword or ad
 * that has never served still shows up — a metrics view would have nothing
 * to show for it (STATUS.md: this is exactly why fixtures needed a
 * synthetic account, and the same gap applies here).
 */
import { buildQuery, where } from '../src/ads/gaql';
import { loadConfig, requireVar } from './lib/config';
import { assertCustomerId, formatCustomerId } from './lib/customer-id';
import { refreshAccessToken } from './lib/google-auth';
import { searchStream } from './lib/ads-rest';

// Built with the same validated query builder gads_run_gaql and every M2
// report tool use (src/ads/gaql.ts) rather than hand-written strings — its
// assertField()/assertResource() catch a typo'd field name before this ever
// reaches the network, the same protection Claude's own free-form queries get.
const ENABLED = where.eq('campaign.status', 'ENABLED');

const CAMPAIGNS_QUERY = buildQuery({
  select: ['campaign.id', 'campaign.name', 'campaign.status', 'campaign.bidding_strategy_type', 'campaign_budget.amount_micros'],
  from: 'campaign',
  where: [ENABLED],
  orderBy: [{ field: 'campaign.id', direction: 'ASC' }],
});

const AD_GROUPS_QUERY = buildQuery({
  select: ['ad_group.id', 'ad_group.name', 'ad_group.status', 'campaign.id'],
  from: 'ad_group',
  where: [ENABLED],
  orderBy: [{ field: 'ad_group.id', direction: 'ASC' }],
});

const KEYWORDS_QUERY = buildQuery({
  select: [
    'ad_group_criterion.criterion_id',
    'ad_group_criterion.keyword.text',
    'ad_group_criterion.keyword.match_type',
    'ad_group_criterion.status',
    'ad_group.id',
  ],
  from: 'ad_group_criterion',
  where: [ENABLED, where.eq('ad_group_criterion.type', 'KEYWORD')],
  orderBy: [{ field: 'ad_group.id', direction: 'ASC' }],
});

// Unchanged from the version that already ran clean against this account —
// keep it that way. The newer, unverified policy fields below (review_status,
// policy_topic_entries — 'topic'/'type' turned out UNRECOGNIZED_FIELD on this
// API version, see DECISIONS) must never land back in this query: it has no
// runSafe guard, so one bad field here aborts the whole report before the
// proven structural check even runs.
const ADS_QUERY = buildQuery({
  select: [
    'ad_group_ad.ad.id',
    'ad_group_ad.ad.type',
    'ad_group_ad.status',
    'ad_group_ad.policy_summary.approval_status',
    'ad_group.id',
  ],
  from: 'ad_group_ad',
  where: [ENABLED],
  orderBy: [{ field: 'ad_group.id', direction: 'ASC' }],
});

// Split out from ADS_QUERY on purpose (see comment above) and run through
// runSafe: 'policy_topic_entries.topic'/'.type' already came back
// UNRECOGNIZED_FIELD once on this account's API version, and review_status
// hasn't been verified at all yet.
const AD_POLICY_DETAIL_QUERY = buildQuery({
  select: [
    'ad_group_ad.ad.id',
    'ad_group_ad.policy_summary.review_status',
    'ad_group_ad.policy_summary.policy_topic_entries.topic',
    'ad_group_ad.policy_summary.policy_topic_entries.type',
  ],
  from: 'ad_group_ad',
  where: [ENABLED],
});

const RECENT_METRICS_QUERY = buildQuery({
  select: ['campaign.id', 'segments.date', 'metrics.impressions', 'metrics.clicks', 'metrics.cost_micros'],
  from: 'campaign',
  where: [ENABLED, where.during('segments.date', 'LAST_7_DAYS')],
  orderBy: [{ field: 'segments.date', direction: 'ASC' }],
});

// Everything below answers a different question than the structural check
// above: the ad group / keyword / ad tree can be 100% complete (as it was —
// see STATUS.md 18 Sep) and a campaign can still get almost no impressions
// because of how it's *allowed* to deliver — wrong network, no/odd location
// targeting, a language mismatch against Thai-language keywords, an ad
// schedule window, an ad still mid-review, or a policy restriction. Each of
// these is its own query so one unfamiliar field name (not yet verified
// against this API version — CLAUDE.md's `pnpm fields` step) only costs that
// one section instead of aborting the whole report (see `runSafe` below).
const DELIVERY_QUERY = buildQuery({
  select: [
    'campaign.id',
    'campaign.network_settings.target_google_search',
    'campaign.network_settings.target_search_network',
    'campaign.network_settings.target_content_network',
    'campaign.geo_target_type_setting.positive_geo_target_type',
    'campaign.target_spend.cpc_bid_ceiling_micros',
  ],
  from: 'campaign',
  where: [ENABLED],
});

const LOCATION_CRITERIA_QUERY = buildQuery({
  select: [
    'campaign.id',
    'campaign_criterion.negative',
    'campaign_criterion.location.geo_target_constant',
    'geo_target_constant.name',
    'geo_target_constant.country_code',
  ],
  from: 'campaign_criterion',
  where: [ENABLED, where.eq('campaign_criterion.type', 'LOCATION')],
});

const LANGUAGE_CRITERIA_QUERY = buildQuery({
  select: ['campaign.id', 'campaign_criterion.language.language_constant', 'language_constant.name'],
  from: 'campaign_criterion',
  where: [ENABLED, where.eq('campaign_criterion.type', 'LANGUAGE')],
});

const AD_SCHEDULE_QUERY = buildQuery({
  select: [
    'campaign.id',
    'campaign_criterion.ad_schedule.day_of_week',
    'campaign_criterion.ad_schedule.start_hour',
    'campaign_criterion.ad_schedule.end_hour',
  ],
  from: 'campaign_criterion',
  where: [ENABLED, where.eq('campaign_criterion.type', 'AD_SCHEDULE')],
});

const IMPRESSION_SHARE_QUERY = buildQuery({
  select: [
    'campaign.id',
    'metrics.search_impression_share',
    'metrics.search_rank_lost_impression_share',
    'metrics.search_budget_lost_impression_share',
  ],
  from: 'campaign',
  where: [ENABLED, where.during('segments.date', 'LAST_7_DAYS')],
});

interface Ctx {
  apiVersion: string;
  customerId: string;
  loginCustomerId: string | undefined;
  accessToken: string;
}

function run(ctx: Ctx, query: string): Promise<Record<string, unknown>[]> {
  return searchStream({
    apiVersion: ctx.apiVersion,
    customerId: ctx.customerId,
    accessToken: ctx.accessToken,
    query,
    ...(ctx.loginCustomerId ? { loginCustomerId: ctx.loginCustomerId } : {}),
  });
}

/** Run one of the new delivery/targeting checks without letting a single
 * unfamiliar field name (unverified against this API version) take down the
 * whole report — print a warning and move on instead. */
async function runSafe(
  ctx: Ctx,
  label: string,
  query: string,
): Promise<Record<string, unknown>[] | undefined> {
  try {
    return await run(ctx, query);
  } catch (err) {
    console.log(`   ⚠️  เช็ค "${label}" ไม่ได้ (ข้ามไปก่อน) — ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

function pct(value: unknown): string {
  return value === undefined ? 'ไม่มีข้อมูล' : `${(Number(value) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const apiVersion = requireVar(config, 'ADS_API_VERSION');
  const argId = process.argv[2];
  const customerId = assertCustomerId(
    argId ?? requireVar(config, 'DEFAULT_CUSTOMER_ID'),
    argId ? 'customer_id (argument)' : 'DEFAULT_CUSTOMER_ID',
  );
  const rawLoginId = (config['LOGIN_CUSTOMER_ID'] ?? '').trim();
  const loginCustomerId = rawLoginId ? assertCustomerId(rawLoginId, 'LOGIN_CUSTOMER_ID') : undefined;

  const tokens = await refreshAccessToken(
    {
      clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN'),
  );
  const ctx: Ctx = { apiVersion, customerId, loginCustomerId, accessToken: tokens.access_token };

  console.log(`\n=== ตรวจโครงสร้างแคมเปญที่เปิดอยู่ — ${formatCustomerId(customerId)} ===\n`);

  const campaigns = await run(ctx, CAMPAIGNS_QUERY);
  if (campaigns.length === 0) {
    console.log('❌ ไม่มีแคมเปญที่สถานะ ENABLED เลย — นี่คือสาเหตุที่ไม่มี traffic\n');
    return;
  }

  const [
    adGroups,
    keywords,
    ads,
    metrics,
    delivery,
    locations,
    languages,
    adSchedule,
    impressionShare,
    adPolicyDetail,
  ] = await Promise.all([
    run(ctx, AD_GROUPS_QUERY),
    run(ctx, KEYWORDS_QUERY),
    run(ctx, ADS_QUERY),
    run(ctx, RECENT_METRICS_QUERY),
    runSafe(ctx, 'การตั้งค่าเครือข่าย/บิด', DELIVERY_QUERY),
    runSafe(ctx, 'พื้นที่เป้าหมาย', LOCATION_CRITERIA_QUERY),
    runSafe(ctx, 'ภาษาเป้าหมาย', LANGUAGE_CRITERIA_QUERY),
    runSafe(ctx, 'ช่วงเวลาแสดงแอด', AD_SCHEDULE_QUERY),
    runSafe(ctx, 'ส่วนแบ่ง impression', IMPRESSION_SHARE_QUERY),
    runSafe(ctx, 'สถานะตรวจสอบ/policy ของแอด', AD_POLICY_DETAIL_QUERY),
  ]);

  const policyByAdId = new Map<string, Record<string, unknown>>();
  for (const row of adPolicyDetail ?? []) {
    const adId = ((row['adGroupAd'] as Record<string, unknown>)['ad'] as Record<string, unknown>)[
      'id'
    ] as string;
    policyByAdId.set(adId, row['adGroupAd'] as Record<string, unknown>);
  }

  for (const row of campaigns) {
    const c = row['campaign'] as Record<string, unknown>;
    const budget = row['campaignBudget'] as Record<string, unknown> | undefined;
    const cid = c['id'] as string;
    console.log(`── แคมเปญ: ${c['name']} (id ${cid}) ──`);
    console.log(`   กลยุทธ์บิด : ${c['biddingStrategyType']}`);
    if (budget?.['amountMicros']) {
      console.log(`   งบ/วัน     : ฿${(Number(budget['amountMicros']) / 1_000_000).toLocaleString()}`);
    }

    const deliveryRow = delivery?.find((r) => (r['campaign'] as Record<string, unknown>)['id'] === cid);
    if (deliveryRow) {
      const dc = deliveryRow['campaign'] as Record<string, unknown>;
      const ns = dc['networkSettings'] as Record<string, unknown> | undefined;
      if (ns) {
        console.log(
          `   เครือข่าย   : Google Search=${ns['targetGoogleSearch'] ?? '?'} · Search partners=${ns['targetSearchNetwork'] ?? '?'} · Display=${ns['targetContentNetwork'] ?? '?'}`,
        );
        if (ns['targetGoogleSearch'] === false) {
          console.log('   ❌ ปิด "Google Search" ไว้ — นี่คือสาเหตุที่ไม่มี impression บน Search เลย');
        }
      }
      const geoSetting = dc['geoTargetTypeSetting'] as Record<string, unknown> | undefined;
      if (geoSetting?.['positiveGeoTargetType']) {
        console.log(`   Geo target type: ${geoSetting['positiveGeoTargetType']}`);
      }
      const targetSpend = dc['targetSpend'] as Record<string, unknown> | undefined;
      if (targetSpend?.['cpcBidCeilingMicros']) {
        console.log(
          `   เพดานราคาต่อคลิก (target spend ceiling): ฿${(Number(targetSpend['cpcBidCeilingMicros']) / 1_000_000).toFixed(2)} — ถ้าต่ำไปเมื่อเทียบกับคู่แข่งจะประมูลแพ้แทบทุกครั้ง`,
        );
      } else {
        console.log('   เพดานราคาต่อคลิก: ✅ ไม่ได้ตั้งไว้ — ระบบประมูลได้เต็มที่ภายใต้งบต่อวัน');
      }
    }

    const myLocations = locations?.filter((r) => (r['campaign'] as Record<string, unknown>)['id'] === cid) ?? [];
    if (locations !== undefined && myLocations.length === 0) {
      console.log('   ⚠️  ไม่พบการตั้งพื้นที่เป้าหมาย (LOCATION) เลย — ตรวจในหน้าเว็บว่ากำลังยิงกว้างเกินไปหรือไม่');
    } else {
      for (const r of myLocations) {
        const critRow = r['campaignCriterion'] as Record<string, unknown>;
        const geo = r['geoTargetConstant'] as Record<string, unknown> | undefined;
        const tag = critRow['negative'] ? 'ยกเว้น' : 'เป้าหมาย';
        const label = geo?.['name'] ?? (critRow['location'] as Record<string, unknown> | undefined)?.['geoTargetConstant'] ?? '?';
        console.log(`   พื้นที่ (${tag}): ${label}${geo?.['countryCode'] ? ` (${geo['countryCode']})` : ''}`);
      }
    }

    const myLanguages = languages?.filter((r) => (r['campaign'] as Record<string, unknown>)['id'] === cid) ?? [];
    if (languages !== undefined) {
      if (myLanguages.length === 0) {
        console.log('   ภาษาเป้าหมาย: ไม่ได้ตั้งค่าไว้เลย (ปกติ Google จะถือว่า "ทุกภาษา")');
      } else {
        const names = myLanguages
          .map((r) => (r['languageConstant'] as Record<string, unknown> | undefined)?.['name'] ?? '?')
          .join(', ');
        console.log(`   ภาษาเป้าหมาย: ${names}`);
        if (!myLanguages.some((r) => (r['languageConstant'] as Record<string, unknown> | undefined)?.['name'] === 'Thai')) {
          console.log('   ⚠️  ไม่มี "Thai" ในภาษาเป้าหมาย — ถ้าคีย์เวิร์ด/แอดเป็นภาษาไทย นี่อาจเป็นสาเหตุหลักที่แทบไม่มี impression');
        }
      }
    }

    const mySchedule = adSchedule?.filter((r) => (r['campaign'] as Record<string, unknown>)['id'] === cid) ?? [];
    if (mySchedule.length > 0) {
      console.log(`   ⚠️  มีการจำกัดช่วงเวลาแสดงแอด (ad schedule) ${mySchedule.length} ช่วง — อาจเป็นสาเหตุที่แสดงผลน้อยกว่าที่ควร`);
    }

    const myAdGroups = adGroups.filter(
      (r) => (r['campaign'] as Record<string, unknown>)['id'] === cid,
    );
    if (myAdGroups.length === 0) {
      console.log('   ❌ ไม่มี ad group เลย — แคมเปญนี้แสดงผลไม่ได้จนกว่าจะสร้าง ad group\n');
      continue;
    }

    for (const agRow of myAdGroups) {
      const ag = agRow['adGroup'] as Record<string, unknown>;
      const agId = ag['id'] as string;
      console.log(`   ad group: ${ag['name']} (id ${agId}) สถานะ ${ag['status']}`);

      const myKeywords = keywords.filter(
        (r) => (r['adGroup'] as Record<string, unknown>)['id'] === agId,
      );
      const enabledKeywords = myKeywords.filter(
        (r) => (r['adGroupCriterion'] as Record<string, unknown>)['status'] === 'ENABLED',
      );
      if (myKeywords.length === 0) {
        console.log('      ❌ ไม่มีคีย์เวิร์ดเลย — ad group นี้แสดงผลไม่ได้');
      } else {
        console.log(`      คีย์เวิร์ด: ${myKeywords.length} คำ (${enabledKeywords.length} ENABLED)`);
        if (enabledKeywords.length === 0) {
          console.log('      ❌ มีคีย์เวิร์ดแต่ไม่มีตัวไหน ENABLED เลย');
        }
      }

      const myAds = ads.filter((r) => (r['adGroup'] as Record<string, unknown>)['id'] === agId);
      const enabledAds = myAds.filter(
        (r) => (r['adGroupAd'] as Record<string, unknown>)['status'] === 'ENABLED',
      );
      if (myAds.length === 0) {
        console.log('      ❌ ไม่มีแอดเลย — ad group นี้แสดงผลไม่ได้');
      } else {
        console.log(`      แอด: ${myAds.length} ตัว (${enabledAds.length} ENABLED)`);
        for (const adRow of myAds) {
          const a = adRow['adGroupAd'] as Record<string, unknown>;
          const adId = (a['ad'] as Record<string, unknown>)['id'] as string;
          const approval = (a['policySummary'] as Record<string, unknown> | undefined)?.[
            'approvalStatus'
          ];
          if (approval && approval !== 'APPROVED') {
            console.log(`      ⚠️  แอด id ${adId} สถานะอนุมัติ: ${approval}`);
          }

          const detail = policyByAdId.get(adId);
          const detailPolicy = detail?.['policySummary'] as Record<string, unknown> | undefined;
          const review = detailPolicy?.['reviewStatus'];
          if (review && review !== 'REVIEWED') {
            console.log(`      ⚠️  แอด id ${adId} สถานะตรวจสอบ: ${review} — ยังตรวจไม่เสร็จอาจแสดงผลได้ไม่เต็มที่`);
          }
          const topics = detailPolicy?.['policyTopicEntries'] as Record<string, unknown>[] | undefined;
          for (const t of topics ?? []) {
            console.log(`      ℹ️  แอด id ${adId} policy topic: ${t['topic']} (${t['type']})`);
          }
        }
      }
    }
    console.log();
  }

  // Per-day, not just the 7-day total: after a settings change (e.g. removing
  // a too-low CPC ceiling) the total still averages in the days before the
  // change, which hides whether it actually worked. The daily rows show the
  // before/after directly.
  interface DayTotals {
    impressions: number;
    clicks: number;
    cost: number;
  }
  const byCampaignDay = new Map<string, Map<string, DayTotals>>();
  const recentByCampaign = new Map<string, DayTotals>();
  for (const row of metrics) {
    const cid = (row['campaign'] as Record<string, unknown>)['id'] as string;
    const date = (row['segments'] as Record<string, unknown> | undefined)?.['date'] as
      | string
      | undefined;
    const m = row['metrics'] as Record<string, unknown>;
    const impressions = Number(m['impressions'] ?? '0');
    const clicks = Number(m['clicks'] ?? '0');
    const cost = Number(m['costMicros'] ?? '0') / 1_000_000;

    const entry = recentByCampaign.get(cid) ?? { impressions: 0, clicks: 0, cost: 0 };
    entry.impressions += impressions;
    entry.clicks += clicks;
    entry.cost += cost;
    recentByCampaign.set(cid, entry);

    if (date) {
      const days = byCampaignDay.get(cid) ?? new Map<string, DayTotals>();
      const day = days.get(date) ?? { impressions: 0, clicks: 0, cost: 0 };
      day.impressions += impressions;
      day.clicks += clicks;
      day.cost += cost;
      days.set(date, day);
      byCampaignDay.set(cid, days);
    }
  }
  console.log('── ยอด 7 วันล่าสุด (รวมทุกวันที่มีข้อมูล) ──');
  for (const row of campaigns) {
    const c = row['campaign'] as Record<string, unknown>;
    const cid = c['id'] as string;
    const totals = recentByCampaign.get(cid);
    if (!totals) {
      console.log(`   ${c['name']}: ไม่มีข้อมูลเลยในช่วง 7 วัน (แคมเปญอาจสร้างมาไม่ถึงวัน หรือยังไม่เคยแสดงผล)`);
    } else {
      console.log(
        `   ${c['name']}: impression ${totals.impressions.toLocaleString()} · คลิก ${totals.clicks} · ค่าใช้จ่าย ฿${totals.cost.toFixed(2)}`,
      );
      const days = byCampaignDay.get(cid);
      for (const [date, day] of [...(days ?? new Map<string, DayTotals>())].sort()) {
        console.log(
          `      ${date}: impression ${day.impressions.toLocaleString()} · คลิก ${day.clicks} · ฿${day.cost.toFixed(2)}`,
        );
      }
    }

    const isRow = impressionShare?.find((r) => (r['campaign'] as Record<string, unknown>)['id'] === cid);
    if (isRow) {
      const m = isRow['metrics'] as Record<string, unknown>;
      const share = m['searchImpressionShare'];
      const lostRank = m['searchRankLostImpressionShare'];
      const lostBudget = m['searchBudgetLostImpressionShare'];
      if (share !== undefined || lostRank !== undefined || lostBudget !== undefined) {
        console.log(
          `      ส่วนแบ่ง impression บน Search: ${pct(share)} · เสียเพราะอันดับ/คุณภาพ/บิด: ${pct(lostRank)} · เสียเพราะงบ: ${pct(lostBudget)}`,
        );
      }
    }
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
