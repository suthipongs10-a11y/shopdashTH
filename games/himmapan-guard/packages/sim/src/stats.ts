import type { StatusKind } from '@himmapan/data';
import type { ModStat, Unit } from './types.js';

function modded(u: Unit, stat: ModStat, base: number): number {
  let add = 0;
  let mult = 1;
  for (const m of u.mods) {
    if (m.stat !== stat) continue;
    add += m.add;
    mult *= m.mult;
  }
  return (base + add) * mult;
}

export function hasStatus(u: Unit, kind: StatusKind): boolean {
  for (const s of u.statuses) if (s.kind === kind) return true;
  return false;
}

export function statusValue(u: Unit, kind: StatusKind): number {
  let v = 0;
  for (const s of u.statuses) if (s.kind === kind) v = Math.max(v, s.value);
  return v;
}

export function effAtk(u: Unit): number {
  const v = modded(u, 'atk', u.base.atk);
  return Math.max(0, v * (1 + statusValue(u, 'atk_up')));
}

export function effDef(u: Unit): number {
  const v = modded(u, 'def', u.base.def);
  return Math.max(0, v * (1 - statusValue(u, 'def_down')));
}

export function effMres(u: Unit): number {
  const v = modded(u, 'mres', u.base.mres);
  return Math.min(0.9, Math.max(0, v * (1 - statusValue(u, 'def_down'))));
}

export function effAspd(u: Unit): number {
  return Math.max(0.05, modded(u, 'aspd', u.base.aspd));
}

export function effRange(u: Unit): number {
  return Math.max(0.1, modded(u, 'range', u.base.range));
}

export function effCritRate(u: Unit): number {
  return Math.min(1, Math.max(0, modded(u, 'crit_rate', u.base.critRate)));
}

export function effCritDmg(u: Unit): number {
  return Math.max(1, modded(u, 'crit_dmg', u.base.critDmg));
}

/** ความเร็วเดินหลังหักผลของ slow (slow หลายชั้นเอาค่าที่แรงที่สุด ไม่บวกกัน) */
export function effMoveSpeed(base: number, u: Unit): number {
  const slow = Math.min(0.8, statusValue(u, 'slow'));
  return Math.max(0.05, base * (1 - slow));
}

/** หน่วยขยับ/โจมตีไม่ได้ */
export function isStunned(u: Unit): boolean {
  return hasStatus(u, 'stun');
}

/** หน่วยขยับไม่ได้แต่ยังโจมตีได้ */
export function isRooted(u: Unit): boolean {
  return hasStatus(u, 'bind') || hasStatus(u, 'stun');
}
