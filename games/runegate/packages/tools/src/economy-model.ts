/**
 * โมเดลเศรษฐกิจ 90 วัน (§11.2 ข้อ 1 — "ทำสเปรดชีตก่อนเขียนโค้ด")
 * จำลองรายรับ/รายจ่ายของผู้เล่น 3 แบบ แล้ว export เป็น CSV เปิดใน Google Sheets ได้
 *
 *   npm run economy            → เขียน packages/tools/out/economy-90d.csv + สรุปบนจอ
 *
 * ค่ารายรับต่อด่านดึงจากผลรัน sim จริง ไม่ใช่ตัวเลขเดา
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { economy, getStage, progression, runeConfig } from '@runegate/data';
import { AutoPlayer, Battle, Rng, runHeadless } from '@runegate/sim';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../out/economy-90d.csv');

type Archetype = 'f2p' | 'monthly' | 'payer';

interface DayRow {
  day: number;
  archetype: Archetype;
  energyUsed: number;
  runs: number;
  goldIn: number;
  goldOut: number;
  goldBalance: number;
  gemsIn: number;
  gemsSpent: number;
  pulls: number;
  cumPulls: number;
  fiveStars: number;
  scrolls: number;
}

/** ค่าเฉลี่ยทองต่อการเคลียร์ด่านจริง (รันจริง ไม่ใช่ค่าสมมติ) */
function measureGoldPerClear(stageId: string, level: number, runs = 24): number {
  const stage = getStage(stageId);
  const squad = ['warden_kael', 'forgemaster_durn', 'militia_swordsman', 'sylvane_archer', 'archmage_ignis', 'cleric_seraphine', 'hexer_morrin', 'quartermaster_pell'].map(
    (heroId) => ({ heroId, level }),
  );
  let gold = 0;
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const b = new Battle({ stage, squad, seed: 90210 + i, recordEvents: false });
    runHeadless(b, new AutoPlayer(b));
    const r = b.result();
    if (r.win) {
      gold += r.goldEarned;
      wins++;
    }
  }
  return wins === 0 ? 0 : Math.round(gold / wins);
}

/** ค่าอัพรูน 1 ใบจาก +0 ถึงระดับที่กำหนด */
export function runeUpgradeCost(grade: number, toLevel: number): number {
  const { base, gradeExp, levelExp } = runeConfig.upgradeCost;
  let sum = 0;
  for (let lv = 0; lv < toLevel; lv++) sum += base * grade ** gradeExp * (lv + 1) ** levelExp;
  return Math.round(sum);
}

/** ค่าอัพเลเวลฮีโร่ 1 ตัวจาก 1 ถึง maxLevel */
export function heroLevelCost(maxLevel: number): number {
  const { goldBase: base, goldExponent: exp } = progression.level;
  let sum = 0;
  for (let lv = 1; lv < maxLevel; lv++) sum += base * lv ** exp;
  return Math.round(sum);
}

/** จำลองการสุ่มพร้อม pity เพื่อหาเรท ★5 ที่ผู้เล่นได้รับจริง (§6.3) */
export function effectiveFiveStarRate(pulls: number, seed = 4242): number {
  const rng = new Rng(seed);
  const { rates, hardPity, softPityStart, softPityStep } = economy.gacha;
  let sinceFive = 0;
  let fives = 0;
  for (let i = 0; i < pulls; i++) {
    sinceFive++;
    const bonus = sinceFive > softPityStart ? (sinceFive - softPityStart) * softPityStep : 0;
    const chance = sinceFive >= hardPity ? 1 : Math.min(1, rates.r5 + bonus);
    if (rng.chance(chance)) {
      fives++;
      sinceFive = 0;
    }
  }
  return fives / pulls;
}

function simulate(archetype: Archetype, days: number, goldPerClear: number, fiveRate: number): DayRow[] {
  const { energy, gacha, dailyFaucets, iap } = economy;
  const energyPerDay = Math.floor(86400 / energy.regenSecPerPoint) + dailyFaucets.questEnergy;
  const avgStageEnergy = 7;

  // เป้าหมายการอัพของผู้เล่นขยัน: ทีมหลัก 8 ตัวเลเวล 40 + รูน 6 ใบเกรด 5 ถึง +12 ต่อ 4 ตัว
  const goldGoal = heroLevelCost(40) * 8 + runeUpgradeCost(5, 12) * 6 * 4;

  let gold = 0;
  let gems = 0;
  let scrolls = 0;
  let cumPulls = 0;
  const rows: DayRow[] = [];

  for (let day = 1; day <= days; day++) {
    const runs = Math.floor(energyPerDay / avgStageEnergy);
    const energyUsed = runs * avgStageEnergy;

    // รายรับ
    const goldIn = runs * goldPerClear + dailyFaucets.questGold;
    let gemsIn = dailyFaucets.questGems + dailyFaucets.loginGems;
    if (archetype !== 'f2p') gemsIn += iap.monthlyCardGemsPerDay;
    if (archetype === 'payer' && day % 30 === 1) gemsIn += iap.battlePassGems;
    if (archetype !== 'f2p' && day % 30 === 1) gemsIn += iap.monthlyCardInstantGems;
    const scrollsIn = dailyFaucets.questScrolls;

    gold += goldIn;
    gems += gemsIn;
    scrolls += scrollsIn;

    // รายจ่าย: ทองหมดไปกับอัพรูน (sink หลัก §11.2 ข้อ 3) — ใช้ 85% ของทองที่มี
    const goldOut = Math.min(gold, Math.round(goldIn * 0.85));
    gold -= goldOut;

    // สุ่ม: ใช้คูปองก่อน แล้วค่อยใช้เจมเมื่อครบ 10 ครั้ง
    let pulls = Math.floor(scrolls);
    scrolls -= pulls;
    while (gems >= gacha.costPerPull.gems * 10) {
      gems -= gacha.costPerPull.gems * 10;
      pulls += 10;
    }
    cumPulls += pulls;

    rows.push({
      day,
      archetype,
      energyUsed,
      runs,
      goldIn,
      goldOut,
      goldBalance: gold,
      gemsIn,
      gemsSpent: pulls > 0 ? pulls * gacha.costPerPull.gems : 0,
      pulls,
      cumPulls,
      fiveStars: Number((cumPulls * fiveRate).toFixed(2)),
      scrolls: Number(scrolls.toFixed(2)),
    });
  }

  // แนบเป้าหมาย gold sink ไว้ในแถวสุดท้ายผ่าน console (ไม่ใส่ใน CSV)
  const totalGoldIn = rows.reduce((s, r) => s + r.goldIn, 0);
  (rows as DayRow[] & { meta?: unknown }).meta = { goldGoal, totalGoldIn };
  return rows;
}

function main(): void {
  const goldPerClear = measureGoldPerClear('ch1_03', 15);
  const fiveRate = effectiveFiveStarRate(200_000);
  const days = 90;

  const all: DayRow[] = [];
  for (const a of ['f2p', 'monthly', 'payer'] as Archetype[]) {
    all.push(...simulate(a, days, goldPerClear, fiveRate));
  }

  const header = Object.keys(all[0]!).join(',');
  const csv = [header, ...all.map((r) => Object.values(r).join(','))].join('\n');
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${csv}\n`, 'utf8');

  const goldGoal = heroLevelCost(40) * 8 + runeUpgradeCost(5, 12) * 6 * 4;
  console.log('\n💰 โมเดลเศรษฐกิจ 90 วัน (§11)\n');
  console.log(`ทองเฉลี่ยต่อการเคลียร์ ch1_03 (วัดจาก sim จริง): ${goldPerClear.toLocaleString('th-TH')}`);
  console.log(`เรท ★5 ที่ผู้เล่นได้รับจริงหลังรวม pity: ${(fiveRate * 100).toFixed(2)}% (ประกาศไว้ ${(economy.gacha.rates.r5 * 100).toFixed(1)}%)`);
  console.log(`เฉลี่ยต้องสุ่ม ${Math.round(1 / fiveRate)} ครั้งต่อ ★5 หนึ่งตัว\n`);

  console.log('ผู้เล่น    สุ่มรวม 90 วัน   ★5 คาดหวัง   ทองรับรวม        ทองที่ต้องใช้ (เป้าหมาย)   ครอบคลุม');
  console.log('─'.repeat(96));
  for (const a of ['f2p', 'monthly', 'payer'] as const) {
    const rows = all.filter((r) => r.archetype === a);
    const last = rows[rows.length - 1]!;
    const goldIn = rows.reduce((s, r) => s + r.goldIn, 0);
    const label = { f2p: 'F2P', monthly: 'Monthly', payer: 'Payer' }[a];
    console.log(
      `${label.padEnd(10)} ${String(last.cumPulls).padStart(10)}   ${last.fiveStars.toFixed(1).padStart(9)}   ` +
        `${goldIn.toLocaleString('th-TH').padStart(12)}   ${goldGoal.toLocaleString('th-TH').padStart(18)}   ` +
        `${((goldIn / goldGoal) * 100).toFixed(0).padStart(6)}%`,
    );
  }
  console.log('─'.repeat(96));
  console.log(`\n📄 เขียนไฟล์แล้ว: ${OUT}`);
  console.log('   (270 แถว = ผู้เล่น 3 แบบ × 90 วัน — เปิดใน Google Sheets เพื่อทำกราฟได้ทันที)\n');

  // §11.2 ข้อ 3: gold sink ต้อง "กินไม่อิ่ม" — ผู้เล่นขยันไม่ควรปิดเป้าหมายปลายเกมได้ใน 90 วัน
  const goldIn90 = all.filter((r) => r.archetype === 'f2p').reduce((s, r) => s + r.goldIn, 0);
  const coverage = goldIn90 / goldGoal;
  if (coverage > 0.6) {
    console.warn(`⚠️  Gold sink ตื้นเกินไป: 90 วันได้ทอง ${(coverage * 100).toFixed(0)}% ของเป้าหมายปลายเกม (ควร ≤ 60%)`);
  } else {
    console.log(`✅ Gold sink ลึกพอ: 90 วันได้ทอง ${(coverage * 100).toFixed(0)}% ของเป้าหมายปลายเกม`);
  }

  const f2p = all.filter((r) => r.archetype === 'f2p');
  const f2pWeek1 = f2p.slice(0, 7).reduce((s, r) => s + r.pulls, 0);
  if (f2pWeek1 < 10) {
    console.warn(`⚠️  F2P สุ่มได้แค่ ${f2pWeek1} ครั้งในสัปดาห์แรก — §6.3 ตั้งเป้าไว้ 10–15 ครั้ง/สัปดาห์`);
  } else {
    console.log(`✅ F2P สุ่มได้ ${f2pWeek1} ครั้งในสัปดาห์แรก (เป้า §6.3 คือ 10–15)`);
  }
}

main();
