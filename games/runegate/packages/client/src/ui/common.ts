import type { Element, EnemyTrait, HeroClass, Race } from '@runegate/data';

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export const CLASS_TH: Record<HeroClass, string> = {
  swordsman: 'นักดาบ',
  thief: 'โจร',
  archer: 'นักธนู',
  mage: 'นักเวท',
  acolyte: 'ผู้รับใช้',
  merchant: 'พ่อค้า',
};

export const ELEMENT_TH: Record<Element, string> = {
  water: 'น้ำ',
  fire: 'ไฟ',
  wind: 'ลม',
  light: 'แสง',
  dark: 'มืด',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  water: 'var(--el-water)',
  fire: 'var(--el-fire)',
  wind: 'var(--el-wind)',
  light: 'var(--el-light)',
  dark: 'var(--el-dark)',
};

export const RACE_TH: Record<Race, string> = {
  human: 'มนุษย์',
  beast: 'สัตว์',
  demon: 'ปีศาจ',
  undead: 'อันเดด',
  insect: 'แมลง',
};

export const TRAIT_TH: Record<EnemyTrait, string> = {
  flying: 'บิน',
  stealth: 'ล่องหน',
  armored: 'หุ้มเกราะ',
  magic_resist: 'ต้านเวท',
  healer: 'ฮีลพวกเดียวกัน',
  swarm: 'มาเป็นฝูง',
  elite: 'มินิบอส',
  boss: 'บอส MVP',
};

export type EnemyTier = 'normal' | 'elite' | 'mvp';

export const TIER_TH: Record<EnemyTier, string> = {
  normal: 'ธรรมดา',
  elite: 'มินิบอส',
  mvp: 'บอส MVP',
};

export function starStr(n: number, max = 3): string {
  return '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, max - n));
}

export function starHtml(n: number, max = 3): string {
  return `<span class="on">${'★'.repeat(n)}</span>${'☆'.repeat(Math.max(0, max - n))}`;
}

export function toast(parent: HTMLElement, message: string): void {
  const existing = parent.querySelector('.toast');
  existing?.remove();
  const el = h('div', { class: 'toast' }, message);
  parent.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
