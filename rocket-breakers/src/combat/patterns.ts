// Data-driven hostile attack primitives (ATTACK_LIBRARY). Bosses and enemies compose
// these; timings are Standard defaults. Every emitter spawns visibly outside the
// player's hurtbox and never erases bullets already in flight.
import type { BulletPool } from "./bullets";
import { DEG, type Vec } from "../core/geometry";

export interface Emitter {
  hostile: BulletPool;
  speedMul: number;  // sector projectile speed growth (P01 = 1.0)
  damageMul: number; // sector/difficulty damage multiplier
}

function shot(em: Emitter, from: Vec, angleRad: number, speed: number, r: number, dmg: number): void {
  const s = speed * em.speedMul;
  em.hostile.spawn("hostile", from.x, from.y, Math.cos(angleRad) * s, Math.sin(angleRad) * s, r, dmg * em.damageMul, 8);
}

// Angles in degrees, 90 = straight down the screen.
export function fan(em: Emitter, from: Vec, centerDeg: number, count = 5, spreadDeg = 60, speed = 210, r = 5, dmg = 10): void {
  for (let i = 0; i < count; i++) {
    const a = centerDeg - spreadDeg / 2 + (spreadDeg * i) / Math.max(1, count - 1);
    shot(em, from, a * DEG, speed, r, dmg);
  }
}

export function straight(em: Emitter, from: Vec, angleDeg = 90, speed = 250, r = 4, dmg = 6): void {
  shot(em, from, angleDeg * DEG, speed, r, dmg);
}

export function aimed(em: Emitter, from: Vec, target: Vec, speed = 230, r = 5, dmg = 10): void {
  shot(em, from, Math.atan2(target.y - from.y, target.x - from.x), speed, r, dmg);
}

// ring_gap: `slots` radial bullets with `gap` adjacent slots omitted around safeDeg.
export function ringGap(em: Emitter, from: Vec, safeDeg: number, slots = 16, gap = 3, speed = 180, r = 5, dmg = 10): number[] {
  const step = 360 / slots;
  const safeSlot = Math.round(safeDeg / step);
  const omitted: number[] = [];
  for (let k = -Math.floor(gap / 2); k < gap - Math.floor(gap / 2); k++) omitted.push((((safeSlot + k) % slots) + slots) % slots);
  for (let i = 0; i < slots; i++) if (!omitted.includes(i)) shot(em, from, i * step * DEG, speed, r, dmg);
  return omitted;
}
