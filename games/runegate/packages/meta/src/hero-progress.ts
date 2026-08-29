/**
 * การเติบโตของฮีโร่นอกด่าน — ทุกฟังก์ชันบริสุทธิ์: รับ state คืน state ใหม่ ไม่แก้ของเดิม
 * ค่าตัวเลขทั้งหมดมาจาก `content/progression.json` (§0 ข้อ 8)
 */
import {
  getHero,
  maxLevelForStar,
  naturalStar,
  expToNextLevel,
  goldToNextLevel,
  progression,
  type Hero,
} from '@runegate/data';

import { addItems, countOf, essenceItem, ITEM, shardItem, spendItems } from './items.js';
import type { Cost, HeroState, MetaResult, PlayerState } from './types.js';

export const TEAM_SIZE = 8;

const cfg = progression;

/* ---------------- อ่านสถานะ ---------------- */

export function heroState(state: PlayerState, heroId: string): HeroState | undefined {
  return state.roster[heroId];
}

export function owns(state: PlayerState, heroId: string): boolean {
  return state.roster[heroId] !== undefined;
}

export function newHeroState(hero: Hero): HeroState {
  const skillLevels: Record<string, number> = {};
  for (const s of hero.skills) skillLevels[s] = 1;
  return { id: hero.id, level: 1, exp: 0, star: naturalStar(hero), awakened: false, skillLevels };
}

export function levelCap(hs: HeroState): number {
  return maxLevelForStar(hs.star);
}

export function isMaxLevel(hs: HeroState): boolean {
  return hs.level >= levelCap(hs);
}

/* ---------------- ต้นทุน ---------------- */

/** ต้นทุนเลื่อน 1 เลเวล */
export function levelUpCost(hs: HeroState): Cost {
  return { gold: goldToNextLevel(cfg, hs.level), items: {}, exp: expToNextLevel(cfg, hs.level) };
}

/** ต้นทุนเลื่อน 1 ดาว */
export function starUpCost(hs: HeroState): Cost {
  return {
    gold: cfg.star.goldBase * hs.star,
    items: { [shardItem(hs.id)]: cfg.star.shardsPerStar * hs.star },
  };
}

export function awakenCost(hero: Hero): Cost {
  return { gold: cfg.awaken.gold, items: { [essenceItem(hero.element)]: cfg.awaken.essence } };
}

/** ต้นทุนเลื่อนสกิล 1 ระดับ (แพงขึ้นตามระดับปัจจุบัน) */
export function skillUpCost(hs: HeroState, skillId: string): Cost {
  const lv = hs.skillLevels[skillId] ?? 1;
  return { gold: cfg.skill.goldBase * lv, items: { [ITEM.skillScroll]: cfg.skill.scrollsPerLevel * lv } };
}

export function canPay(state: PlayerState, cost: Cost): boolean {
  if (state.gold < cost.gold) return false;
  for (const [item, n] of Object.entries(cost.items)) {
    if (countOf(state.materials, item) < n) return false;
  }
  return true;
}

/** อธิบายต้นทุนเป็นข้อความไทยสั้นๆ สำหรับปุ่มบน UI */
export function costLine_th(cost: Cost, itemName: (item: string) => string): string {
  const parts: string[] = [];
  if (cost.gold > 0) parts.push(`${cost.gold.toLocaleString('th-TH')} ทอง`);
  for (const [item, n] of Object.entries(cost.items)) parts.push(`${itemName(item)} ×${n}`);
  return parts.join(' + ');
}

/* ---------------- การกระทำ ---------------- */

function pay(state: PlayerState, cost: Cost): PlayerState | null {
  if (state.gold < cost.gold) return null;
  const materials = spendItems(state.materials, cost.items);
  if (!materials) return null;
  return { ...state, gold: state.gold - cost.gold, materials };
}

function putHero(state: PlayerState, hs: HeroState): PlayerState {
  return { ...state, roster: { ...state.roster, [hs.id]: hs } };
}

const fail = (reason_th: string): MetaResult => ({ ok: false, reason_th });

/** เติม EXP ให้ฮีโร่ (จากผลด่าน) — ไม่เลื่อนเลเวลเอง เก็บสะสมไว้ */
export function grantExp(state: PlayerState, heroId: string, exp: number): PlayerState {
  const hs = state.roster[heroId];
  if (!hs || exp <= 0) return state;
  return putHero(state, { ...hs, exp: hs.exp + Math.round(exp) });
}

/** ใช้ยาเพิ่มประสบการณ์แปลงเป็น EXP ของฮีโร่ */
export function feedExpPotions(state: PlayerState, heroId: string, count: number): MetaResult {
  const hs = state.roster[heroId];
  if (!hs) return fail('ยังไม่มีฮีโร่ตัวนี้');
  const n = Math.floor(count);
  if (n <= 0) return fail('จำนวนต้องมากกว่า 0');
  if (countOf(state.materials, ITEM.expPotion) < n) return fail('ยาเพิ่มประสบการณ์ไม่พอ');
  const materials = spendItems(state.materials, { [ITEM.expPotion]: n })!;
  const gained = n * cfg.level.expPerPotion;
  const next = putHero({ ...state, materials }, { ...hs, exp: hs.exp + gained });
  return { ok: true, state: next, log_th: `ได้รับ ${gained.toLocaleString('th-TH')} EXP` };
}

/**
 * เลื่อนเลเวลได้มากที่สุดเท่าที่ EXP + ทองมี (สูงสุด `times` ครั้ง)
 * เลื่อนได้อย่างน้อย 1 ครั้งถึงจะถือว่าสำเร็จ
 */
export function levelUpHero(state: PlayerState, heroId: string, times = 1): MetaResult {
  const hs0 = state.roster[heroId];
  if (!hs0) return fail('ยังไม่มีฮีโร่ตัวนี้');
  const cap = levelCap(hs0);
  if (hs0.level >= cap) return fail(`ถึงเพดานเลเวล ${cap} ของ ${hs0.star} ดาวแล้ว — เลื่อนดาวก่อน`);

  let cur = state;
  let hs = hs0;
  let done = 0;
  const want = Math.max(1, Math.floor(times));
  while (done < want && hs.level < cap) {
    const cost = levelUpCost(hs);
    if (hs.exp < (cost.exp ?? 0)) break;
    const paid = pay(cur, cost);
    if (!paid) break;
    hs = { ...hs, level: hs.level + 1, exp: hs.exp - (cost.exp ?? 0) };
    cur = putHero(paid, hs);
    done++;
  }
  if (done === 0) {
    const cost = levelUpCost(hs0);
    return fail(hs0.exp < (cost.exp ?? 0) ? 'EXP ไม่พอ' : 'ทองไม่พอ');
  }
  return { ok: true, state: cur, log_th: `เลื่อนขึ้น ${done} เลเวล → Lv.${hs.level}` };
}

/** เลื่อนดาว — เลเวลไม่ถูกรีเซ็ต (ดู DECISIONS.md) เพดานเลเวลขยายทันที */
export function starUpHero(state: PlayerState, heroId: string): MetaResult {
  const hs = state.roster[heroId];
  if (!hs) return fail('ยังไม่มีฮีโร่ตัวนี้');
  if (hs.star >= cfg.star.maxStar) return fail(`ถึงดาวสูงสุดแล้ว (${cfg.star.maxStar} ดาว)`);
  if (!isMaxLevel(hs)) return fail(`ต้องอัพถึงเลเวล ${levelCap(hs)} ก่อนถึงเลื่อนดาวได้`);
  const cost = starUpCost(hs);
  const paid = pay(state, cost);
  if (!paid) return fail(canPayGold(state, cost) ? 'เศษวิญญาณไม่พอ' : 'ทองไม่พอ');
  const next = putHero(paid, { ...hs, star: hs.star + 1 });
  return { ok: true, state: next, log_th: `เลื่อนเป็น ${hs.star + 1} ดาว — เพดานเลเวลใหม่ ${maxLevelForStar(hs.star + 1)}` };
}

/** ปลุกพลัง (Awaken) — ทำได้ครั้งเดียวต่อฮีโร่ */
export function awakenHero(state: PlayerState, heroId: string): MetaResult {
  const hs = state.roster[heroId];
  if (!hs) return fail('ยังไม่มีฮีโร่ตัวนี้');
  if (hs.awakened) return fail('ปลุกพลังไปแล้ว');
  if (hs.star < cfg.awaken.minStar) return fail(`ต้องถึง ${cfg.awaken.minStar} ดาวก่อนถึงปลุกพลังได้`);
  const hero = getHero(heroId);
  const cost = awakenCost(hero);
  const paid = pay(state, cost);
  if (!paid) return fail(canPayGold(state, cost) ? 'เอสเซนซ์ธาตุไม่พอ' : 'ทองไม่พอ');
  const next = putHero(paid, { ...hs, awakened: true });
  return { ok: true, state: next, log_th: `ปลุกพลังสำเร็จ — ${hero.awakenName_th}` };
}

export function skillUpHero(state: PlayerState, heroId: string, skillId: string): MetaResult {
  const hs = state.roster[heroId];
  if (!hs) return fail('ยังไม่มีฮีโร่ตัวนี้');
  if (!(skillId in hs.skillLevels)) return fail('ฮีโร่ตัวนี้ไม่มีสกิลนั้น');
  const lv = hs.skillLevels[skillId] ?? 1;
  if (lv >= cfg.skill.maxLevel) return fail(`สกิลนี้ถึงระดับสูงสุดแล้ว (${cfg.skill.maxLevel})`);
  const cost = skillUpCost(hs, skillId);
  const paid = pay(state, cost);
  if (!paid) return fail(canPayGold(state, cost) ? 'ม้วนคาถาไม่พอ' : 'ทองไม่พอ');
  const next = putHero(paid, { ...hs, skillLevels: { ...hs.skillLevels, [skillId]: lv + 1 } });
  return { ok: true, state: next, log_th: `สกิลขึ้นเป็นระดับ ${lv + 1}` };
}

/** ได้ฮีโร่ตัวใหม่ — ถ้ามีอยู่แล้วแปลงเป็นเศษวิญญาณ (ตัวซ้ำไม่สูญเปล่า) */
export function grantHero(state: PlayerState, heroId: string, shardsIfDuplicate?: number): MetaResult {
  const hero = getHero(heroId);
  if (state.roster[heroId]) {
    const n = shardsIfDuplicate ?? cfg.star.shardsPerStar;
    const materials = addItems(state.materials, { [shardItem(heroId)]: n });
    return { ok: true, state: { ...state, materials }, log_th: `ได้ ${hero.name_th} ซ้ำ → เศษวิญญาณ ×${n}` };
  }
  const withHero = putHero(state, newHeroState(hero));
  const team = withHero.team.length < TEAM_SIZE ? [...withHero.team, heroId] : withHero.team;
  return { ok: true, state: { ...withHero, team }, log_th: `ได้ฮีโร่ใหม่: ${hero.name_th}` };
}

/* ---------------- ทีม ---------------- */

export function setTeam(state: PlayerState, ids: readonly string[]): MetaResult {
  const unique = [...new Set(ids)];
  if (unique.length > TEAM_SIZE) return fail(`จัดทีมได้สูงสุด ${TEAM_SIZE} ตัว`);
  const missing = unique.find((id) => !state.roster[id]);
  if (missing) return fail(`ยังไม่มีฮีโร่ "${missing}" ในคลัง`);
  return { ok: true, state: { ...state, team: unique }, log_th: `จัดทีม ${unique.length} ตัว` };
}

export function toggleTeamMember(state: PlayerState, heroId: string): MetaResult {
  const inTeam = state.team.includes(heroId);
  return setTeam(state, inTeam ? state.team.filter((id) => id !== heroId) : [...state.team, heroId]);
}

/** แปลงทีมเป็น input ของ sim (โครงตรงกับ `SquadEntry` ของ `@runegate/sim`) */
export function battleSquad(state: PlayerState): {
  heroId: string;
  level: number;
  star: number;
  awakened: boolean;
  skillLevels: Record<string, number>;
}[] {
  return state.team
    .map((id) => state.roster[id])
    .filter((hs): hs is HeroState => hs !== undefined)
    .map((hs) => ({
      heroId: hs.id,
      level: hs.level,
      star: hs.star,
      awakened: hs.awakened,
      skillLevels: { ...hs.skillLevels },
    }));
}

function canPayGold(state: PlayerState, cost: Cost): boolean {
  return state.gold >= cost.gold;
}
