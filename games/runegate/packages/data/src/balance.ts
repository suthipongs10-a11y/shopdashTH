import type { Element } from './schema/common.js';

/** §5.3 — น้ำ > ไฟ > ลม > น้ำ | แสง ↔ มืด (แพ้ทางกันเอง) */
const BEATS: Readonly<Record<Element, readonly Element[]>> = {
  water: ['fire'],
  fire: ['wind'],
  wind: ['water'],
  light: ['dark'],
  dark: ['light'],
};

export const ELEMENT_ADVANTAGE_MULT = 1.3;
export const ELEMENT_DISADVANTAGE_MULT = 0.7;
/** โอกาส Glancing เมื่อเสียเปรียบธาตุ (ดาเมจเหลือ 70% ของที่คำนวณได้) */
export const GLANCING_CHANCE = 0.15;
export const GLANCING_MULT = 0.7;

export type ElementMatchup = 'advantage' | 'disadvantage' | 'neutral';

export function elementMatchup(attacker: Element, defender: Element): ElementMatchup {
  if (BEATS[attacker].includes(defender)) return 'advantage';
  if (BEATS[defender].includes(attacker)) return 'disadvantage';
  return 'neutral';
}

export function elementMultiplier(attacker: Element, defender: Element): number {
  const m = elementMatchup(attacker, defender);
  if (m === 'advantage') return ELEMENT_ADVANTAGE_MULT;
  if (m === 'disadvantage') return ELEMENT_DISADVANTAGE_MULT;
  return 1;
}

/** ดาเมจขั้นต่ำที่ทะลุการป้องกันเสมอ (สัดส่วนของดาเมจดิบ) */
export const MIN_DAMAGE_RATIO = 0.05;
/** ตัวคูณของ trait armored / magic_resist (§5.4) */
export const ARMORED_PHYSICAL_MULT = 0.7;
export const MAGIC_RESIST_TRAIT_MULT = 0.6;

/** อัตราส่วนเวลาจำลอง — sim เดินด้วย fixed timestep เสมอ (§13.2 ข้อ 2) */
export const TICKS_PER_SEC = 30;
export const TICK_DT = 1 / TICKS_PER_SEC;
