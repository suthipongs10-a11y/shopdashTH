import type { Element, HeroClass, Race } from '@himmapan/data';

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

export function starStr(n: number, max = 3): string {
  return '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, max - n));
}

export function starHtml(n: number, max = 3): string {
  return `<span class="on">${'★'.repeat(n)}</span>${'☆'.repeat(Math.max(0, max - n))}`;
}

/* ---------- ความคืบหน้าเก็บในเครื่อง (Phase 5 จะย้ายไป server) ---------- */
const KEY = 'himmapan_progress_v1';

interface Progress {
  stars: Record<string, number>;
  squad: string[];
  level: number;
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      return { stars: parsed.stars ?? {}, squad: parsed.squad ?? [], level: parsed.level ?? 12 };
    }
  } catch {
    /* ไม่มีข้อมูลเดิม/เข้าถึงไม่ได้ — ใช้ค่าเริ่มต้น */
  }
  return { stars: {}, squad: [], level: 12 };
}

function write(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* โหมดส่วนตัวของเบราว์เซอร์ — ข้ามการบันทึก */
  }
}

export const progress = {
  bestStars(stageId: string): number {
    return read().stars[stageId] ?? 0;
  },
  recordStars(stageId: string, stars: number): void {
    const p = read();
    p.stars[stageId] = Math.max(p.stars[stageId] ?? 0, stars);
    write(p);
  },
  squad(): string[] {
    return read().squad;
  },
  setSquad(ids: string[]): void {
    const p = read();
    p.squad = ids;
    write(p);
  },
  level(): number {
    return read().level;
  },
  setLevel(level: number): void {
    const p = read();
    p.level = level;
    write(p);
  },
  totalStars(): number {
    return Object.values(read().stars).reduce((a, b) => a + b, 0);
  },
};

export function toast(parent: HTMLElement, message: string): void {
  const existing = parent.querySelector('.toast');
  existing?.remove();
  const el = h('div', { class: 'toast' }, message);
  parent.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
