/**
 * Balance Runner — §13.2 ข้อ 2 / §16
 * รันด่านจำลองแบบ headless จำนวนมากด้วย AutoPlayer แล้วรายงาน win-rate ต่อระดับ
 * ใช้ตรวจสมดุลก่อนผู้เล่นเจอ และเป็น DoD ของ Phase 1 ("รัน 1,000 ด่านจำลองไม่พัง")
 *
 *   npm run balance -- --runs 1000
 *   npm run balance -- --stage ch1_03 --levels 10,15,20 --runs 300
 */
import { stages, type Stage } from '@runegate/data';
import { AutoPlayer, Battle, runHeadless } from '@runegate/sim';

const DEFAULT_SQUAD = [
  'warden_kael',
  'forgemaster_durn',
  'militia_swordsman',
  'sylvane_archer',
  'archmage_ignis',
  'cleric_seraphine',
  'hexer_morrin',
  'quartermaster_pell',
];

/** เลเวลอ้างอิงที่ "ควรผ่านด่านนี้ได้" — ใช้เป็นเกณฑ์สอบสมดุล */
const REFERENCE_LEVEL: Record<string, number> = {
  ch1_01: 1,
  ch1_02: 8,
  ch1_03: 15,
  ch1_04: 28,
};
/** win-rate ขั้นต่ำที่เลเวลอ้างอิง (AutoPlayer เล่นไม่เก่งเท่าคน จึงตั้งไว้ 80%) */
const MIN_WIN_RATE = 0.8;
/** win-rate สูงสุดที่เลเวลต่ำกว่าอ้างอิงมาก — ถ้าสูงกว่านี้แปลว่าด่านง่ายเกินไป */
const MAX_EASY_WIN_RATE = 0.35;
/**
 * จำนวนรอบขั้นต่ำต่อ (ด่าน × เลเวล) ที่จะเชื่อผลได้
 * ต่ำกว่านี้ผลจะแกว่งจนตัดสินไม่ได้ — เคยเจอกรณี 9 รอบให้ 78% แต่ 240 รอบให้ 90%
 * ผู้ใช้สั่ง --runs น้อยได้ แต่ runner จะดันขึ้นมาที่ค่านี้เองเพื่อไม่ให้สรุปผิด
 */
const MIN_RUNS_PER_COMBO = 20;

interface Args {
  runs: number;
  stageIds: string[];
  levels: number[];
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    runs: Number(get('--runs') ?? 300),
    stageIds: (get('--stage') ?? '').split(',').filter(Boolean),
    levels: (get('--levels') ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number),
    quiet: argv.includes('--quiet'),
  };
}

interface Row {
  stage: Stage;
  level: number;
  runs: number;
  wins: number;
  stars: number;
  baseHp: number;
  leaks: number;
  seconds: number;
}

function simulate(stage: Stage, level: number, runs: number, seedBase: number): Row {
  const squad = DEFAULT_SQUAD.map((heroId) => ({ heroId, level }));
  const row: Row = { stage, level, runs, wins: 0, stars: 0, baseHp: 0, leaks: 0, seconds: 0 };
  for (let i = 0; i < runs; i++) {
    const battle = new Battle({ stage, squad, seed: seedBase + i, recordEvents: false });
    runHeadless(battle, new AutoPlayer(battle));
    const r = battle.result();
    if (!Number.isFinite(r.baseHp) || !Number.isFinite(r.elapsedSec)) {
      throw new Error(`[balance] ค่าผลลัพธ์เพี้ยน (NaN) ที่ด่าน ${stage.id} เลเวล ${level} seed ${seedBase + i}`);
    }
    if (r.win) row.wins++;
    row.stars += r.stars;
    row.baseHp += r.baseHp;
    row.leaks += r.leaks;
    row.seconds += r.elapsedSec;
  }
  return row;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const targetStages = args.stageIds.length > 0 ? stages.filter((s) => args.stageIds.includes(s.id)) : stages;
  if (targetStages.length === 0) throw new Error('ไม่พบด่านที่ระบุ');

  const levelsFor = (s: Stage): number[] => {
    if (args.levels.length > 0) return args.levels;
    const ref = REFERENCE_LEVEL[s.id] ?? 1 + (s.index - 1) * 7;
    return [...new Set([Math.max(1, Math.round(ref / 3)), ref, Math.round(ref * 1.6)])].sort((a, b) => a - b);
  };

  const combos = targetStages.flatMap((s) => levelsFor(s).map((level) => ({ stage: s, level })));
  const requested = Math.max(1, Math.floor(args.runs / combos.length));
  const runsPer = Math.max(MIN_RUNS_PER_COMBO, requested);
  if (runsPer > requested && !args.quiet) {
    console.log(
      `\nℹ️  ขอมา ${args.runs} รอบ (= ${requested} รอบต่อช่อง) ซึ่งน้อยเกินกว่าจะเชื่อผลได้ ` +
        `— รันจริง ${runsPer * combos.length} รอบ (${runsPer} รอบต่อช่อง)`,
    );
  }

  const started = Date.now();
  const rows: Row[] = [];
  let seed = 20260101;
  for (const c of combos) {
    rows.push(simulate(c.stage, c.level, runsPer, seed));
    seed += runsPer;
  }
  const elapsedMs = Date.now() - started;
  const totalRuns = rows.reduce((n, r) => n + r.runs, 0);

  if (!args.quiet) {
    console.log('\n⚔️  ผลรันจำลองสมดุล (AutoPlayer, ทีมมาตรฐาน 8 ตัว)\n');
    console.log('ด่าน        เลเวล  รอบ   ชนะ     ดาวเฉลี่ย  เลือดฐาน  หลุด/ด่าน  เวลาเฉลี่ย');
    console.log('─'.repeat(78));
    for (const r of rows) {
      const wr = r.wins / r.runs;
      console.log(
        `${r.stage.id.padEnd(11)} ${String(r.level).padStart(4)}  ${String(r.runs).padStart(4)}  ` +
          `${(wr * 100).toFixed(0).padStart(4)}%  ${(r.stars / r.runs).toFixed(2).padStart(8)}  ` +
          `${(r.baseHp / r.runs).toFixed(1).padStart(7)}/${r.stage.baseHp}  ${(r.leaks / r.runs).toFixed(2).padStart(7)}  ` +
          `${(r.seconds / r.runs).toFixed(0).padStart(7)}s`,
      );
    }
    console.log('─'.repeat(78));
    console.log(`รวม ${totalRuns} ด่าน ใน ${(elapsedMs / 1000).toFixed(1)} วินาที (${(elapsedMs / totalRuns).toFixed(1)} ms/ด่าน)\n`);
  }

  // ตรวจเกณฑ์สมดุล
  const failures: string[] = [];
  for (const r of rows) {
    const ref = REFERENCE_LEVEL[r.stage.id] ?? 1 + (r.stage.index - 1) * 7;
    const wr = r.wins / r.runs;
    if (r.level === ref && wr < MIN_WIN_RATE) {
      failures.push(`${r.stage.id} ที่เลเวลอ้างอิง ${ref} ชนะแค่ ${(wr * 100).toFixed(0)}% (ต้อง ≥ ${MIN_WIN_RATE * 100}%)`);
    }
    if (ref > 3 && r.level <= Math.round(ref / 3) && wr > MAX_EASY_WIN_RATE) {
      failures.push(`${r.stage.id} ที่เลเวล ${r.level} ชนะถึง ${(wr * 100).toFixed(0)}% — ด่านง่ายเกินไป`);
    }
  }
  if (failures.length > 0) {
    console.error('❌ สมดุลไม่ผ่านเกณฑ์:');
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log('✅ สมดุลผ่านเกณฑ์ทุกด่าน');
}

main();
