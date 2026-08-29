import { describe, expect, it } from 'vitest';
import { getTurret, getWeapon, Stage, TICKS_PER_SEC, turrets, weapons } from '@runegate/data';
import { Battle, isTurret } from '@runegate/sim';

/** สนามทดสอบ: ทางเดินตรงยาว มีแท่นเครื่องยิง T อยู่แถวบน */
function turretStage(enemy = 'skeleton_soldier', count = 8, initialCost = 99) {
  return Stage.parse({
    id: 'turret_test',
    name_th: 'สนามทดสอบเครื่องยิง',
    chapter: 1,
    index: 1,
    grid: { w: 12, h: 5 },
    tiles: ['............', 'TTTTTTTTTTTT', 'SRRRRRRRRRRE', 'GGGGGGGGGGGG', 'HHHHHHHHHHHH'],
    paths: { main: [[0, 2], [11, 2]] },
    baseHp: 99,
    deploy: { initialCost, costPerSec: 3, deployLimit: 8, retreatRefund: 0.5 },
    waves: [
      {
        id: 'w1',
        startSec: 1,
        label_th: 'ทดสอบ',
        groups: [{ enemy, count, intervalSec: 1, delaySec: 0, path: 'main', hpMult: 1, atkMult: 1 }],
      },
    ],
    stars: { two: { type: 'base_hp_pct', value: 80 }, three: { type: 'no_leak' } },
    rewards: { gold: 1, exp: 1 },
  });
}

function advance(b: Battle, seconds: number): void {
  const n = Math.round(seconds * TICKS_PER_SEC);
  for (let i = 0; i < n && b.status === 'running'; i++) b.step();
}

describe('เครื่องยิง: สร้าง / อัพเกรด / รื้อ', () => {
  it('สร้างได้เฉพาะบนแท่น T และหักแต้มวางตามราคา', () => {
    const b = new Battle({ stage: turretStage(), squad: [], seed: 1 });
    expect(b.build('rock_thrower', 5, 2).reason_th).toContain('แท่นเครื่องยิง');
    expect(b.build('rock_thrower', 5, 4).reason_th).toContain('แท่นเครื่องยิง');
    const before = b.cost;
    expect(b.build('rock_thrower', 5, 1).ok).toBe(true);
    expect(b.cost).toBeCloseTo(before - getTurret('rock_thrower').cost, 5);
    expect(b.turretAt(5, 1)).toBeDefined();
  });

  it('แท่นเดียวสร้างซ้ำไม่ได้ และแต้มไม่พอก็สร้างไม่ได้', () => {
    const b = new Battle({ stage: turretStage('skeleton_soldier', 8, 14), squad: [], seed: 1 });
    expect(b.build('rock_thrower', 3, 1).ok).toBe(true);
    expect(b.build('rock_thrower', 3, 1).reason_th).toContain('มีเครื่องยิงอยู่แล้ว');
    expect(b.build('rock_thrower', 6, 1).reason_th).toContain('แต้มวางไม่พอ');
  });

  it('อัพเกรดได้เฉพาะสายที่กำหนดไว้ และคงอยู่ที่แท่นเดิม', () => {
    const b = new Battle({ stage: turretStage(), squad: [], seed: 2 });
    b.build('rock_thrower', 4, 1);
    const uid = b.turretAt(4, 1)!.uid;
    expect(b.upgrade(uid, 'hellfire').reason_th).toContain('อัพเกรดเป็นแบบนี้ไม่ได้');
    expect(b.upgrade(uid, 'mortar').ok).toBe(true);
    const after = b.turretAt(4, 1);
    expect(after).toBeDefined();
    expect(after!.heroId).toBe('mortar');
    expect(after!.tier).toBe(2);
    expect(after!.investedCost).toBe(getTurret('rock_thrower').cost + getTurret('mortar').cost);
  });

  it('รื้อแล้วคืนแต้มครึ่งหนึ่งของทุนที่ลงไป', () => {
    const b = new Battle({ stage: turretStage(), squad: [], seed: 3 });
    b.build('rock_thrower', 4, 1);
    const t = b.turretAt(4, 1)!;
    const invested = t.investedCost;
    const before = b.cost;
    expect(b.sell(t.uid).ok).toBe(true);
    expect(b.cost).toBeCloseTo(before + Math.floor(invested * 0.5), 5);
    expect(b.turretAt(4, 1)).toBeUndefined();
  });

  it('เครื่องยิงไม่กินโควตาช่องวางฮีโร่', () => {
    const base = turretStage();
    const stage = Stage.parse({
      ...JSON.parse(JSON.stringify(base)),
      deploy: { initialCost: 99, costPerSec: 3, deployLimit: 1, retreatRefund: 0.5 },
    });
    const b = new Battle({ stage, squad: [{ heroId: 'militia_swordsman', level: 10 }], seed: 4 });
    expect(b.deploy('militia_swordsman', 3, 2).ok).toBe(true);
    expect(b.build('rock_thrower', 3, 1).ok).toBe(true);
    expect(b.build('rock_thrower', 5, 1).ok).toBe(true);
    expect(b.deployedRealHeroes.length).toBe(1);
    expect(b.deployedHeroes.filter(isTurret).length).toBe(2);
  });
});

describe('รูปแบบการยิง', () => {
  it('อาวุธกระจายปล่อยกระสุนพร้อมกันหลายนัด', () => {
    const b = new Battle({ stage: turretStage(), squad: [], seed: 5 });
    b.build('rock_thrower', 4, 1);
    b.upgrade(b.turretAt(4, 1)!.uid, 'scattergun');
    let maxShots = 0;
    advance(b, 1);
    for (let i = 0; i < 12 * TICKS_PER_SEC && b.status === 'running'; i++) {
      b.step();
      maxShots = Math.max(maxShots, b.projectiles.length);
    }
    expect(getWeapon('w_scatter3').shots).toBe(3);
    expect(maxShots).toBeGreaterThanOrEqual(3);
  });

  it('อาวุธยิงรัวทยอยปล่อยกระสุนทีละนัด ไม่ออกพร้อมกันหมด', () => {
    const w = getWeapon('w_repeater');
    expect(w.burstIntervalSec).toBeGreaterThan(0);
    const b = new Battle({ stage: turretStage(), squad: [], seed: 6 });
    b.build('rock_thrower', 4, 1);
    b.upgrade(b.turretAt(4, 1)!.uid, 'repeater');
    advance(b, 4);
    let sawPartialBurst = false;
    for (let i = 0; i < 8 * TICKS_PER_SEC && b.status === 'running'; i++) {
      b.step();
      const n = b.projectiles.length;
      if (n > 0 && n < w.shots) sawPartialBurst = true;
    }
    expect(sawPartialBurst).toBe(true);
  });

  it('ลำแสงทะลุโดนศัตรูได้หลายตัวจากกระสุนนัดเดียว', () => {
    const b = new Battle({ stage: turretStage('ghoul', 10), squad: [], seed: 7 });
    b.build('rock_thrower', 6, 1);
    b.upgrade(b.turretAt(6, 1)!.uid, 'repeater');
    b.upgrade(b.turretAt(6, 1)!.uid, 'lance');
    expect(getWeapon('w_lance').pierce).toBeGreaterThan(0);
    let maxHitsInOneShot = 0;
    advance(b, 2);
    for (let i = 0; i < 18 * TICKS_PER_SEC && b.status === 'running'; i++) {
      b.step();
      for (const p of b.projectiles) maxHitsInOneShot = Math.max(maxHitsInOneShot, p.hit.length);
    }
    expect(maxHitsInOneShot).toBeGreaterThan(1);
  });

  it('ระเบิดวิถีโค้งสร้างความเสียหายและฆ่าศัตรูได้', () => {
    const b = new Battle({ stage: turretStage('ghoul', 12), squad: [], seed: 8 });
    b.build('rock_thrower', 6, 1);
    b.upgrade(b.turretAt(6, 1)!.uid, 'mortar');
    advance(b, 26);
    const dealt = b.result().heroes.reduce((sum, h) => sum + h.damageDealt, 0);
    expect(dealt).toBeGreaterThan(0);
    expect(b.enemiesKilled).toBeGreaterThan(0);
  });

  it('เครื่องยิงทุกแบบยิงโดนและสร้างความเสียหายได้จริง', () => {
    for (const t of turrets) {
      const b = new Battle({ stage: turretStage('skeleton_soldier', 8), squad: [], seed: 9, recordEvents: false });
      b.build('rock_thrower', 5, 1);
      const chain = (id: string, from = 'rock_thrower', acc: string[] = []): string[] | null => {
        if (from === id) return acc;
        for (const next of getTurret(from).upgradesTo) {
          const found = chain(id, next, [...acc, next]);
          if (found) return found;
        }
        return null;
      };
      for (const step of chain(t.id) ?? []) {
        const cur = b.turretAt(5, 1)!;
        expect(b.upgrade(cur.uid, step).ok, `${t.id} ← ${step}`).toBe(true);
      }
      advance(b, 26);
      const dealt = b.result().heroes.reduce((sum, h) => sum + h.damageDealt, 0);
      expect(dealt, `${t.name_th} ไม่สร้างความเสียหายเลย`).toBeGreaterThan(0);
    }
  });
});

describe('ข้อมูลเครื่องยิงและอาวุธ', () => {
  it('มีเครื่องยิงครบ 3 ขั้น และสายอัพเกรดชี้ไปยังตัวที่มีจริง', () => {
    expect(turrets.filter((t) => t.tier === 1).length).toBeGreaterThan(0);
    expect(turrets.filter((t) => t.tier === 2).length).toBeGreaterThan(0);
    expect(turrets.filter((t) => t.tier === 3).length).toBeGreaterThan(0);
    for (const t of turrets) {
      for (const next of t.upgradesTo) {
        const target = turrets.find((x) => x.id === next);
        expect(target, `${t.id} → ${next}`).toBeDefined();
        expect(target!.tier).toBe(t.tier + 1);
        expect(target!.cost).toBeGreaterThan(t.cost);
      }
      if (t.tier === 3) expect(t.upgradesTo.length).toBe(0);
      expect(weapons.find((w) => w.id === t.weapon), `${t.id} อาวุธ`).toBeDefined();
    }
  });

  it('ครอบคลุมรูปแบบการยิงครบทุกแบบ', () => {
    expect(weapons.some((w) => w.lob && w.aoeRadius > 0)).toBe(true);
    expect(weapons.some((w) => w.burstIntervalSec > 0 && w.shots > 1)).toBe(true);
    expect(weapons.some((w) => w.spreadDeg > 0 && w.shots >= 3)).toBe(true);
    expect(weapons.some((w) => w.pierce >= 3)).toBe(true);
    expect(weapons.some((w) => w.homingTurnRate > 0)).toBe(true);
    expect(weapons.some((w) => w.splitOnHit)).toBe(true);
  });
});
