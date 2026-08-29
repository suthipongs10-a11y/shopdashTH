import { getHero, TICKS_PER_SEC } from '@runegate/data';
import type { Battle } from './battle.js';
import { dist2, tileOf } from './path.js';
import { effRange } from './stats.js';
import { isEnemy, isHero, isTurret, type HeroUnit } from './types.js';

interface Slot {
  x: number;
  y: number;
  score: number;
  path: string;
  order: number;
}

/**
 * ผู้เล่นอัตโนมัติแบบฮิวริสติก — ใช้รันจำลอง balance 1,000 ด่าน (§13.2 ข้อ 2)
 * ไม่ได้เก่งเท่าคน แต่ "เล่นเป็น": บล็อคที่จุดที่ ranged คุ้ม แล้วเปิดท่าไม้ตายตอนศัตรูกระจุก
 */
/** สายอัพเกรดที่ AI จะไล่ตาม — สลับกันเพื่อให้ทดสอบอาวุธหลายแบบ */
const UPGRADE_CHAINS: string[][] = [
  ['mortar', 'hellfire'],
  ['repeater', 'autocannon'],
  ['scattergun', 'fivefold'],
  ['mortar', 'cluster'],
  ['repeater', 'lance'],
  ['scattergun', 'flamewheel'],
];

export class AutoPlayer {
  private plan: { heroId: string; x: number; y: number }[] = [];
  private planIndex = 0;
  /** แบ่งงบระหว่างสองระบบ — ผู้เล่นจริงก็ต้องเลือกเหมือนกันว่าจะลงฮีโร่หรือตั้งเครื่องยิง */
  private spentHeroes = 0;
  private spentTurrets = 0;
  private static readonly TURRET_BUDGET_SHARE = 0.5;
  /** แท่นเครื่องยิงที่เลือกไว้ พร้อมสายอัพเกรดของแต่ละแท่น */
  private pads: { x: number; y: number; chain: string[]; step: number }[] = [];

  constructor(private readonly battle: Battle) {
    this.buildPlan();
    this.buildTurretPlan();
  }

  /** เลือกแท่นที่คุ้มที่สุด: นับช่องทางเดินที่อยู่ในระยะยิง */
  private buildTurretPlan(): void {
    const stage = this.battle.stage;
    const road: [number, number][] = [];
    for (const tiles of this.pathTiles().values()) road.push(...tiles);

    const scored: { x: number; y: number; score: number }[] = [];
    for (let y = 0; y < stage.grid.h; y++) {
      for (let x = 0; x < stage.grid.w; x++) {
        if (tileOf(stage, x, y) !== 'T') continue;
        let covered = 0;
        for (const [px, py] of road) {
          if (dist2(x + 0.5, y + 0.5, px + 0.5, py + 0.5) <= 4 * 4) covered++;
        }
        scored.push({ x, y, score: covered });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.x - b.x || a.y - b.y);
    // เว้นระยะกันไม่ให้กระจุกอยู่จุดเดียว
    const picked: { x: number; y: number }[] = [];
    for (const p of scored) {
      if (picked.length >= 6) break;
      if (picked.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < 3)) continue;
      picked.push({ x: p.x, y: p.y });
    }
    this.pads = picked.map((p, i) => ({ ...p, chain: UPGRADE_CHAINS[i % UPGRADE_CHAINS.length]!, step: 0 }));
  }

  private pathTiles(): Map<string, [number, number][]> {
    const out = new Map<string, [number, number][]>();
    for (const [name, track] of this.battle.paths) {
      const seen = new Set<string>();
      const tiles: [number, number][] = [];
      for (let d = 0; d <= track.length; d += 0.25) {
        const p = track.at(d);
        const key = `${Math.floor(p.x)},${Math.floor(p.y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tiles.push([Math.floor(p.x), Math.floor(p.y)]);
      }
      out.set(name, tiles);
    }
    return out;
  }

  private buildPlan(): void {
    const stage = this.battle.stage;
    const byPath = this.pathTiles();
    const allPathTiles: [number, number][] = [];
    for (const tiles of byPath.values()) allPathTiles.push(...tiles);

    const highTiles: Slot[] = [];
    for (let y = 0; y < stage.grid.h; y++) {
      for (let x = 0; x < stage.grid.w; x++) {
        if (tileOf(stage, x, y) !== 'H') continue;
        let covered = 0;
        for (const [px, py] of allPathTiles) {
          if (dist2(x + 0.5, y + 0.5, px + 0.5, py + 0.5) <= 3.3 * 3.3) covered++;
        }
        highTiles.push({ x, y, score: covered, path: '', order: 0 });
      }
    }
    highTiles.sort((a, b) => b.score - a.score);

    // ช่องบล็อค: เลือกช่องทางเดินที่มีที่สูงคุ้มเยอะ และอยู่ต้นทางไว้ก่อน
    const meleeSlots: Slot[] = [];
    for (const [name, tiles] of byPath) {
      tiles.forEach(([x, y], order) => {
        const t = tileOf(stage, x, y);
        if (t !== 'R') return;
        let high = 0;
        for (const h of highTiles) {
          if (dist2(x + 0.5, y + 0.5, h.x + 0.5, h.y + 0.5) <= 3.3 * 3.3) high++;
        }
        const rel = order / Math.max(1, tiles.length - 1);
        meleeSlots.push({ x, y, score: high * 10 - Math.abs(rel - 0.55) * 20, path: name, order });
      });
    }
    meleeSlots.sort((a, b) => b.score - a.score);

    const squad = this.battle.squad.map((s) => getHero(s.heroId));
    const melee = squad.filter((h) => h.pos === 'melee' && h.blockCount > 0).sort((a, b) => b.rarity - a.rarity);
    const ranged = squad.filter((h) => h.pos === 'ranged').sort((a, b) => b.rarity - a.rarity);
    const meleeNoBlock = squad.filter((h) => h.pos === 'melee' && h.blockCount === 0);

    const usedTiles = new Set<string>();
    const takeSlot = (slots: Slot[], preferPath?: string): Slot | undefined => {
      const idx = slots.findIndex(
        (s) => !usedTiles.has(`${s.x},${s.y}`) && (!preferPath || s.path === preferPath) &&
          ![...usedTiles].some((k) => {
            const [ux, uy] = k.split(',').map(Number);
            return dist2(s.x, s.y, ux!, uy!) < 1.2;
          }),
      );
      const chosen = idx >= 0 ? slots[idx] : slots.find((s) => !usedTiles.has(`${s.x},${s.y}`));
      if (chosen) usedTiles.add(`${chosen.x},${chosen.y}`);
      return chosen;
    };

    // สลับเลนให้ทั่วเมื่อด่านมีหลายเส้นทาง
    const pathNames = [...byPath.keys()];
    melee.forEach((h, i) => {
      const slot = takeSlot(meleeSlots, pathNames[i % pathNames.length]);
      if (slot) this.plan.push({ heroId: h.id, x: slot.x, y: slot.y });
    });
    ranged.forEach((h) => {
      const slot = takeSlot(highTiles);
      if (slot) this.plan.push({ heroId: h.id, x: slot.x, y: slot.y });
    });
    meleeNoBlock.forEach((h) => {
      const slot = takeSlot(meleeSlots);
      if (slot) this.plan.push({ heroId: h.id, x: slot.x, y: slot.y });
    });

    // เรียงใหม่: บล็อคเกอร์ตัวแรก → ranged → ที่เหลือ (ตามลำดับที่วางแผนไว้แล้ว)
    this.plan = interleave(this.plan, melee.length);
  }

  /** เรียกทุก tick */
  update(): void {
    const b = this.battle;
    if (b.tick % 10 !== 0) return;

    while (this.planIndex < this.plan.length) {
      const next = this.plan[this.planIndex]!;
      const check = b.canDeploy(next.heroId, next.x, next.y);
      if (!check.ok) break;
      b.deploy(next.heroId, next.x, next.y, 0);
      this.spentHeroes += b.costOf(next.heroId);
      this.planIndex++;
    }

    // เครื่องยิงใช้ได้ไม่เกินครึ่งของแต้มที่ใช้ไปทั้งหมด ที่เหลือสงวนให้ฮีโร่
    // (ถ้าไม่กั้น เครื่องยิงราคาถูกจะดูดแต้มจนไม่มีใครบล็อค และเลเวลฮีโร่จะไม่มีผลต่อผลแพ้ชนะเลย)
    const withinBudget = (spend: number): boolean => {
      const total = this.spentHeroes + this.spentTurrets + spend;
      return this.spentTurrets + spend <= total * AutoPlayer.TURRET_BUDGET_SHARE;
    };

    for (const pad of this.pads) {
      if (b.turretAt(pad.x, pad.y)) continue;
      const price = b.turretCostOf('rock_thrower');
      if (!withinBudget(price)) break;
      if (!b.canBuild('rock_thrower', pad.x, pad.y).ok) break;
      b.build('rock_thrower', pad.x, pad.y);
      this.spentTurrets += price;
    }
    for (const pad of this.pads) {
      const turret = b.turretAt(pad.x, pad.y);
      if (!turret || pad.step >= pad.chain.length) continue;
      const nextId = pad.chain[pad.step]!;
      const current = turret.def as { upgradesTo?: string[] };
      if (!current.upgradesTo?.includes(nextId)) continue;
      const price = b.turretCostOf(nextId);
      if (!withinBudget(price)) continue;
      if (!b.canUpgrade(turret.uid, nextId).ok) continue;
      b.upgrade(turret.uid, nextId);
      this.spentTurrets += price;
      pad.step++;
    }

    if (b.tick % TICKS_PER_SEC !== 0) return;
    for (const u of b.units) {
      if (!isHero(u) || isTurret(u) || !u.alive || !u.hasUlt || u.ultCd > 0) continue;
      if (this.worthUlting(u)) b.useUltimate(u.uid);
    }
  }

  private worthUlting(u: HeroUnit): boolean {
    const r2 = Math.max(effRange(u), 2.5) ** 2;
    let count = 0;
    let elite = false;
    for (const e of this.battle.units) {
      if (!isEnemy(e) || !e.alive) continue;
      if (dist2(u.x, u.y, e.x, e.y) > r2) continue;
      count++;
      if (e.traits.includes('elite') || e.traits.includes('boss')) elite = true;
    }
    if (u.hp / u.maxHp < 0.5 && count > 0) return true;
    return elite || count >= 3;
  }
}

function interleave<T>(items: T[], firstGroupSize: number): T[] {
  const a = items.slice(0, firstGroupSize);
  const b = items.slice(firstGroupSize);
  const out: T[] = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

/** รันด่านจนจบแบบ headless */
export function runHeadless(battle: Battle, policy?: { update(): void }): void {
  while (battle.status === 'running') {
    policy?.update();
    battle.step();
  }
}
