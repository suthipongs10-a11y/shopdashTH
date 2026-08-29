import { cards, dropTableById, enemies, enemyById, heroes, skillById, stages } from './index.js';
import type { Stage } from './schema/stage.js';

export interface ContentIssue {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

const WALKABLE = new Set(['R', 'S', 'E']);

/** เดินตามเส้นทางทีละช่วง แล้วคืน tile ทุกช่องที่เส้นทางพาดผ่าน */
export function tilesAlongPath(stage: Stage, points: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = Math.sign(b[0] - a[0]);
    const dy = Math.sign(b[1] - a[1]);
    let [x, y] = a;
    out.push([x, y]);
    // รองรับเฉพาะเส้นตรงแนวตั้ง/แนวนอน (กติกาออกแบบด่าน — ทแยงทำให้ block คลุมเครือ)
    while (x !== b[0] || y !== b[1]) {
      if (x !== b[0]) x += dx;
      else if (y !== b[1]) y += dy;
      out.push([x, y]);
    }
  }
  return out;
}

export function tileAt(stage: Stage, x: number, y: number): string {
  return stage.tiles[y]?.[x] ?? '.';
}

/** ตรวจความสอดคล้องข้ามไฟล์ทั้งหมด — รันใน test + สคริปต์ validate (Phase 0 DoD) */
export function validateContent(): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warn', where, message });

  for (const h of heroes) {
    for (const s of h.skills) {
      if (!skillById.has(s)) err(`hero:${h.id}`, `อ้างสกิล "${s}" ที่ไม่มีอยู่`);
    }
    const ults = h.skills.filter((s) => skillById.get(s)?.type === 'ultimate');
    if (ults.length > 1) err(`hero:${h.id}`, `มี ultimate ${ults.length} ท่า — อนุญาตตัวละ 1 ท่า`);
    if (h.pos === 'ranged' && h.blockCount > 0) err(`hero:${h.id}`, 'ฮีโร่ ranged ต้อง blockCount = 0');
    if (h.pos === 'melee' && h.blockCount === 0) warn(`hero:${h.id}`, 'ฮีโร่ melee ที่บล็อคไม่ได้ — ตั้งใจหรือไม่?');
    if (h.pos === 'melee' && h.range > 1.6) warn(`hero:${h.id}`, `melee ระยะ ${h.range} ยาวผิดปกติ`);
  }

  for (const e of enemies) {
    for (const s of e.skills) {
      if (!skillById.has(s)) err(`enemy:${e.id}`, `อ้างสกิล "${s}" ที่ไม่มีอยู่`);
    }
    if (e.skills.some((s) => skillById.get(s)?.type === 'ultimate')) {
      err(`enemy:${e.id}`, 'ศัตรูใช้สกิลชนิด ultimate ไม่ได้ (ต้องเป็น passive/auto)');
    }
  }

  for (const c of cards) {
    if (!enemyById.has(c.sourceEnemy)) err(`card:${c.id}`, `อ้างศัตรู "${c.sourceEnemy}" ที่ไม่มีอยู่`);
  }
  for (const e of enemies) {
    if (e.cardId && !cards.some((c) => c.id === e.cardId)) {
      err(`enemy:${e.id}`, `cardId "${e.cardId}" ไม่มีในตารางการ์ด`);
    }
  }

  for (const st of stages) {
    for (const w of st.waves) {
      for (const g of w.groups) {
        if (!enemyById.has(g.enemy)) err(`stage:${st.id}/${w.id}`, `อ้างศัตรู "${g.enemy}" ที่ไม่มีอยู่`);
      }
    }
    if (st.rewards.dropTable && !dropTableById.has(st.rewards.dropTable)) {
      err(`stage:${st.id}`, `dropTable "${st.rewards.dropTable}" ไม่มีอยู่`);
    }
    for (let i = 1; i < st.waves.length; i++) {
      if (st.waves[i]!.startSec <= st.waves[i - 1]!.startSec) {
        err(`stage:${st.id}`, `เวฟ ${st.waves[i]!.id} เริ่มก่อนหรือพร้อมเวฟก่อนหน้า`);
      }
    }

    let melee = 0;
    let ranged = 0;
    for (let y = 0; y < st.grid.h; y++) {
      for (let x = 0; x < st.grid.w; x++) {
        const t = tileAt(st, x, y);
        if (t === 'R' || t === 'G') melee++;
        if (t === 'H') ranged++;
      }
    }
    if (melee === 0) err(`stage:${st.id}`, 'ไม่มีช่องวาง melee เลย');
    if (ranged === 0) err(`stage:${st.id}`, 'ไม่มีช่องวาง ranged (ที่สูง) เลย');

    for (const [name, pts] of Object.entries(st.paths)) {
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      if (tileAt(st, first[0], first[1]) !== 'S') {
        err(`stage:${st.id}`, `เส้นทาง "${name}" ไม่ได้เริ่มที่ช่อง S (พบ "${tileAt(st, first[0], first[1])}")`);
      }
      if (tileAt(st, last[0], last[1]) !== 'E') {
        err(`stage:${st.id}`, `เส้นทาง "${name}" ไม่ได้จบที่ช่อง E (พบ "${tileAt(st, last[0], last[1])}")`);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        if (a[0] !== b[0] && a[1] !== b[1]) {
          err(`stage:${st.id}`, `เส้นทาง "${name}" ช่วงที่ ${i} เป็นแนวทแยง — รองรับเฉพาะแนวตั้ง/นอน`);
        }
      }
      for (const [x, y] of tilesAlongPath(st, pts)) {
        const t = tileAt(st, x, y);
        if (!WALKABLE.has(t)) {
          err(`stage:${st.id}`, `เส้นทาง "${name}" พาดผ่านช่อง (${x},${y}) ที่เป็น "${t}" — ต้องเป็น R/S/E`);
        }
      }
    }
  }

  return issues;
}
