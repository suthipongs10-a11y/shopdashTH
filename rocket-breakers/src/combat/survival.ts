// Survival mode (owner experiment): endless escalating waves, a boss every few minutes,
// XP from kills and a pick-1-of-3 upgrade on every level. Pure scheduling + choice rules;
// the world spawns the entities and applies the picks.
import type { Rng } from "../core/rng";
import type { WaveDef } from "../campaign/missionDirector";
import { ARSENAL_POOL } from "./world";

export const SURVIVAL_ID = "SURVIVAL";
export const FIRST_BOSS_SEC = 120;
export const BOSS_EVERY_SEC = 150;

export type SurvivalEvent = { kind: "wave"; wave: WaveDef; elite: boolean } | { kind: "boss"; id: string; cycle: number };

const FORMATIONS: WaveDef["formation"][] = ["arc", "v", "side_sweep", "staggered_columns"];
const SIDES: WaveDef["entry_side"][] = ["left", "right", "top"];

export class SurvivalDirector {
  t = 0;
  private next = 2;
  private bossAt = FIRST_BOSS_SEC;
  private bosses = 0;
  private seq = 0;

  constructor(private rng: Rng) {}

  // Difficulty level: +1 every 30 s.
  get level(): number { return Math.floor(this.t / 30); }

  tick(dt: number, bossAlive: boolean, enemiesAlive: number): SurvivalEvent[] {
    this.t += dt;
    const out: SurvivalEvent[] = [];
    if (!bossAlive && this.t >= this.bossAt) {
      const cycle = this.bosses++;
      out.push({ kind: "boss", id: cycle % 2 === 0 ? "B01" : "B02", cycle });
      this.bossAt = this.t + BOSS_EVERY_SEC;
    }
    this.next -= dt;
    const cap = 14 + this.level * 3;
    if (this.next <= 0 && enemiesAlive < cap) {
      const L = this.level;
      const interval = Math.max(3.2, 8 - L * 0.7) * (bossAlive ? 1.8 : 1);
      this.next = interval;
      const pool = ["E01", "E02", ...(this.t > 25 ? ["E03"] : []), ...(this.t > 40 ? ["E04"] : []), ...(this.t > 60 ? ["E21"] : [])];
      const enemy = pool[Math.floor(this.rng.next() * pool.length)];
      const count = enemy === "E03" ? Math.min(2 + Math.floor(L / 2), 5) : enemy === "E21" ? 3 : Math.min(4 + L, 9);
      const wave: WaveDef = {
        id: `S:${this.seq++}`, trigger: "start", delay_sec: 0, enemy_id: enemy, count,
        formation: FORMATIONS[Math.floor(this.rng.next() * FORMATIONS.length)],
        spacing_px: 80, entry_side: SIDES[Math.floor(this.rng.next() * SIDES.length)],
      };
      const elite = enemy !== "E04" && enemy !== "E21" && this.rng.next() < 0.2 + L * 0.05;
      out.push({ kind: "wave", wave, elite });
    }
    return out;
  }
}

// ---------------------------------------------------------------- level-up choices
export interface Choice { kind: "weapon" | "stat"; id: string }

export const STAT_CHOICES = ["damage", "rate", "hp", "shield", "speed", "repair", "overdrive"] as const;
export type StatId = (typeof STAT_CHOICES)[number];

export const xpToNext = (level: number): number => 30 + level * 22;

// Three distinct offers, always at least one new gun.
export function rollChoices(rng: Rng, fitted: string[]): Choice[] {
  const guns = ARSENAL_POOL.filter((id) => !fitted.includes(id));
  const pickGun = () => guns.splice(Math.floor(rng.next() * guns.length), 1)[0];
  const out: Choice[] = [];
  const g = pickGun();
  if (g) out.push({ kind: "weapon", id: g });
  const stats = [...STAT_CHOICES];
  while (out.length < 3) {
    if (rng.next() < 0.35 && guns.length) { out.push({ kind: "weapon", id: pickGun()! }); continue; }
    const s = stats.splice(Math.floor(rng.next() * stats.length), 1)[0];
    if (s) out.push({ kind: "stat", id: s });
  }
  return out;
}
