import type { Element } from '@runegate/data';

import type { Materials } from './types.js';

/** ไอเทมที่ระบบนอกด่านใช้ — id ต้องตรงกับที่ตารางดรอปจ่ายออกมา */
export const ITEM = {
  goldPile: 'gold',
  expPotion: 'hero_exp_potion',
  skillScroll: 'skill_scroll',
  summonScroll: 'summon_scroll',
  refineOre: 'refine_ore',
  cardShard: 'card_shard',
} as const;

/** เศษวิญญาณของฮีโร่ตัวหนึ่ง (ใช้เลื่อนดาว) */
export function shardItem(heroId: string): string {
  return `shard_${heroId}`;
}

/** เอสเซนซ์ธาตุ (ใช้ปลุกพลัง) */
export function essenceItem(element: Element): string {
  return `essence_${element}`;
}

const ELEMENT_TH: Record<Element, string> = {
  water: 'น้ำ',
  fire: 'ไฟ',
  wind: 'ลม',
  light: 'แสง',
  dark: 'มืด',
};

/** ชื่อไทยของไอเทม — heroName ใส่มาเพื่อให้เศษวิญญาณอ่านรู้เรื่อง */
export function itemName_th(item: string, heroName?: string): string {
  if (item.startsWith('shard_')) return `เศษวิญญาณ${heroName ? `ของ${heroName}` : ''}`;
  if (item.startsWith('essence_')) {
    const el = item.slice('essence_'.length) as Element;
    return `เอสเซนซ์ธาตุ${ELEMENT_TH[el] ?? el}`;
  }
  switch (item) {
    case ITEM.goldPile: return 'ทอง';
    case ITEM.expPotion: return 'ยาเพิ่มประสบการณ์';
    case ITEM.skillScroll: return 'ม้วนคาถา';
    case ITEM.summonScroll: return 'ม้วนอัญเชิญ';
    case ITEM.refineOre: return 'แร่ตีบวก';
    case ITEM.cardShard: return 'เศษการ์ด';
    default: return item;
  }
}

export function countOf(materials: Materials, item: string): number {
  return materials[item] ?? 0;
}

export function addItems(materials: Materials, add: Readonly<Record<string, number>>): Materials {
  const out: Record<string, number> = { ...materials };
  for (const [item, n] of Object.entries(add)) {
    if (n === 0) continue;
    out[item] = (out[item] ?? 0) + n;
    if (out[item]! <= 0) delete out[item];
  }
  return out;
}

/** หักไอเทมออก — คืน null ถ้ามีไม่พอ (ผู้เรียกต้องเช็คก่อนเสมอ) */
export function spendItems(materials: Materials, cost: Readonly<Record<string, number>>): Materials | null {
  for (const [item, n] of Object.entries(cost)) {
    if (countOf(materials, item) < n) return null;
  }
  const negated: Record<string, number> = {};
  for (const [item, n] of Object.entries(cost)) negated[item] = -n;
  return addItems(materials, negated);
}
