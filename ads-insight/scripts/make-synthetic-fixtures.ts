/**
 * M1 — generate synthetic fixtures for an account that actually has traffic.
 *
 *   pnpm fixtures:synthetic [--out test/fixtures/synthetic]
 *
 * Why this exists: the real account has never served an impression. Every
 * metric in `test/fixtures/*.json` is zero, which proves the *shape* of a
 * response and nothing else — no CTR, no average CPC, no impression share, no
 * pacing, no "this keyword is burning budget". Google's test accounts carry no
 * performance data either (SPEC §4), so there is nowhere to capture it from.
 *
 * So these are written, not captured, and they are kept in a separate folder
 * and marked `_meta.synthetic` so no one can mistake one for evidence about the
 * real account.
 *
 * Two rules they follow, because a fixture that lies is worse than none:
 *
 * 1. **Same shape as the real responses.** Same field names, int64 as strings,
 *    doubles as numbers, and — the detail that bites — zero-valued fields are
 *    *omitted*, exactly as proto3 JSON does. The real capture has no `ctr` key
 *    at all on a row with no clicks. Code that reads these must cope with that.
 * 2. **Internally consistent.** ctr = clicks / impressions, average_cpc =
 *    cost / clicks, the three impression-share fields sum to 1, page views
 *    never exceed clicks. `test/unit/fixtures.test.ts` asserts all of it, so a
 *    careless edit here fails the suite rather than quietly teaching the
 *    analysis code something untrue.
 *
 * The account modelled is the one this project serves: Search only, THB,
 * Asia/Bangkok, objective **traffic** — clicks and page views, not leads
 * (DECISIONS D26). So the interesting failures are the traffic ones: a keyword
 * with impressions and no clicks, a keyword whose clicks cost four times the
 * account average, a campaign losing impression share to its budget, and
 * clicks that never become page views.
 *
 * Deterministic: same seed, byte-identical output, so regenerating produces an
 * empty diff unless something really changed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from './lib/config';

const SEED = 20260917;
/** LAST_30_DAYS as of the real capture on 2026-09-17: yesterday, back 30 days. */
const LAST_DAY = '2026-09-16';
const DAYS = 30;
const API_VERSION = 'v25';

/** mulberry32 — small, seedable, and identical on every machine. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(SEED);

/** A factor within ±`spread` of 1, for making numbers look lived-in. */
function jitter(spread: number): number {
  return 1 + (rand() * 2 - 1) * spread;
}

function dateList(): string[] {
  const end = new Date(`${LAST_DAY}T00:00:00Z`);
  const out: string[] = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** 0 = Sunday. Thai search traffic for this vertical dips at the weekend. */
function weekdayFactor(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  if (day === 0) return 0.72;
  if (day === 6) return 0.78;
  if (day === 1) return 1.08;
  return 1;
}

const baht = (units: number): string => String(Math.round(units * 1_000_000));

/**
 * proto3 JSON omits fields at their default value, so the REST API sends no
 * `ctr` key when there were no clicks. Mirroring that is the difference
 * between a fixture that tests the reader and one that flatters it.
 */
function compact(entries: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value === 0 || value === '0' || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

const CUSTOMER = '3000000001';
const res = (path: string): string => `customers/${CUSTOMER}/${path}`;

interface CampaignModel {
  id: string;
  name: string;
  /** Daily budget in baht, set so the constraint below is the true story. */
  budget: number;
  budgetId: string;
  biddingStrategyType: string;
  constraint: 'budget' | 'rank' | 'none';
  /**
   * Share of eligible impressions lost, by cause. These cannot be derived: the
   * API never says how many auctions the account was eligible for, only what
   * share it won. So they are set to match each campaign's constraint — a
   * campaign that spends its budget every day loses most of its share to
   * budget, one that is outbid loses it to rank.
   */
  budgetLost: number;
  rankLost: number;
}

/**
 * Totals come from the keyword table below, not from these entries: in a real
 * account keywords roll up into their campaign, and a fixture set where the two
 * disagree would teach the analysis code that reconciliation is hopeless.
 */
const CAMPAIGNS: CampaignModel[] = [
  {
    id: '3000000101',
    name: 'Search — แบรนด์',
    budget: 700,
    budgetId: '3000000201',
    biddingStrategyType: 'TARGET_SPEND',
    constraint: 'none',
    budgetLost: 0,
    rankLost: 0.11,
  },
  {
    id: '3000000102',
    name: 'Search — ทั่วไป',
    // ~฿1,528/day of demand against a ฿1,550 budget: it spends out almost every
    // day, which is why most of its impression share goes to budget.
    budget: 1_550,
    budgetId: '3000000202',
    biddingStrategyType: 'TARGET_SPEND',
    constraint: 'budget',
    budgetLost: 0.62,
    rankLost: 0.09,
  },
  {
    id: '3000000103',
    name: 'Search — คู่แข่ง',
    budget: 300,
    budgetId: '3000000203',
    biddingStrategyType: 'TARGET_SPEND',
    constraint: 'rank',
    budgetLost: 0,
    rankLost: 0.46,
  },
];

/** The day a competitor started bidding hard — something for M3 to notice. */
const SPIKE_DAY = '2026-09-08';

interface Envelope {
  what: string;
  query: string;
  rows: unknown[];
}

function envelope(e: Envelope): string {
  const payload = {
    _meta: {
      what: e.what,
      query: e.query.trim().replace(/\s+/g, ' '),
      apiVersion: API_VERSION,
      rows: e.rows.length,
      synthetic: true,
      generatedBy: 'pnpm fixtures:synthetic',
      seed: SEED,
      period: `${dateList()[0]} .. ${LAST_DAY}`,
      note: 'เขียนขึ้นเอง ไม่ใช่ข้อมูลบัญชีจริง — บัญชีจริงยังไม่มี traffic (STATUS M1)',
    },
    rows: e.rows,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function buildCampaigns(): unknown[] {
  return CAMPAIGNS.map((c) => ({
    campaign: {
      resourceName: res(`campaigns/${c.id}`),
      id: c.id,
      name: c.name,
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      biddingStrategyType: c.biddingStrategyType,
      startDateTime: '2026-05-04 00:00:00',
    },
    campaignBudget: {
      resourceName: res(`campaignBudgets/${c.budgetId}`),
      amountMicros: baht(c.budget),
    },
  }));
}

interface Totals {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
}

/** What the keyword rows add up to for one campaign — the campaign's truth. */
function keywordTotals(campaignIndex: number): Totals {
  const total: Totals = { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 };
  for (const k of KEYWORDS) {
    if (k.campaign !== campaignIndex) continue;
    total.impressions += k.impressions;
    total.clicks += k.clicks;
    total.costMicros += Math.round(k.clicks * k.cpc * 1_000_000);
    total.conversions += k.conversions;
  }
  return total;
}

/**
 * Split `total` across `weights` as whole numbers that still add up to `total`.
 *
 * Largest remainder: floor everything, then hand the shortfall to the parts
 * that lost the most in rounding. Without it the daily rows drift away from the
 * keyword totals by a few units and no test can assert they agree.
 */
function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total === 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let short = total - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; short > 0; i += 1, short -= 1) {
    const target = order[i % order.length]!.index;
    parts[target] = parts[target]! + 1;
  }
  return parts;
}

function buildCampaignMetrics(): unknown[] {
  const dates = dateList();
  const rows: unknown[] = [];

  CAMPAIGNS.forEach((c, index) => {
    const total = keywordTotals(index);
    const spiking = (date: string): boolean =>
      c.constraint === 'rank' && date >= SPIKE_DAY;

    // Traffic weights: weekly shape plus noise. The competitor campaign gets
    // fewer clicks once it is outbid, and pays more for the ones it keeps.
    const trafficWeights = dates.map(
      (date) => weekdayFactor(date) * jitter(0.14) * (spiking(date) ? 0.72 : 1),
    );
    const costWeights = trafficWeights.map((w, i) => w * (spiking(dates[i]!) ? 1.55 : 1));

    const impressions = distribute(total.impressions, trafficWeights);
    const clicks = distribute(total.clicks, trafficWeights);
    const cost = distribute(total.costMicros, costWeights);
    const conversions = distribute(total.conversions, trafficWeights);

    dates.forEach((date, day) => {
      const impr = impressions[day]!;
      const clk = clicks[day]!;
      const costMicros = cost[day]!;

      const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;
      const budgetLost = round4(c.budgetLost === 0 ? 0 : c.budgetLost * jitter(0.12));
      const rankLost = round4(
        (spiking(date) ? c.rankLost * 1.35 : c.rankLost) * jitter(0.1),
      );
      // The three shares partition the same set of auctions, so the remainder
      // goes to the share actually won and they total exactly 1.
      const searchShare = round4(1 - budgetLost - rankLost);

      rows.push({
        campaign: { resourceName: res(`campaigns/${c.id}`), id: c.id, name: c.name },
        segments: { date },
        metrics: compact({
          impressions: String(impr),
          clicks: String(clk),
          costMicros: String(costMicros),
          conversions: conversions[day]!,
          conversionsValue: 0,
          ctr: impr === 0 ? 0 : Math.round((clk / impr) * 1e6) / 1e6,
          averageCpc: clk === 0 ? 0 : String(Math.round(costMicros / clk)),
          searchImpressionShare: searchShare,
          searchBudgetLostImpressionShare: budgetLost,
          searchRankLostImpressionShare: rankLost,
        }),
      });
    });
  });

  // The API returns these ordered by date, campaigns interleaved.
  return rows.sort((a, b) => {
    const key = (row: unknown): string => {
      const r = row as { segments: { date: string }; campaign: { id: string } };
      return `${r.segments.date}#${r.campaign.id}`;
    };
    return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
  });
}

interface KeywordModel {
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  campaign: number;
  adGroup: string;
  impressions: number;
  clicks: number;
  cpc: number;
  /** Page views, which can be well below clicks when the landing page is wrong. */
  conversions: number;
  qualityScore?: number;
  status?: 'ENABLED' | 'PAUSED';
  /** Why this row is in the fixture — the case it exists to exercise. */
  why: string;
}

const KEYWORDS: KeywordModel[] = [
  { text: 'โปรเน็ต ais', matchType: 'EXACT', campaign: 0, adGroup: '3000000301', impressions: 12_400, clicks: 2_108, cpc: 2.9, conversions: 1_961, qualityScore: 10, why: 'แบรนด์ ปกติดี ใช้เป็นฐานเทียบ' },
  { text: 'ais 12call เติมเงิน', matchType: 'PHRASE', campaign: 0, adGroup: '3000000301', impressions: 8_950, clicks: 1_043, cpc: 3.4, conversions: 962, qualityScore: 9, why: 'แบรนด์ match type อื่น' },
  { text: 'สมัครโปรเน็ตรายเดือน', matchType: 'PHRASE', campaign: 1, adGroup: '3000000302', impressions: 41_200, clicks: 1_297, cpc: 7.2, conversions: 1_118, qualityScore: 7, why: 'ทั่วไป ปกติดี' },
  { text: 'เน็ตไม่อั้น ราคาถูก', matchType: 'BROAD', campaign: 1, adGroup: '3000000302', impressions: 63_800, clicks: 1_842, cpc: 8.6, conversions: 1_534, qualityScore: 6, why: 'BROAD volume สูง' },
  { text: 'โปรเน็ตรายวัน', matchType: 'PHRASE', campaign: 1, adGroup: '3000000303', impressions: 18_700, clicks: 614, cpc: 6.9, conversions: 522, qualityScore: 7, why: 'mid-tail ปกติ' },
  // ── the cases worth finding ───────────────────────────────────────────────
  { text: 'อินเทอร์เน็ตบ้าน', matchType: 'BROAD', campaign: 1, adGroup: '3000000303', impressions: 52_300, clicks: 78, cpc: 9.1, conversions: 61, qualityScore: 3, why: 'impression เยอะ คลิกแทบไม่มี (CTR 0.15%) — คำไม่ตรงเจตนา' },
  { text: 'ย้ายค่ายเบอร์เดิม', matchType: 'BROAD', campaign: 2, adGroup: '3000000304', impressions: 9_400, clicks: 121, cpc: 31.4, conversions: 74, qualityScore: 4, why: 'CPC สูงกว่าค่าเฉลี่ยบัญชี ~4 เท่า' },
  { text: 'โปรเน็ต true', matchType: 'EXACT', campaign: 2, adGroup: '3000000304', impressions: 6_100, clicks: 96, cpc: 18.2, conversions: 22, qualityScore: 5, why: 'คลิกมา แต่ page view แค่ 23% — หน้า landing ไม่ตรง' },
  { text: 'เน็ตฟรี ไม่ต้องสมัคร', matchType: 'BROAD', campaign: 1, adGroup: '3000000303', impressions: 28_900, clicks: 903, cpc: 5.2, conversions: 241, qualityScore: 4, why: 'คนหาของฟรี คลิกเยอะ page view ต่ำ — ตัวเลือก negative' },
  { text: 'โปรเน็ต dtac', matchType: 'EXACT', campaign: 2, adGroup: '3000000304', impressions: 4_800, clicks: 52, cpc: 16.8, conversions: 33, qualityScore: 4, why: 'คู่แข่ง แพงและ QS ต่ำ' },
  { text: 'ซิมเทพ รายปี', matchType: 'PHRASE', campaign: 1, adGroup: '3000000302', impressions: 0, clicks: 0, cpc: 0, conversions: 0, qualityScore: 5, why: 'ไม่เคยแสดงเลย — บิดต่ำ หรือคนไม่ค้น (ทุก metric หายไปจาก JSON)' },
  { text: 'โปรเน็ต ais รายเดือน 199', matchType: 'EXACT', campaign: 0, adGroup: '3000000301', impressions: 3_120, clicks: 498, cpc: 2.6, conversions: 471, qualityScore: 10, why: 'long tail ที่ดีที่สุด' },
  { text: 'เติมเงิน ais ออนไลน์', matchType: 'PHRASE', campaign: 0, adGroup: '3000000301', impressions: 5_400, clicks: 389, cpc: 3.8, conversions: 351, qualityScore: 8, why: 'ปกติ' },
  { text: 'แพ็กเกจเน็ต', matchType: 'BROAD', campaign: 1, adGroup: '3000000302', impressions: 33_100, clicks: 611, cpc: 9.8, conversions: 498, qualityScore: 5, why: 'BROAD กว้างไป QS กลางๆ' },
  { text: 'เน็ต 5g ราคา', matchType: 'PHRASE', campaign: 1, adGroup: '3000000303', impressions: 14_600, clicks: 402, cpc: 8.1, conversions: 338, qualityScore: 6, why: 'ปกติ' },
  { text: 'โปรเน็ต ais ล่าสุด', matchType: 'PHRASE', campaign: 0, adGroup: '3000000301', impressions: 2_980, clicks: 318, cpc: 3.2, conversions: 294, qualityScore: 9, why: 'ปกติ' },
  { text: 'เบอร์มงคล ราคาถูก', matchType: 'BROAD', campaign: 1, adGroup: '3000000303', impressions: 7_700, clicks: 156, cpc: 11.4, conversions: 39, status: 'PAUSED', qualityScore: 3, why: 'หยุดไปแล้ว แต่ยังมีข้อมูลย้อนหลัง — reader ต้องไม่นับรวมเป็น active' },
  { text: 'โปรเน็ต ais 1 เดือน', matchType: 'EXACT', campaign: 0, adGroup: '3000000301', impressions: 4_260, clicks: 602, cpc: 2.8, conversions: 571, qualityScore: 10, why: 'ปกติ' },
];

function buildKeywords(): unknown[] {
  return KEYWORDS.map((k, index) => {
    const campaign = CAMPAIGNS[k.campaign]!;
    const criterionId = String(3_000_001_000 + index);
    return {
      campaign: { resourceName: res(`campaigns/${campaign.id}`), id: campaign.id },
      adGroup: { resourceName: res(`adGroups/${k.adGroup}`), id: k.adGroup },
      adGroupCriterion: {
        resourceName: res(`adGroupCriteria/${k.adGroup}~${criterionId}`),
        criterionId,
        status: k.status ?? 'ENABLED',
        keyword: { text: k.text, matchType: k.matchType },
        ...(k.qualityScore === undefined
          ? {}
          : { qualityInfo: { qualityScore: k.qualityScore } }),
      },
      keywordView: { resourceName: res(`keywordViews/${k.adGroup}~${criterionId}`) },
      metrics: compact({
        impressions: String(k.impressions),
        clicks: String(k.clicks),
        costMicros: baht(k.clicks * k.cpc),
        conversions: k.conversions,
      }),
    };
  });
}

interface TermModel {
  term: string;
  campaign: number;
  adGroup: string;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  status?: string;
  why: string;
}

const SEARCH_TERMS: TermModel[] = [
  { term: 'โปรเน็ต ais', campaign: 0, adGroup: '3000000301', impressions: 9_800, clicks: 1_688, cpc: 2.9, conversions: 1_572, status: 'ADDED', why: 'คำหลัก มีคีย์เวิร์ดรองรับแล้ว' },
  { term: 'สมัคร โปรเน็ต ais รายเดือน', campaign: 0, adGroup: '3000000301', impressions: 2_140, clicks: 402, cpc: 3.1, conversions: 381, status: 'NONE', why: 'ดีมาก ยังไม่ได้เพิ่มเป็นคีย์เวิร์ด — ตัวเลือกเพิ่ม' },
  { term: 'เน็ตฟรี ไม่ต้องจ่าย', campaign: 1, adGroup: '3000000303', impressions: 6_400, clicks: 318, cpc: 5.1, conversions: 58, status: 'NONE', why: 'หาของฟรี — เผางบ ควรเป็น negative' },
  { term: 'โหลดแอพ ais ฟรี', campaign: 1, adGroup: '3000000303', impressions: 4_900, clicks: 244, cpc: 4.8, conversions: 41, status: 'NONE', why: 'คนละเจตนา — negative' },
  { term: 'สมัครงาน ais', campaign: 1, adGroup: '3000000302', impressions: 3_200, clicks: 96, cpc: 6.4, conversions: 7, status: 'NONE', why: 'หางาน ไม่ใช่ลูกค้า — negative ชัดเจน' },
  { term: 'ais call center เบอร์อะไร', campaign: 1, adGroup: '3000000302', impressions: 2_800, clicks: 141, cpc: 5.6, conversions: 22, status: 'NONE', why: 'หาเบอร์ติดต่อ ไม่ได้จะซื้อ' },
  { term: 'โปรเน็ต ais ไม่ลดสปีด', campaign: 1, adGroup: '3000000302', impressions: 5_100, clicks: 289, cpc: 7.4, conversions: 249, status: 'NONE', why: 'ดี ควรเพิ่ม' },
  { term: 'เน็ตไม่อั้น ราคาถูก ที่สุด', campaign: 1, adGroup: '3000000302', impressions: 8_300, clicks: 402, cpc: 8.2, conversions: 331, status: 'ADDED', why: 'ปกติ' },
  { term: 'true โปรเน็ต ราคา', campaign: 2, adGroup: '3000000304', impressions: 3_900, clicks: 62, cpc: 19.1, conversions: 14, status: 'NONE', why: 'คู่แข่ง แพงและไม่คุ้ม' },
  { term: 'ย้ายค่าย เบอร์เดิม ais', campaign: 2, adGroup: '3000000304', impressions: 4_100, clicks: 88, cpc: 28.9, conversions: 52, status: 'NONE', why: 'CPC สูงมาก' },
  { term: 'ais โปรเน็ต 199 บาท', campaign: 0, adGroup: '3000000301', impressions: 1_920, clicks: 341, cpc: 2.7, conversions: 322, status: 'NONE', why: 'ดี ควรเพิ่ม' },
  { term: 'เช็คโปรเน็ตที่ใช้อยู่', campaign: 1, adGroup: '3000000303', impressions: 7_200, clicks: 12, cpc: 6.2, conversions: 9, status: 'NONE', why: 'impression เยอะ คลิกแทบไม่มี — โฆษณาไม่ตรงคำค้น' },
  { term: 'ซิมรายปี ราคา', campaign: 1, adGroup: '3000000302', impressions: 2_600, clicks: 118, cpc: 9.4, conversions: 96, status: 'NONE', why: 'ปกติ' },
  { term: 'dtac โปรเน็ต', campaign: 2, adGroup: '3000000304', impressions: 2_200, clicks: 41, cpc: 17.2, conversions: 24, status: 'NONE', why: 'คู่แข่ง' },
  { term: 'โปรเน็ต ais เดือนละ 100', campaign: 0, adGroup: '3000000301', impressions: 1_480, clicks: 226, cpc: 3, conversions: 214, status: 'NONE', why: 'ดี' },
  { term: 'วิธียกเลิกโปรเน็ต', campaign: 1, adGroup: '3000000303', impressions: 3_600, clicks: 174, cpc: 5.9, conversions: 31, status: 'NONE', why: 'จะเลิกใช้ ไม่ใช่จะสมัคร — negative' },
];

function buildSearchTerms(): unknown[] {
  return SEARCH_TERMS.map((t) => {
    const campaign = CAMPAIGNS[t.campaign]!;
    return {
      searchTermView: {
        resourceName: res(`searchTermViews/${t.adGroup}~${encodeURIComponent(t.term)}`),
        searchTerm: t.term,
        status: t.status ?? 'NONE',
      },
      campaign: { resourceName: res(`campaigns/${campaign.id}`), id: campaign.id },
      adGroup: { resourceName: res(`adGroups/${t.adGroup}`), id: t.adGroup },
      metrics: compact({
        impressions: String(t.impressions),
        clicks: String(t.clicks),
        costMicros: baht(t.clicks * t.cpc),
        conversions: t.conversions,
      }),
    };
  }).sort((a, b) => {
    const cost = (row: unknown): number =>
      Number((row as { metrics: { costMicros?: string } }).metrics.costMicros ?? '0');
    return cost(b) - cost(a);
  });
}

/** Thai search for this vertical peaks late morning and again after work. */
const HOUR_WEIGHT = [
  0.10, 0.05, 0.03, 0.02, 0.03, 0.08, 0.22, 0.48, 0.74, 0.95, 1.00, 0.92,
  0.78, 0.82, 0.88, 0.90, 0.95, 1.05, 1.12, 1.08, 0.96, 0.72, 0.44, 0.22,
];
const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function buildHourOfDay(): unknown[] {
  const rows: unknown[] = [];

  CAMPAIGNS.forEach((c, index) => {
    const total = keywordTotals(index);

    // One cell per (day of week, hour), covering the whole 30 days — so these
    // add up to the same totals as the daily rows, which is what makes the two
    // views of the same campaign agree.
    const cells: { day: number; hour: number; weight: number }[] = [];
    for (let day = 0; day < 7; day += 1) {
      const dayFactor = day === 0 ? 0.72 : day === 6 ? 0.78 : day === 1 ? 1.08 : 1;
      for (let hour = 0; hour < 24; hour += 1) {
        cells.push({ day, hour, weight: HOUR_WEIGHT[hour]! * dayFactor * jitter(0.15) });
      }
    }

    // Clicks decide which slots served at all. The API returns no row for a
    // slot with no activity, so the dead hours before dawn are simply absent
    // and readers must not assume 168 rows per campaign.
    const clicksPerCell = distribute(total.clicks, cells.map((cell) => cell.weight));
    const live = cells
      .map((cell, i) => ({ cell, clicks: clicksPerCell[i]! }))
      .filter((entry) => entry.clicks > 0);

    // Cost and page views are then split across only the slots that served, so
    // dropping the empty ones does not quietly lose part of the total.
    const liveWeights = live.map((entry) => entry.cell.weight);
    const cost = distribute(total.costMicros, liveWeights);
    const conversions = distribute(total.conversions, liveWeights);

    live.forEach((entry, i) => {
      rows.push({
        campaign: { resourceName: res(`campaigns/${c.id}`), id: c.id },
        segments: { hour: entry.cell.hour, dayOfWeek: DAY_OF_WEEK[entry.cell.day] },
        metrics: compact({
          clicks: String(entry.clicks),
          costMicros: String(cost[i]),
          conversions: conversions[i]!,
        }),
      });
    });
  });

  return rows;
}

function buildConversionActions(): unknown[] {
  return [
    {
      conversionAction: {
        resourceName: res('conversionActions/3000000401'),
        id: '3000000401',
        name: 'เข้าชมหน้าเว็บ (Page view)',
        type: 'WEBPAGE',
        category: 'PAGE_VIEW',
        status: 'ENABLED',
        primaryForGoal: true,
        countingType: 'MANY_PER_CLICK',
      },
    },
    {
      conversionAction: {
        resourceName: res('conversionActions/3000000402'),
        id: '3000000402',
        name: 'กดโทรจากเว็บไซต์',
        type: 'WEBSITE_CALL',
        category: 'PHONE_CALL_LEAD',
        status: 'ENABLED',
        primaryForGoal: false,
        countingType: 'ONE_PER_CLICK',
      },
    },
  ];
}

const FILES: { file: string; what: string; query: string; rows: () => unknown[] }[] = [
  {
    file: 'campaigns.json',
    what: 'แคมเปญ 3 ตัว (แบรนด์ / ทั่วไป / คู่แข่ง) พร้อมงบรายวัน',
    query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign.bidding_strategy_type, campaign.start_date_time, campaign.end_date_time,
            campaign_budget.amount_micros, campaign_budget.explicitly_shared
            FROM campaign ORDER BY campaign.id LIMIT 200`,
    rows: buildCampaigns,
  },
  {
    file: 'campaign-metrics-30d.json',
    what: '30 วัน × 3 แคมเปญ — มี weekend dip, แคมเปญที่ชนงบ, และช่วงที่คู่แข่งบิดสู้',
    query: `SELECT campaign.id, campaign.name, segments.date, metrics.impressions, metrics.clicks,
            metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr,
            metrics.average_cpc, metrics.search_impression_share,
            metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share
            FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY segments.date LIMIT 1000`,
    rows: buildCampaignMetrics,
  },
  {
    file: 'keywords-30d.json',
    what: 'คีย์เวิร์ด 18 คำ — มีทั้งคำที่ดี, CTR ต่ำมาก, CPC แพง, คลิกแล้วไม่เข้าหน้า, และคำที่ไม่เคยแสดง',
    query: `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type, ad_group_criterion.status,
            ad_group_criterion.quality_info.quality_score, campaign.id, ad_group.id,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
            FROM keyword_view WHERE segments.date DURING LAST_30_DAYS
            ORDER BY metrics.cost_micros DESC LIMIT 500`,
    rows: buildKeywords,
  },
  {
    file: 'search-terms-30d.json',
    what: 'คำค้น 16 คำ — มีคำหาของฟรี/หางาน/จะยกเลิก ที่ควรเป็น negative',
    query: `SELECT search_term_view.search_term, search_term_view.status, campaign.id, ad_group.id,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
            FROM search_term_view WHERE segments.date DURING LAST_30_DAYS
            ORDER BY metrics.cost_micros DESC LIMIT 500`,
    rows: buildSearchTerms,
  },
  {
    file: 'hour-of-day-30d.json',
    what: 'ชั่วโมง × วันในสัปดาห์ — พีคสาย และหลังเลิกงาน',
    query: `SELECT campaign.id, segments.hour, segments.day_of_week, metrics.clicks,
            metrics.cost_micros, metrics.conversions FROM campaign
            WHERE segments.date DURING LAST_30_DAYS LIMIT 1000`,
    rows: buildHourOfDay,
  },
  {
    file: 'conversion-actions.json',
    what: 'PAGE_VIEW เป็น primary ตามเป้าหมาย traffic (D26) + call เป็น secondary',
    query: `SELECT conversion_action.id, conversion_action.name, conversion_action.type,
            conversion_action.category, conversion_action.status,
            conversion_action.primary_for_goal, conversion_action.counting_type
            FROM conversion_action LIMIT 100`,
    rows: buildConversionActions,
  },
];

function main(): void {
  const flag = process.argv.indexOf('--out');
  const outDir = resolve(
    PROJECT_ROOT,
    flag === -1 ? 'test/fixtures/synthetic' : process.argv[flag + 1] ?? 'test/fixtures/synthetic',
  );
  mkdirSync(outDir, { recursive: true });

  console.log('\n=== สร้าง fixtures สังเคราะห์ (M1) ===\n');
  console.log(`seed   : ${SEED} (ผลลัพธ์เหมือนเดิมทุกครั้ง)`);
  console.log(`ช่วง    : ${dateList()[0]} .. ${LAST_DAY}`);
  console.log(`เขียนลง : ${outDir}\n`);

  for (const spec of FILES) {
    const rows = spec.rows();
    writeFileSync(
      resolve(outDir, spec.file),
      envelope({ what: spec.what, query: spec.query, rows }),
      'utf8',
    );
    console.log(`• ${spec.file.padEnd(28)} ${String(rows.length).padStart(4)} แถว ✅`);
  }

  console.log('\nเสร็จแล้ว — ไฟล์เหล่านี้ commit ได้ ไม่มีข้อมูลจริงอยู่เลย\n');
}

main();
