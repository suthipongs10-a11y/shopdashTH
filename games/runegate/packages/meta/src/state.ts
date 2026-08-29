/** สร้าง/อ่าน/เขียนสถานะผู้เล่น — โครงเดียวกับที่ Phase 5 จะเก็บฝั่ง server */
import { getHero, progression } from '@runegate/data';

import { newHeroState, TEAM_SIZE } from './hero-progress.js';
import type { HeroState, PlayerState } from './types.js';

export const SAVE_VERSION = 1;

export function createInitialState(): PlayerState {
  const s = progression.starter;
  const roster: Record<string, HeroState> = {};
  for (const id of s.heroes) roster[id] = newHeroState(getHero(id));
  return {
    version: SAVE_VERSION,
    gold: s.gold,
    gems: s.gems,
    roster,
    team: s.heroes.slice(0, TEAM_SIZE),
    materials: { ...s.materials },
    stars: {},
    firstCleared: [],
  };
}

/**
 * อ่านเซฟที่อาจมาจากเวอร์ชันเก่า/พัง — ซ่อมทีละฟิลด์แทนการทิ้งทั้งก้อน
 * (ผู้เล่นเสียของเพราะเราเปลี่ยนโครงข้อมูลไม่ได้)
 */
export function migrateState(raw: unknown): PlayerState {
  const base = createInitialState();
  if (typeof raw !== 'object' || raw === null) return base;
  const o = raw as Partial<PlayerState>;

  const roster: Record<string, HeroState> = {};
  for (const [id, hs] of Object.entries(o.roster ?? {})) {
    let hero;
    try {
      hero = getHero(id);
    } catch {
      continue; // ฮีโร่ถูกถอดออกจากคอนเทนต์ไปแล้ว
    }
    const fresh = newHeroState(hero);
    const skillLevels: Record<string, number> = { ...fresh.skillLevels };
    for (const [sid, lv] of Object.entries(hs?.skillLevels ?? {})) {
      if (sid in skillLevels) skillLevels[sid] = clampInt(lv, 1, progression.skill.maxLevel);
    }
    const star = clampInt(hs?.star ?? fresh.star, fresh.star, progression.star.maxStar);
    roster[id] = {
      id,
      star,
      level: clampInt(hs?.level ?? 1, 1, 99),
      exp: Math.max(0, Math.floor(hs?.exp ?? 0)),
      awakened: Boolean(hs?.awakened) && star >= progression.awaken.minStar,
      skillLevels,
    };
  }
  if (Object.keys(roster).length === 0) return base;

  const materials: Record<string, number> = {};
  for (const [item, n] of Object.entries(o.materials ?? {})) {
    const v = Math.floor(Number(n));
    if (Number.isFinite(v) && v > 0) materials[item] = v;
  }

  const stars: Record<string, number> = {};
  for (const [stageId, n] of Object.entries(o.stars ?? {})) {
    stars[stageId] = clampInt(n, 0, 3);
  }

  return {
    version: SAVE_VERSION,
    gold: Math.max(0, Math.floor(Number(o.gold ?? base.gold))),
    gems: Math.max(0, Math.floor(Number(o.gems ?? base.gems))),
    roster,
    team: (o.team ?? []).filter((id) => roster[id]).slice(0, TEAM_SIZE),
    materials,
    stars,
    firstCleared: (o.firstCleared ?? []).filter((id) => typeof id === 'string'),
  };
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
