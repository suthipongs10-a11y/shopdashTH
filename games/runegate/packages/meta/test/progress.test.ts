import { describe, expect, it } from 'vitest';
import { getHero, getStage, heroStats, maxLevelForStar, naturalStar, progression, skillFor, getSkill } from '@runegate/data';
import { Rng } from '@runegate/sim';

import {
  applyBattleRewards,
  awakenHero,
  battleSquad,
  createInitialState,
  feedExpPotions,
  grantExp,
  grantHero,
  itemName_th,
  levelUpHero,
  migrateState,
  rollDropTable,
  setTeam,
  shardItem,
  essenceItem,
  skillUpHero,
  starUpHero,
  TEAM_SIZE,
  type PlayerState,
} from '../src/index.js';
import { addItems } from '../src/items.js';

const HERO = 'militia_swordsman';

function rich(state: PlayerState, extra: Record<string, number> = {}): PlayerState {
  return {
    ...state,
    gold: 5_000_000,
    materials: addItems(state.materials, { hero_exp_potion: 500, skill_scroll: 200, ...extra }),
  };
}

/** ดันฮีโร่ให้ถึงเพดานเลเวลของดาวปัจจุบัน */
function maxOut(state: PlayerState, heroId: string): PlayerState {
  let s = rich(state);
  const cap = maxLevelForStar(s.roster[heroId]!.star);
  for (let i = 0; i < 200 && s.roster[heroId]!.level < cap; i++) {
    s = grantExp(s, heroId, 100_000);
    const r = levelUpHero(s, heroId, 99);
    if (!r.ok) throw new Error(r.reason_th);
    s = r.state;
  }
  return s;
}

describe('สถานะเริ่มต้น', () => {
  it('มีฮีโร่ตั้งต้นครบและจัดลงทีมให้อัตโนมัติ', () => {
    const s = createInitialState();
    expect(Object.keys(s.roster).length).toBe(progression.starter.heroes.length);
    expect(s.team.length).toBe(Math.min(TEAM_SIZE, progression.starter.heroes.length));
    expect(s.gold).toBe(progression.starter.gold);
    for (const hs of Object.values(s.roster)) {
      expect(hs.level).toBe(1);
      expect(hs.star).toBe(naturalStar(getHero(hs.id)));
      expect(hs.awakened).toBe(false);
    }
  });

  it('ทีมมีได้ไม่เกิน 8 ตัว และต้องเป็นฮีโร่ที่มีอยู่จริง', () => {
    const s = createInitialState();
    expect(setTeam(s, [...s.team, 'archmage_ignis']).ok).toBe(false); // ยังไม่มีในคลัง
    const nine = Array.from({ length: 9 }, (_, i) => `h${i}`);
    expect(setTeam(s, nine).ok).toBe(false);
  });
});

describe('เลเวล', () => {
  it('ต้องมีทั้ง EXP และทองถึงจะเลื่อนได้', () => {
    const s = createInitialState();
    expect(levelUpHero(s, HERO).ok).toBe(false); // EXP ยังเป็น 0

    const withExp = grantExp(s, HERO, 100_000);
    const poor = { ...withExp, gold: 0 };
    const r1 = levelUpHero(poor, HERO);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason_th).toContain('ทอง');

    const r2 = levelUpHero(withExp, HERO);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.state.roster[HERO]!.level).toBe(2);
  });

  it('เลื่อนหลายขั้นรวดเดียวแล้วหักทอง/EXP ตามจริง', () => {
    const s = grantExp(rich(createInitialState()), HERO, 100_000);
    const r = levelUpHero(s, HERO, 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.roster[HERO]!.level).toBe(6);
    expect(r.state.gold).toBeLessThan(s.gold);
    expect(r.state.roster[HERO]!.exp).toBeLessThan(s.roster[HERO]!.exp);
  });

  it('ตันที่เพดานของดาว จนกว่าจะเลื่อนดาว', () => {
    const s = maxOut(createInitialState(), HERO);
    const hs = s.roster[HERO]!;
    expect(hs.level).toBe(maxLevelForStar(hs.star));
    const r = levelUpHero(s, HERO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason_th).toContain('เพดานเลเวล');
  });

  it('ยาเพิ่มประสบการณ์แปลงเป็น EXP ตามอัตราในคอนฟิก', () => {
    const s = createInitialState();
    const r = feedExpPotions(s, HERO, 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.roster[HERO]!.exp).toBe(3 * progression.level.expPerPotion);
    expect(r.state.materials.hero_exp_potion).toBe(s.materials.hero_exp_potion! - 3);
    expect(feedExpPotions(s, HERO, 9999).ok).toBe(false);
  });
});

describe('ดาว', () => {
  it('ต้องเต็มเลเวลก่อน และต้องมีเศษวิญญาณพอ', () => {
    const s0 = createInitialState();
    expect(starUpHero(s0, HERO).ok).toBe(false); // ยังไม่เต็มเลเวล

    const maxed = maxOut(s0, HERO);
    const noShards = starUpHero(maxed, HERO);
    expect(noShards.ok).toBe(false);
    if (!noShards.ok) expect(noShards.reason_th).toContain('เศษวิญญาณ');

    const need = progression.star.shardsPerStar * maxed.roster[HERO]!.star;
    const ready = rich(maxed, { [shardItem(HERO)]: need });
    const r = starUpHero(ready, HERO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.roster[HERO]!.star).toBe(maxed.roster[HERO]!.star + 1);
    // เลเวลไม่ถูกรีเซ็ต และเพดานขยาย (DECISIONS.md)
    expect(r.state.roster[HERO]!.level).toBe(maxed.roster[HERO]!.level);
    expect(maxLevelForStar(r.state.roster[HERO]!.star)).toBeGreaterThan(maxLevelForStar(maxed.roster[HERO]!.star));
    expect(r.state.materials[shardItem(HERO)] ?? 0).toBe(0);
  });

  it('ดาวเพิ่มสถิติตามตัวคูณในคอนฟิก', () => {
    const hero = getHero(HERO);
    const nat = naturalStar(hero);
    const a = heroStats(hero, { level: 10, star: nat });
    const b = heroStats(hero, { level: 10, star: nat + 1 });
    expect(b.atk).toBe(Math.round(a.atk * (1 + progression.star.statBonusPerStar)));
    expect(b.hp).toBeGreaterThan(a.hp);
    // aspd/คริ ไม่ถูกแตะ
    expect(b.aspd).toBe(a.aspd);
    expect(b.critRate).toBe(a.critRate);
  });
});

describe('ปลุกพลัง', () => {
  it('ต้องถึงดาวขั้นต่ำ + จ่ายเอสเซนซ์ธาตุเดียวกับฮีโร่', () => {
    const s0 = createInitialState();
    expect(awakenHero(s0, HERO).ok).toBe(false);

    let s = s0;
    // ดันดาวจนถึงขั้นต่ำที่ปลุกพลังได้
    while (s.roster[HERO]!.star < progression.awaken.minStar) {
      const maxed = maxOut(s, HERO);
      const need = progression.star.shardsPerStar * maxed.roster[HERO]!.star;
      const r = starUpHero(rich(maxed, { [shardItem(HERO)]: need }), HERO);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.state;
    }

    const wrongElement = essenceItem(getHero(HERO).element === 'fire' ? 'water' : 'fire');
    expect(awakenHero(rich(s, { [wrongElement]: 999 }), HERO).ok).toBe(false);

    const right = essenceItem(getHero(HERO).element);
    const ok = awakenHero(rich(s, { [right]: progression.awaken.essence }), HERO);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.state.roster[HERO]!.awakened).toBe(true);
    expect(awakenHero(ok.state, HERO).ok).toBe(false); // ทำซ้ำไม่ได้
  });

  it('ปลุกพลังแล้วสถิติขึ้นและคูลดาวน์ท่าไม้ตายลด', () => {
    const hero = getHero(HERO);
    const plain = heroStats(hero, { level: 20 });
    const awake = heroStats(hero, { level: 20, awakened: true });
    expect(awake.atk).toBe(Math.round(plain.atk * (1 + progression.awaken.statBonus)));

    const ult = [...hero.skills].map((id) => getSkill(id)).find((sk) => sk.type === 'ultimate');
    if (ult && ult.cooldownSec > 0) {
      expect(skillFor(ult, 1, true).cooldownSec).toBeLessThan(ult.cooldownSec);
    }
  });
});

describe('ระดับสกิล', () => {
  it('เลื่อนได้จนถึงเพดาน แล้วทำให้สกิลแรงขึ้น/คูลดาวน์สั้นลง', () => {
    let s = rich(createInitialState());
    const skillId = getHero(HERO).skills[0]!;
    const before = getSkill(skillId);
    expect(skillFor(before, 1)).toBe(before); // ระดับ 1 ต้องเป็นตัวเดิมเป๊ะ (ผลจำลองเดิมไม่ขยับ)

    for (let i = 1; i < progression.skill.maxLevel; i++) {
      const r = skillUpHero(s, HERO, skillId);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.state;
    }
    expect(s.roster[HERO]!.skillLevels[skillId]).toBe(progression.skill.maxLevel);
    expect(skillUpHero(s, HERO, skillId).ok).toBe(false);

    const maxed = skillFor(before, progression.skill.maxLevel);
    if (before.cooldownSec > 0) expect(maxed.cooldownSec).toBeLessThan(before.cooldownSec);
    const dmgBefore = before.effects.find((e) => e.kind === 'damage' || e.kind === 'heal');
    const dmgAfter = maxed.effects.find((e) => e.kind === 'damage' || e.kind === 'heal');
    if (dmgBefore && dmgAfter && 'ratio' in dmgBefore && 'ratio' in dmgAfter) {
      expect(dmgAfter.ratio).toBeGreaterThan(dmgBefore.ratio);
    }
  });

  it('เลื่อนสกิลที่ฮีโร่ไม่มีไม่ได้', () => {
    const s = rich(createInitialState());
    expect(skillUpHero(s, HERO, 'skill_that_does_not_exist').ok).toBe(false);
  });
});

describe('ได้ฮีโร่ใหม่', () => {
  it('ตัวใหม่เข้าคลัง ตัวซ้ำกลายเป็นเศษวิญญาณ', () => {
    const s = createInitialState();
    const first = grantHero(s, 'archmage_ignis');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.roster['archmage_ignis']).toBeDefined();

    const dup = grantHero(first.state, 'archmage_ignis');
    expect(dup.ok).toBe(true);
    if (!dup.ok) return;
    expect(dup.state.materials[shardItem('archmage_ignis')]).toBe(progression.star.shardsPerStar);
    expect(Object.keys(dup.state.roster).length).toBe(Object.keys(first.state.roster).length);
  });
});

describe('รางวัลหลังจบด่าน', () => {
  const stage = getStage('ch1_01');
  const outcome = {
    win: true,
    stars: 3,
    goldEarned: 500,
    expEarned: 300,
    heroes: [{ heroId: HERO }, { heroId: 'ranger_bryn' }],
  };

  it('จ่ายทอง/EXP/ดาว/เพชร first clear ครั้งเดียว', () => {
    const s0 = createInitialState();
    const a = applyBattleRewards(s0, stage, outcome, new Rng(1));
    expect(a.summary.firstClear).toBe(true);
    expect(a.state.gold).toBeGreaterThanOrEqual(s0.gold + outcome.goldEarned);
    expect(a.state.gems).toBe(s0.gems + stage.rewards.firstClearGems);
    expect(a.state.stars[stage.id]).toBe(3);
    expect(a.state.roster[HERO]!.exp).toBe(150);
    expect(a.state.roster['ranger_bryn']!.exp).toBe(150);

    const b = applyBattleRewards(a.state, stage, outcome, new Rng(1));
    expect(b.summary.firstClear).toBe(false);
    expect(b.state.gems).toBe(a.state.gems);
  });

  it('แพ้แล้วไม่ได้ดรอปและดาวไม่ลด', () => {
    const s0 = applyBattleRewards(createInitialState(), stage, outcome, new Rng(2)).state;
    const lose = applyBattleRewards(s0, stage, { ...outcome, win: false, stars: 0 }, new Rng(2));
    expect(lose.state.stars[stage.id]).toBe(3);
    expect(Object.keys(lose.summary.items).length).toBe(0);
  });

  it('ดรอปด้วย seed เดียวกันได้ผลเหมือนกันเป๊ะ', () => {
    const s0 = createInitialState();
    const a = applyBattleRewards(s0, stage, outcome, new Rng(99));
    const b = applyBattleRewards(s0, stage, outcome, new Rng(99));
    expect(b.summary.items).toEqual(a.summary.items);
    expect(b.summary.gold).toBe(a.summary.gold);
  });

  it('ไอเทมเสมือนถูกแปลงเป็นเศษวิญญาณ/เอสเซนซ์ของฮีโร่ในทีมจริง', () => {
    const s0 = createInitialState();
    let found = false;
    for (let seed = 1; seed <= 60 && !found; seed++) {
      const r = applyBattleRewards(s0, getStage('ch1_04'), outcome, new Rng(seed));
      for (const item of Object.keys(r.summary.items)) {
        expect(item).not.toBe('hero_shard_random');
        expect(item).not.toBe('essence_random');
        if (item.startsWith('shard_')) {
          expect(s0.roster[item.slice('shard_'.length)]).toBeDefined();
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('ตารางดรอปหมุนครบตามจำนวน rolls', () => {
    const table = { id: 't', rolls: 5, entries: [{ item: 'gold', weight: 1, min: 2, max: 2 }] };
    expect(rollDropTable(table, new Rng(7))['gold']).toBe(10);
  });
});

describe('เซฟที่พังหรือมาจากเวอร์ชันเก่า', () => {
  it('ซ่อมทีละฟิลด์แทนการทิ้งทั้งก้อน', () => {
    const s = migrateState({
      version: 0,
      gold: -5,
      roster: {
        [HERO]: { level: 999, exp: -1, star: 99, awakened: true, skillLevels: { ไม่มีจริง: 9 } },
        ฮีโร่ที่ถูกถอดออก: { level: 3 },
      },
      team: [HERO, 'ไม่มีตัวนี้'],
      materials: { gold_bar: -3, skill_scroll: 4 },
      stars: { ch1_01: 9 },
    });
    expect(s.gold).toBe(0);
    expect(s.team).toEqual([HERO]);
    expect(Object.keys(s.roster)).toEqual([HERO]);
    expect(s.roster[HERO]!.star).toBe(progression.star.maxStar);
    expect(s.roster[HERO]!.exp).toBe(0);
    expect(s.materials['gold_bar']).toBeUndefined();
    expect(s.materials['skill_scroll']).toBe(4);
    expect(s.stars['ch1_01']).toBe(3);
    expect(s.roster[HERO]!.skillLevels['ไม่มีจริง']).toBeUndefined();
  });

  it('ข้อมูลขยะกลายเป็นเซฟใหม่', () => {
    expect(migrateState(null).gold).toBe(progression.starter.gold);
    expect(migrateState({ roster: {} }).team.length).toBeGreaterThan(0);
  });
});

describe('ส่งทีมเข้าด่าน', () => {
  it('battleSquad ให้โครงที่ sim รับได้ และสถิติวิ่งตามการอัพจริง', () => {
    const s = grantExp(rich(createInitialState()), HERO, 100_000);
    const up = levelUpHero(s, HERO, 5);
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    const squad = battleSquad(up.state);
    const entry = squad.find((e) => e.heroId === HERO)!;
    expect(entry.level).toBe(6);
    expect(entry.star).toBe(naturalStar(getHero(HERO)));
    expect(Object.keys(entry.skillLevels).length).toBeGreaterThan(0);
  });
});

describe('ชื่อไอเทมภาษาไทย', () => {
  it('อ่านรู้เรื่องทั้งของทั่วไปและของเฉพาะฮีโร่/ธาตุ', () => {
    expect(itemName_th('gold')).toBe('ทอง');
    expect(itemName_th(shardItem(HERO), getHero(HERO).name_th)).toContain(getHero(HERO).name_th);
    expect(itemName_th(essenceItem('fire'))).toContain('ไฟ');
  });
});

describe('เชื่อมกับ sim จริง', () => {
  it('เล่นด่านจริงด้วย AutoPlayer แล้วรางวัลไหลเข้าสถานะผู้เล่นครบ', async () => {
    const { AutoPlayer, Battle, runHeadless } = await import('@runegate/sim');
    const stage = getStage('ch1_01');

    // ทีมจากสถานะจริง: อัพทุกตัวให้พอผ่านด่านแรก
    let s = rich(createInitialState());
    for (const id of Object.keys(s.roster)) {
      s = grantExp(s, id, 500_000);
      const up = levelUpHero(s, id, 99);
      if (up.ok) s = up.state;
    }
    const squad = battleSquad(s);
    expect(squad.length).toBeGreaterThan(0);

    const battle = new Battle({ stage, squad, seed: 1234, recordEvents: false });
    runHeadless(battle, new AutoPlayer(battle));
    const result = battle.result();
    expect(result.win).toBe(true);

    const goldBefore = s.gold;
    const { state: after, summary } = applyBattleRewards(s, stage, result, new Rng(77));
    expect(after.gold).toBe(goldBefore + summary.gold);
    expect(after.stars[stage.id]).toBe(result.stars);
    expect(summary.firstClear).toBe(true);
    expect(after.gems).toBe(s.gems + stage.rewards.firstClearGems);
    // ฮีโร่ที่ลงสนามต้องได้ EXP จริง
    const gainers = Object.entries(summary.heroExp).filter(([, v]) => v > 0);
    expect(gainers.length).toBeGreaterThan(0);
    for (const [id, exp] of gainers) expect(after.roster[id]!.exp).toBeGreaterThanOrEqual(exp);
    // ด่านนี้มีตารางดรอป → ต้องได้ของอย่างน้อย 1 ชนิด และต้องไม่เหลือไอเทมเสมือน
    if (stage.rewards.dropTable) {
      expect(Object.keys(summary.items).length + summary.gold).toBeGreaterThan(0);
      for (const item of Object.keys(summary.items)) {
        expect(item.startsWith('hero_shard_random') || item === 'essence_random').toBe(false);
      }
    }
  });
});

describe('เซฟปลอม', () => {
  it('เลเวลที่เกินเพดานของดาวถูกตัดลงมาเท่าเพดาน', () => {
    const s = migrateState({
      roster: { [HERO]: { level: 99, star: 3, exp: 0, awakened: false, skillLevels: {} } },
      team: [HERO],
    });
    expect(s.roster[HERO]!.level).toBe(maxLevelForStar(3));
  });

  it('ปลุกพลังโดยดาวไม่ถึงถูกล้างทิ้ง', () => {
    const s = migrateState({
      roster: { [HERO]: { level: 5, star: 3, exp: 0, awakened: true, skillLevels: {} } },
      team: [HERO],
    });
    expect(s.roster[HERO]!.awakened).toBe(false);
  });
});
