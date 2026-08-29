import { describe, expect, it } from 'vitest';
import { getEnemy, getHero, TICKS_PER_SEC } from '@runegate/data';
import { Battle, isEnemy, isHero, PathTrack, Rng, runHeadless, type EnemyUnit, type HeroUnit } from '@runegate/sim';
import { makeStage, wave } from './helpers.js';

const squad = (ids: string[], level = 20) => ids.map((heroId) => ({ heroId, level }));

function advance(b: Battle, seconds: number): void {
  const n = Math.round(seconds * TICKS_PER_SEC);
  for (let i = 0; i < n && b.status === 'running'; i++) b.step();
}

describe('PathTrack', () => {
  it('คำนวณความยาวและตำแหน่งตามระยะได้ถูกต้อง', () => {
    const t = new PathTrack([[0, 2], [7, 2]]);
    expect(t.length).toBeCloseTo(7, 6);
    expect(t.at(0)).toEqual({ x: 0.5, y: 2.5 });
    expect(t.at(3.5).x).toBeCloseTo(4, 6);
    expect(t.at(999).x).toBeCloseTo(7.5, 6);
  });

  it('รองรับทางหักมุม', () => {
    const t = new PathTrack([[0, 0], [3, 0], [3, 4]]);
    expect(t.length).toBeCloseTo(7, 6);
    expect(t.at(5).y).toBeCloseTo(2.5, 6);
  });
});

describe('Deploy cost economy (§5.2)', () => {
  it('แต้มวางงอกตามเวลาและถูกหักเมื่อวางฮีโร่', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 1, 60)]), squad: squad(['militia_swordsman']), seed: 1 });
    expect(b.cost).toBe(30);
    advance(b, 5);
    expect(b.cost).toBeCloseTo(35, 1);
    const cost = getHero('militia_swordsman').cost;
    const before = b.cost;
    expect(b.deploy('militia_swordsman', 3, 2).ok).toBe(true);
    expect(b.cost).toBeCloseTo(before - cost, 5);
  });

  it('ปฏิเสธการวางเมื่อแต้มไม่พอ', () => {
    const stage = makeStage([wave('restless_shade', 1, 60)], { deploy: { initialCost: 5, costPerSec: 0, deployLimit: 6, retreatRefund: 0.5 } });
    const b = new Battle({ stage, squad: squad(['warden_kael']), seed: 1 });
    const res = b.deploy('warden_kael', 3, 2);
    expect(res.ok).toBe(false);
    expect(res.reason_th).toContain('แต้มวางไม่พอ');
  });

  it('ถอนตัวคืนแต้มบางส่วนและติดคูลดาวน์ก่อนวางใหม่', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 1, 120)]), squad: squad(['militia_swordsman']), seed: 1 });
    b.deploy('militia_swordsman', 3, 2);
    const uid = b.deployedHeroes[0]!.uid;
    const costBefore = b.cost;
    expect(b.retreat(uid).ok).toBe(true);
    expect(b.cost).toBeCloseTo(costBefore + Math.floor(getHero('militia_swordsman').cost * 0.5), 5);
    expect(b.deployedHeroes.length).toBe(0);
    expect(b.deploy('militia_swordsman', 3, 2).reason_th).toContain('คูลดาวน์');
    advance(b, getHero('militia_swordsman').redeployCooldownSec + 1);
    expect(b.deploy('militia_swordsman', 3, 2).ok).toBe(true);
  });

  it('ฮีโร่ระยะไกลลงพื้นไม่ได้ / ระยะประชิดขึ้นที่สูงไม่ได้', () => {
    const stage = makeStage([wave('restless_shade', 1, 120)], {
      deploy: { initialCost: 60, costPerSec: 1, deployLimit: 6, retreatRefund: 0.5 },
    });
    const b = new Battle({ stage, squad: squad(['sylvane_archer', 'militia_swordsman']), seed: 1 });
    expect(b.deploy('sylvane_archer', 3, 2).ok).toBe(false);
    expect(b.deploy('sylvane_archer', 3, 0).ok).toBe(true);
    expect(b.deploy('militia_swordsman', 4, 4).ok).toBe(false);
    expect(b.deploy('militia_swordsman', 4, 2).ok).toBe(true);
  });

  it('เคารพเพดานจำนวนฮีโร่ในสนาม', () => {
    const stage = makeStage([wave('restless_shade', 1, 120)], { deploy: { initialCost: 99, costPerSec: 1, deployLimit: 2, retreatRefund: 0.5 } });
    const b = new Battle({ stage, squad: squad(['militia_swordsman', 'wolfkin_striker', 'forgemaster_durn']), seed: 1 });
    expect(b.deploy('militia_swordsman', 2, 2).ok).toBe(true);
    expect(b.deploy('wolfkin_striker', 3, 2).ok).toBe(true);
    expect(b.deploy('forgemaster_durn', 4, 2).reason_th).toContain('สูงสุด 2');
  });
});

describe('การบล็อค (§5.4)', () => {
  it('ฮีโร่ melee หยุดศัตรูไว้บนทางเดิน', () => {
    // ใช้ยักษ์เลือดหนาคู่กับผู้บล็อคเลเวล 1 เพื่อให้ศัตรูยังอยู่ตอนตรวจ
    const b = new Battle({ stage: makeStage([wave('ogre_bruiser', 1, 0.1)]), squad: squad(['warden_kael'], 1), seed: 3 });
    b.deploy('warden_kael', 3, 2);
    advance(b, 8);
    const e = b.aliveEnemies[0];
    expect(e).toBeDefined();
    expect(e!.blockedBy).not.toBeNull();
    const distAt8 = e!.dist;
    advance(b, 3);
    expect(b.aliveEnemies[0]!.dist).toBeCloseTo(distAt8, 3);
  });

  it('บล็อคได้ไม่เกินจำนวนช่องของฮีโร่', () => {
    const b = new Battle({ stage: makeStage([wave('ghoul', 6, 0.1, 0.2)]), squad: squad(['militia_swordsman']), seed: 4 });
    b.deploy('militia_swordsman', 3, 2);
    advance(b, 6);
    const hero = b.deployedHeroes[0]!;
    expect(hero.blocking.length).toBeLessThanOrEqual(hero.blockCount);
  });

  it('ศัตรูบินไม่ถูกบล็อคและเดินผ่านไปได้', () => {
    const b = new Battle({ stage: makeStage([wave('wraith', 1, 0.1)]), squad: squad(['militia_swordsman']), seed: 5 });
    b.deploy('militia_swordsman', 3, 2);
    advance(b, 6);
    const flyer = b.aliveEnemies.find((e) => e.enemyId === 'wraith');
    if (flyer) expect(flyer.blockedBy).toBeNull();
    expect(b.deployedHeroes[0]!.blocking.length).toBe(0);
  });

  it('ถอนฮีโร่แล้วศัตรูที่ถูกบล็อคเดินต่อทันที', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 1, 0.1)]), squad: squad(['warden_kael']), seed: 6 });
    b.deploy('warden_kael', 3, 2);
    advance(b, 6);
    const before = b.aliveEnemies[0]!.dist;
    b.retreat(b.deployedHeroes[0]!.uid);
    advance(b, 2);
    expect(b.aliveEnemies[0]!.dist).toBeGreaterThan(before);
  });
});

describe('การเล็งเป้า (§5.4)', () => {
  it('ฮีโร่ melee ตีศัตรูบินไม่ได้ แต่ ranged ตีได้', () => {
    const b1 = new Battle({ stage: makeStage([wave('wraith', 1, 0.1)]), squad: squad(['wolfkin_striker']), seed: 7 });
    b1.deploy('wolfkin_striker', 3, 2);
    advance(b1, 5);
    expect(b1.deployedHeroes[0]!.targetUid).toBeNull();

    const b2 = new Battle({ stage: makeStage([wave('wraith', 1, 0.1)]), squad: squad(['sylvane_archer']), seed: 7 });
    b2.deploy('sylvane_archer', 3, 1 - 1);
    advance(b2, 5);
    expect(b2.deployedHeroes[0]!.targetUid).not.toBeNull();
  });

  it('ศัตรูล่องหนตีไม่ได้จนกว่าจะมีตัวเปิด', () => {
    const stage = makeStage([wave('shadow_stalker', 1, 0.1)], {
      deploy: { initialCost: 60, costPerSec: 1, deployLimit: 6, retreatRefund: 0.5 },
    });
    const noReveal = new Battle({ stage, squad: squad(['sylvane_archer']), seed: 8 });
    noReveal.deploy('sylvane_archer', 3, 0);
    advance(noReveal, 2);
    expect(noReveal.deployedHeroes[0]!.targetUid).toBeNull();

    const withReveal = new Battle({ stage, squad: squad(['sylvane_archer', 'hexer_morrin']), seed: 8 });
    withReveal.deploy('sylvane_archer', 3, 0);
    withReveal.deploy('hexer_morrin', 3, 4);
    advance(withReveal, 3);
    const kinnari = withReveal.deployedHeroes.find((h) => h.heroId === 'sylvane_archer')!;
    expect(kinnari.targetUid).not.toBeNull();
  });

  it('targetPriority=first เลือกตัวที่เดินไกลที่สุด', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 3, 0.1, 1.5)]), squad: squad(['sylvane_archer']), seed: 9 });
    b.deploy('sylvane_archer', 5, 0);
    advance(b, 6);
    const hero = b.deployedHeroes[0]!;
    const target = hero.targetUid !== null ? b.unit(hero.targetUid) : null;
    expect(target).toBeTruthy();
    const inRange = b.aliveEnemies.filter((e) => Math.hypot(e.x - hero.x, e.y - hero.y) <= hero.base.range);
    const maxDist = Math.max(...inRange.map((e) => e.dist));
    expect((target as EnemyUnit).dist).toBeCloseTo(maxDist, 5);
  });
});

describe('สูตรความเสียหาย (§5.3)', () => {
  const rng = () => new Rng(1);

  function unitsFor(heroId: string, enemyId: string) {
    const b = new Battle({ stage: makeStage([wave(enemyId, 1, 0.1)]), squad: squad([heroId]), seed: 11 });
    b.deploy(heroId, 3, getHero(heroId).pos === 'melee' ? 2 : 0);
    advance(b, 1);
    const hero = b.deployedHeroes[0]!;
    const enemy = b.aliveEnemies[0]!;
    return { b, hero, enemy };
  }

  it('ตารางธาตุ: น้ำ > ไฟ > ลม > น้ำ และ แสง ↔ มืด', async () => {
    const { elementMultiplier, elementMatchup } = await import('@runegate/data');
    expect(elementMatchup('water', 'fire')).toBe('advantage');
    expect(elementMatchup('fire', 'wind')).toBe('advantage');
    expect(elementMatchup('wind', 'water')).toBe('advantage');
    expect(elementMatchup('light', 'dark')).toBe('advantage');
    expect(elementMatchup('dark', 'light')).toBe('advantage');
    expect(elementMatchup('fire', 'water')).toBe('disadvantage');
    expect(elementMatchup('water', 'light')).toBe('neutral');
    expect(elementMultiplier('water', 'fire')).toBeGreaterThan(1);
    expect(elementMultiplier('fire', 'water')).toBeLessThan(1);
    expect(elementMultiplier('water', 'water')).toBe(1);
  });

  it('ได้เปรียบธาตุทำดาเมจมากกว่าเสียเปรียบกับศัตรูตัวเดียวกัน', async () => {
    const { computeDamage } = await import('@runegate/sim');
    const water = unitsFor('militia_swordsman', 'ember_wolf'); // น้ำ ตี ไฟ = ได้เปรียบ
    const fire = unitsFor('wolfkin_striker', 'ember_wolf'); // ไฟ ตี ไฟ = เฉยๆ
    // ปรับ ATK ให้เท่ากันเพื่อวัดเฉพาะผลของธาตุ
    water.hero.base.atk = 100;
    fire.hero.base.atk = 100;
    const adv = computeDamage(water.hero, water.enemy, { ratio: 1, canCrit: false }, rng()).amount;
    const neutral = computeDamage(fire.hero, fire.enemy, { ratio: 1, canCrit: false }, rng()).amount;
    expect(adv).toBeGreaterThan(neutral);
  });

  it('โบนัสเจาะเผ่าจากการ์ดเพิ่มดาเมจเฉพาะเผ่านั้น (§5.3)', async () => {
    const { computeDamage } = await import('@runegate/sim');
    const plain = unitsFor('ranger_bryn', 'restless_shade'); // อันเดด
    const base = computeDamage(plain.hero, plain.enemy, { ratio: 1, canCrit: false }, rng()).amount;
    plain.hero.raceBonus = { undead: 0.25 };
    const boosted = computeDamage(plain.hero, plain.enemy, { ratio: 1, canCrit: false }, rng()).amount;
    expect(boosted).toBeGreaterThan(base);
    expect(boosted / base).toBeCloseTo(1.25, 1);

    plain.hero.raceBonus = { insect: 0.25 }; // คนละเผ่า → ไม่มีผล
    const unrelated = computeDamage(plain.hero, plain.enemy, { ratio: 1, canCrit: false }, rng()).amount;
    expect(unrelated).toBe(base);
  });

  it('DEF หักดาเมจกายภาพ แต่ไม่ต่ำกว่า 5% ของดาเมจดิบ', async () => {
    const { computeDamage } = await import('@runegate/sim');
    const { hero, enemy } = unitsFor('quartermaster_pell', 'ogre_bruiser'); // ATK ต่ำ vs DEF สูงมาก
    const out = computeDamage(hero, enemy, { ratio: 1, canCrit: false }, rng());
    expect(out.amount).toBeGreaterThan(0);
    expect(out.amount).toBeLessThan(hero.base.atk * 0.35);
  });

  it('ดาเมจเวทโดน MRES ไม่ใช่ DEF', async () => {
    const { computeDamage } = await import('@runegate/sim');
    const { hero, enemy } = unitsFor('archmage_ignis', 'ogre_bruiser');
    const magic = computeDamage(hero, enemy, { ratio: 1, canCrit: false, damageType: 'magic' }, rng()).amount;
    const physical = computeDamage(hero, enemy, { ratio: 1, canCrit: false, damageType: 'physical' }, rng()).amount;
    expect(magic).toBeGreaterThan(physical);
  });

  it('true damage ทะลุทุกการป้องกัน', async () => {
    const { computeDamage } = await import('@runegate/sim');
    const { hero, enemy } = unitsFor('nyx_shadowblade', 'ogre_bruiser');
    const t = computeDamage(hero, enemy, { ratio: 1, canCrit: false, damageType: 'true' }, rng()).amount;
    const p = computeDamage(hero, enemy, { ratio: 1, canCrit: false, damageType: 'physical' }, rng()).amount;
    expect(t).toBeGreaterThan(p);
  });
});

describe('ท่าไม้ตายและสกิล', () => {
  it('กด Ultimate ก่อนคูลดาวน์หมดไม่ได้ และเมื่อใช้แล้วสร้างความเสียหายจริง', () => {
    const b = new Battle({ stage: makeStage([wave('ogre_bruiser', 3, 14, 0.5)]), squad: squad(['archmage_ignis']), seed: 12 });
    b.deploy('archmage_ignis', 2, 0);
    const hero = b.deployedHeroes[0]!;
    expect(b.useUltimate(hero.uid).ok).toBe(false);
    advance(b, 16.5);
    const before = b.aliveEnemies.reduce((s, e) => s + e.hp, 0);
    const res = b.useUltimate(hero.uid);
    expect(res.ok).toBe(true);
    const after = b.aliveEnemies.reduce((s, e) => s + e.hp, 0);
    expect(after).toBeLessThan(before);
    expect(b.ultimatesUsed).toBe(1);
  });

  it('หมอผีดำสาปให้ DEF ศัตรูลด (สถานะ def_down)', () => {
    const b = new Battle({ stage: makeStage([wave('carapace_scorpion', 1, 0.1)]), squad: squad(['hexer_morrin']), seed: 13 });
    b.deploy('hexer_morrin', 3, 0);
    advance(b, 6);
    const e = b.aliveEnemies[0];
    expect(e?.statuses.some((s) => s.kind === 'def_down')).toBe(true);
  });

  it('แม่หมอเรียกขวัญฟื้นเลือดพันธมิตรที่บาดเจ็บ', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 3, 0.1, 0.5)]), squad: squad(['militia_swordsman', 'cleric_seraphine']), seed: 14 });
    b.deploy('militia_swordsman', 3, 2);
    b.deploy('cleric_seraphine', 3, 0);
    advance(b, 20);
    const healed = [...b.healedTotal.values()].reduce((a, c) => a + c, 0);
    expect(healed).toBeGreaterThan(0);
  });

  it('พ่อค้าเบี้ยเร่งอัตรางอกแต้มวาง', () => {
    const stage = makeStage([wave('restless_shade', 1, 300)], {
      deploy: { initialCost: 20, costPerSec: 1, deployLimit: 6, retreatRefund: 0.5 },
    });
    const withMerchant = new Battle({ stage, squad: squad(['quartermaster_pell']), seed: 15 });
    withMerchant.deploy('quartermaster_pell', 3, 0);
    const plain = new Battle({ stage, squad: squad(['quartermaster_pell']), seed: 15 });

    const a0 = withMerchant.cost;
    const b0 = plain.cost;
    advance(withMerchant, 10);
    advance(plain, 10);
    const growthWith = withMerchant.cost - a0;
    const growthPlain = plain.cost - b0;
    expect(growthWith).toBeGreaterThan(growthPlain * 1.25);
  });
});

describe('การจบด่าน', () => {
  it('ศัตรูหลุดเข้าฐานทำให้เลือดฐานลด และแพ้เมื่อหมด', () => {
    const stage = makeStage([wave('ghoul', 20, 0.5, 0.3)], { baseHp: 3 });
    const b = new Battle({ stage, squad: squad(['militia_swordsman']), seed: 16 });
    runHeadless(b);
    expect(b.status).toBe('lost');
    expect(b.baseHp).toBe(0);
    expect(b.leaks).toBeGreaterThanOrEqual(3);
    expect(b.result().stars).toBe(0);
  });

  it('ชนะเมื่อเคลียร์ทุกเวฟ และให้ 3 ดาวเมื่อไม่มีศัตรูหลุด', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 3, 1, 1)]), squad: squad(['warden_kael', 'sylvane_archer'], 30), seed: 17 });
    b.deploy('warden_kael', 3, 2);
    b.deploy('sylvane_archer', 3, 0);
    runHeadless(b);
    const r = b.result();
    expect(r.win).toBe(true);
    expect(r.leaks).toBe(0);
    expect(r.stars).toBe(3);
    expect(r.enemiesKilled).toBe(3);
  });

  it('ดาว 2 เมื่อเลือดฐานเหลือ ≥80% แต่มีศัตรูหลุด', () => {
    const stage = makeStage([wave('restless_shade', 2, 1, 1)], { baseHp: 20 });
    const b = new Battle({ stage, squad: squad(['sylvane_archer'], 1), seed: 18 });
    runHeadless(b);
    const r = b.result();
    expect(r.leaks).toBeGreaterThan(0);
    if (r.win) expect(r.stars).toBe(2);
  });
});

describe('Determinism (§13.2 ข้อ 2)', () => {
  function play(seed: number): string {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 5, 1, 0.8), wave('ghoul', 6, 10, 0.4)]), squad: squad(['warden_kael', 'sylvane_archer', 'archmage_ignis']), seed });
    b.deploy('warden_kael', 3, 2);
    b.deploy('sylvane_archer', 3, 0);
    b.deploy('archmage_ignis', 4, 4);
    let ultUsed = false;
    while (b.status === 'running') {
      if (!ultUsed && b.elapsedSec > 12) {
        const h = b.deployedHeroes.find((x) => x.heroId === 'archmage_ignis');
        if (h && h.ultCd <= 0) {
          b.useUltimate(h.uid);
          ultUsed = true;
        }
      }
      b.step();
    }
    const r = b.result();
    return JSON.stringify({ ...r, heroes: r.heroes.map((h) => `${h.heroId}:${h.damageDealt}:${h.kills}`) });
  }

  it('seed เดิม + คำสั่งเดิม = ผลลัพธ์เดิมเป๊ะ', () => {
    expect(play(4242)).toBe(play(4242));
    expect(play(999)).toBe(play(999));
  });

  it('seed ต่างกันให้ผลต่างกัน (RNG ทำงานจริง)', () => {
    const results = new Set([play(1), play(2), play(3), play(4), play(5)]);
    expect(results.size).toBeGreaterThan(1);
  });

  it('Rng ให้ลำดับเดิมทุกครั้งและกระจายตัวสม่ำเสมอ', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
    const r = new Rng(7);
    let sum = 0;
    const N = 200_000;
    for (let i = 0; i < N; i++) sum += r.next();
    expect(sum / N).toBeGreaterThan(0.49);
    expect(sum / N).toBeLessThan(0.51);
  });
});

describe('ความทนทานของ sim', () => {
  it('รันด่านจริงทุกด่าน × หลาย seed โดยไม่พังและไม่มีค่า NaN', async () => {
    const { stages } = await import('@runegate/data');
    const { AutoPlayer } = await import('@runegate/sim');
    let runs = 0;
    for (const stage of stages) {
      for (let seed = 0; seed < 40; seed++) {
        const b = new Battle({
          stage,
          squad: squad(['warden_kael', 'forgemaster_durn', 'militia_swordsman', 'sylvane_archer', 'archmage_ignis', 'cleric_seraphine', 'hexer_morrin', 'quartermaster_pell'], 15),
          seed: seed * 31 + 5,
          recordEvents: false,
        });
        runHeadless(b, new AutoPlayer(b));
        const r = b.result();
        runs++;
        expect(Number.isFinite(r.baseHp)).toBe(true);
        expect(Number.isFinite(r.elapsedSec)).toBe(true);
        expect(r.status === 'won' || r.status === 'lost').toBe(true);
        expect(r.enemiesKilled).toBeLessThanOrEqual(r.enemiesTotal);
        for (const h of r.heroes) expect(Number.isFinite(h.damageDealt)).toBe(true);
      }
    }
    expect(runs).toBe(stages.length * 40);
  });

  it('หน่วยที่ตายแล้วถูกลบออกจากสนามและเลือดไม่ติดลบค้าง', () => {
    const b = new Battle({ stage: makeStage([wave('ghoul', 8, 0.5, 0.3)]), squad: squad(['archmage_ignis', 'warden_kael'], 30), seed: 21 });
    b.deploy('warden_kael', 3, 2);
    b.deploy('archmage_ignis', 3, 0);
    runHeadless(b);
    for (const u of b.units) {
      expect(u.alive).toBe(true);
      expect(u.hp).toBeGreaterThan(0);
    }
  });
});

describe('ข้อมูลศัตรู/ฮีโร่ที่ใช้ในเทสต์', () => {
  it('มีศัตรูครบทุก archetype ที่เทสต์อ้างถึง', () => {
    expect(getEnemy('wraith').traits).toContain('flying');
    expect(getEnemy('shadow_stalker').traits).toContain('stealth');
    expect(getEnemy('cult_acolyte').traits).toContain('healer');
    expect(getEnemy('carapace_scorpion').traits).toContain('armored');
  });

  it('unit type guard ทำงานถูก', () => {
    const b = new Battle({ stage: makeStage([wave('restless_shade', 1, 0.1)]), squad: squad(['militia_swordsman']), seed: 22 });
    b.deploy('militia_swordsman', 3, 2);
    advance(b, 1);
    const hero = b.units.find(isHero) as HeroUnit;
    const enemy = b.units.find(isEnemy) as EnemyUnit;
    expect(hero.faction).toBe('hero');
    expect(enemy.faction).toBe('enemy');
  });
});
