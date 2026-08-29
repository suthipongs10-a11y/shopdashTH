/**
 * รางวัลหลังจบด่าน — แปลงผลการต่อสู้ + ตารางดรอป เป็น state ใหม่
 * การสุ่มทั้งหมดผ่าน `RandomSource` ที่มี seed (§8 ข้อ 2) เพื่อให้ server ตรวจซ้ำได้ใน Phase 5
 */
import { dropTableById, elementsOf, getHero, type DropTable, type Element, type Stage } from '@runegate/data';

import { addItems, essenceItem, ITEM, shardItem } from './items.js';
import { grantExp } from './hero-progress.js';
import type { PlayerState, RandomSource } from './types.js';

/** ผลของด่านเท่าที่ชั้นรางวัลต้องรู้ (โครงย่อยของ `BattleResult` ใน sim) */
export interface BattleOutcome {
  win: boolean;
  stars: number;
  goldEarned: number;
  expEarned: number;
  heroes: { heroId: string }[];
}

export interface RewardSummary {
  gold: number;
  gems: number;
  exp: number;
  /** EXP ที่ฮีโร่แต่ละตัวได้รับ */
  heroExp: Record<string, number>;
  items: Record<string, number>;
  firstClear: boolean;
  starsBefore: number;
  starsAfter: number;
}

/**
 * ไอเทม "เสมือน" ที่ตารางดรอปจ่ายออกมาแล้วค่อยแปลงเป็นของจริงตอนรับ
 * (ดู DECISIONS.md — ทำให้ตารางดรอปไม่ต้องแตกเป็นรายฮีโร่/รายธาตุ)
 */
export const VIRTUAL_SHARD = 'hero_shard_random';
export const VIRTUAL_ESSENCE = 'essence_random';

/** หมุนตารางดรอป 1 ชุด → {item: จำนวน} (ยังไม่แปลงไอเทมเสมือน) */
export function rollDropTable(table: DropTable, rng: RandomSource): Record<string, number> {
  const out: Record<string, number> = {};
  const total = table.entries.reduce((a, e) => a + e.weight, 0);
  if (total <= 0) return out;
  for (let r = 0; r < table.rolls; r++) {
    let pick = rng.next() * total;
    for (const e of table.entries) {
      pick -= e.weight;
      if (pick > 0) continue;
      const n = e.min + Math.floor(rng.next() * (e.max - e.min + 1));
      if (n > 0) out[e.item] = (out[e.item] ?? 0) + n;
      break;
    }
  }
  return out;
}

/** แปลงไอเทมเสมือนเป็นของจริงโดยอิงฮีโร่ในทีม (ได้ของที่ใช้ได้จริงเสมอ) */
function resolveVirtual(
  items: Record<string, number>,
  state: PlayerState,
  rng: RandomSource,
): Record<string, number> {
  const pool = (state.team.length > 0 ? state.team : Object.keys(state.roster)).filter((id) => state.roster[id]);
  const out: Record<string, number> = {};
  for (const [item, n] of Object.entries(items)) {
    if (item !== VIRTUAL_SHARD && item !== VIRTUAL_ESSENCE) {
      out[item] = (out[item] ?? 0) + n;
      continue;
    }
    for (let i = 0; i < n; i++) {
      const heroId = pool.length > 0 ? pool[Math.floor(rng.next() * pool.length)]! : undefined;
      const real =
        item === VIRTUAL_SHARD
          ? heroId
            ? shardItem(heroId)
            : undefined
          : essenceItem(heroId ? getHero(heroId).element : pickElement(rng));
      if (!real) continue;
      out[real] = (out[real] ?? 0) + 1;
    }
  }
  return out;
}

function pickElement(rng: RandomSource): Element {
  const all = elementsOf();
  return all[Math.floor(rng.next() * all.length)]!;
}

/**
 * รับรางวัลจากด่าน — คืน state ใหม่ + สรุปสิ่งที่ได้ (ไว้โชว์หน้าสรุปผล)
 * แพ้ก็ยังได้ทอง/EXP ที่เก็บได้ระหว่างด่าน แต่ไม่ได้ดรอปและไม่ได้เพชร first clear
 */
export function applyBattleRewards(
  state: PlayerState,
  stage: Stage,
  outcome: BattleOutcome,
  rng: RandomSource,
): { state: PlayerState; summary: RewardSummary } {
  const starsBefore = state.stars[stage.id] ?? 0;
  const firstClear = outcome.win && !state.firstCleared.includes(stage.id);

  let next = state;
  const summary: RewardSummary = {
    gold: outcome.goldEarned,
    gems: 0,
    exp: outcome.expEarned,
    heroExp: {},
    items: {},
    firstClear,
    starsBefore,
    starsAfter: Math.max(starsBefore, outcome.win ? outcome.stars : starsBefore),
  };

  // แบ่ง EXP ให้ฮีโร่ที่ได้ลงสนามจริง (ไม่ได้ลง = ไม่ได้ EXP)
  const used = [...new Set(outcome.heroes.map((h) => h.heroId))].filter((id) => next.roster[id]);
  const share = used.length > 0 ? Math.floor(outcome.expEarned / used.length) : 0;
  for (const id of used) {
    summary.heroExp[id] = share;
    next = grantExp(next, id, share);
  }

  let items: Record<string, number> = {};
  if (outcome.win && stage.rewards.dropTable) {
    const table = dropTableById.get(stage.rewards.dropTable);
    if (table) items = rollDropTable(table, rng);
  }
  items = resolveVirtual(items, next, rng);

  // ทองในตารางดรอปเข้ากระเป๋า ไม่ใช่ถุงไอเทม
  const goldFromDrops = items[ITEM.goldPile] ?? 0;
  delete items[ITEM.goldPile];
  summary.gold += goldFromDrops;
  summary.items = items;
  if (firstClear) summary.gems = stage.rewards.firstClearGems;

  next = {
    ...next,
    gold: next.gold + summary.gold,
    gems: next.gems + summary.gems,
    materials: addItems(next.materials, items),
    stars: outcome.win
      ? { ...next.stars, [stage.id]: Math.max(starsBefore, outcome.stars) }
      : next.stars,
    firstCleared: firstClear ? [...next.firstCleared, stage.id] : next.firstCleared,
  };
  return { state: next, summary };
}
