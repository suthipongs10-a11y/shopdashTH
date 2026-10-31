// MissionDirector: turns a catalog mission (waves + required actors) into timed
// spawn requests. Pure and deterministic — the world owns the entities. Wave
// formations are laid out here; enemy colliders/attacks live in combat/enemies.
import type { EnemyRow, MissionRow } from "../core/types";
import type { Vec } from "../core/geometry";
import type { SpawnSpec } from "../combat/enemies";
import type { Rng } from "../core/rng";

export interface WaveDef {
  id: string;
  trigger: "start" | "previous_wave_cleared";
  delay_sec: number;
  enemy_id?: string;
  count?: number;
  formation?: "arc" | "v" | "side_sweep" | "staggered_columns";
  spacing_px?: number;
  entry_side?: "left" | "right" | "top";
  safe_dock_after?: boolean;
  encounter_id?: string;
  safe_dock_before?: boolean;
}

export interface RequiredActors {
  supply_nodes: number; escort: number; marked_ambusher_groups: number; salvage_carriers: number;
  hazard_nodes: number; boss_interrupt_windows_min: number;
}

// Enemy ids and encounters this build can run. A mission is playable only if all its
// waves and required actors are supported (others show as "coming soon").
export const SUPPORTED_ENEMIES = new Set(["E01", "E02", "E03", "E04", "E21"]);
export const SUPPORTED_ENCOUNTERS = new Set(["B01", "B02"]);
export const SUPPORTED_HAZARDS = new Set(["HZ01"]);

export function missionWaves(m: MissionRow): WaveDef[] {
  return m.waves as unknown as WaveDef[];
}

export function requiredActors(m: MissionRow): RequiredActors {
  const r = (m as unknown as { required_actors?: Partial<RequiredActors> }).required_actors ?? {};
  return { supply_nodes: 0, escort: 0, marked_ambusher_groups: 0, salvage_carriers: 0, hazard_nodes: 0, boss_interrupt_windows_min: 0, ...r };
}

export function missionPlayable(m: MissionRow): boolean {
  const r = requiredActors(m);
  if (r.escort || r.marked_ambusher_groups) return false;
  if (r.hazard_nodes && !SUPPORTED_HAZARDS.has(m.hazard_id)) return false;
  // Salvage carriers are the mission's E04 haulers (DECISIONS); enough of them must be authored.
  const haulers = missionWaves(m).filter((w) => w.enemy_id === "E04").reduce((n, w) => n + (w.count ?? 0), 0);
  if (r.salvage_carriers > haulers) return false;
  return missionWaves(m).every((w) => (w.encounter_id ? SUPPORTED_ENCOUNTERS.has(w.encounter_id) : SUPPORTED_ENEMIES.has(w.enemy_id ?? "")));
}

// Movement profile per catalog movement type (Standard difficulty).
const MOVE: Record<string, { speed: number; wobble: number; lane: number }> = {
  zigzag: { speed: 120, wobble: 40, lane: 200 },
  flank: { speed: 150, wobble: 0, lane: 240 },
  sweep: { speed: 160, wobble: 0, lane: 230 },
  slow_line: { speed: 55, wobble: 0, lane: 300 },
  cross: { speed: 75, wobble: 0, lane: 260 },
};

// Formation offsets: `lat` across the travel direction, `back` behind the leader.
function formationOffset(f: WaveDef["formation"], k: number, n: number, s: number): { lat: number; back: number } {
  const c = k - (n - 1) / 2;
  switch (f) {
    case "arc": return { lat: c * s * 0.8, back: c * c * s * 0.15 };
    case "v": return { lat: c * s * 0.7, back: Math.abs(c) * s * 0.7 };
    case "side_sweep": return { lat: k * s * 0.35, back: k * s * 1.4 };
    case "staggered_columns": return { lat: (k % 2) * s * 1.2 - s * 0.6, back: Math.floor(k / 2) * s * 1.5 + (k % 2) * s * 0.7 };
    default: return { lat: c * s, back: 0 };
  }
}

const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Spawn specs for one combat wave. Paths start off screen and end off screen.
export function formationSpawns(w: WaveDef, row: EnemyRow): SpawnSpec[] {
  const n = w.count ?? 1;
  const s = w.spacing_px ?? 80;
  const mv = MOVE[row.movement] ?? MOVE.zigzag;
  const out: SpawnSpec[] = [];
  for (let k = 0; k < n; k++) {
    const { lat, back } = formationOffset(w.formation, k, n, s);
    let path: Vec[];
    if (w.entry_side === "top") {
      const x = clampN(360 + lat, 70, 650);
      const start = { x, y: -70 - back };
      const exitX = x < 360 ? -90 : 810;
      switch (row.movement) {
        case "sweep": { // descend, sweep across, sweep back, leave the way it came
          const y = 210 + Math.abs(lat) * 0.25;
          const far = x < 360 ? 640 : 80;
          path = [start, { x, y }, { x: far, y }, { x: far, y: y + 130 }, { x: exitX, y: y + 130 }];
          break;
        }
        case "slow_line": path = [start, { x, y: 300 }, { x, y: 1380 }]; break;
        case "flank": { // loiter across the upper screen looking for loot, then leave
          const far = x < 360 ? 620 : 100;
          path = [start, { x, y: 230 }, { x: far, y: 270 }, { x, y: 230 }, { x: exitX, y: 200 }];
          break;
        }
        case "cross": path = [start, { x, y: 1380 }]; break;
        default: path = [start, { x, y: 420 + Math.abs(lat) * 0.3 }, { x: exitX, y: 640 }];
      }
    } else {
      const fromLeft = w.entry_side !== "right";
      const sgn = fromLeft ? 1 : -1;
      const y = clampN(mv.lane + lat, 150, 720);
      const start = { x: fromLeft ? -70 - back : 790 + back, y };
      const exitX = fromLeft ? 810 : -90;
      switch (row.movement) {
        case "sweep": { // crosses the screen twice (ATTACK_LIBRARY: interceptor)
          const far = fromLeft ? 650 : 70;
          path = [start, { x: far, y }, { x: far - sgn * 20, y: y + 140 }, { x: fromLeft ? -90 : 810, y: y + 140 }];
          break;
        }
        case "cross": path = [start, { x: exitX, y: y + 60 }]; break;
        case "slow_line": path = [start, { x: exitX, y }]; break;
        case "flank": path = [start, { x: fromLeft ? 620 : 100, y }, { x: fromLeft ? 100 : 620, y: y + 50 }, { x: exitX, y: y + 20 }]; break;
        default: path = [start, { x: exitX, y: y + 120 }];
      }
    }
    out.push({ path, speed: mv.speed, wobble: mv.wobble, index: k });
  }
  return out;
}

// Hazard nodes fly in and hover near the top, launching wreck drift until destroyed.
export function hazardNodeSpawn(rng: Rng, index: number): SpawnSpec {
  const x = 150 + Math.floor(rng.next() * 420);
  return { path: [{ x, y: -70 }, { x, y: 300 + (index % 2) * 40 }], speed: 120, wobble: 0, index }; // below the hint strip
}

// Supply nodes drift down the screen; they never shoot and leave if ignored.
export function supplySpawn(rng: Rng, index: number): SpawnSpec {
  const x = 140 + Math.floor(rng.next() * 440);
  return { path: [{ x, y: -60 }, { x, y: 1380 }], speed: 48, wobble: 0, index };
}

// Each catalog combat wave plays as PULSES passes; later passes mirror the entry
// side (DECISIONS: catalog waves are unplaytested seeds and ran far below
// duration_target_sec with one pass).
export const PULSES = 3; // owner: missions ended too fast
export const PULSE_DELAY = 1.5;

export function mirrorWave(w: WaveDef): WaveDef {
  const side = w.entry_side === "left" ? "right" : w.entry_side === "right" ? "left" : "top";
  return { ...w, entry_side: side };
}

export type DirectorEvent =
  | { kind: "wave"; wave: WaveDef; index: number; pulse: number }
  | { kind: "supply"; index: number }
  | { kind: "hazard_node"; index: number }
  | { kind: "encounter"; wave: WaveDef; index: number }
  | { kind: "complete" };

// Wave scheduler. Supply nodes appear one per combat wave until the mission's
// required count is placed (they do not hold up "previous wave cleared").
export class MissionDirector {
  readonly waves: WaveDef[];
  readonly actors: RequiredActors;
  index = -1;           // last started catalog wave
  pulse = 0;            // pass within the current wave
  timer: number;
  private waiting = true;
  private pendingPulse = false;
  private supplyPlaced = 0;
  private hazardPlaced = 0;
  done = false;

  constructor(readonly mission: MissionRow) {
    this.waves = missionWaves(mission);
    this.actors = requiredActors(mission);
    this.timer = this.waves[0]?.delay_sec ?? 0;
  }

  get current(): WaveDef | null { return this.waves[this.index] ?? null; }

  // `cleared`: no wave enemies remain (supply nodes excluded); `bossActive`: encounter running.
  tick(dt: number, cleared: boolean, bossActive: boolean): DirectorEvent[] {
    const out: DirectorEvent[] = [];
    if (this.done) return out;
    if (!this.waiting) {
      if (!cleared || bossActive) return out;
      const cur = this.waves[this.index];
      if (!cur.encounter_id && this.pulse < PULSES - 1) {
        this.pendingPulse = true;
        this.timer = PULSE_DELAY;
      } else if (this.index >= this.waves.length - 1) {
        this.done = true;
        out.push({ kind: "complete" });
        return out;
      } else {
        this.pendingPulse = false;
        this.timer = this.waves[this.index + 1].delay_sec;
      }
      this.waiting = true;
    }
    this.timer -= dt;
    if (this.timer > 0) return out;
    this.waiting = false;
    if (this.pendingPulse) {
      this.pendingPulse = false;
      this.pulse++;
      const w = this.waves[this.index];
      out.push({ kind: "wave", wave: this.pulse % 2 ? mirrorWave(w) : w, index: this.index, pulse: this.pulse });
      return out;
    }
    this.index++;
    this.pulse = 0;
    const w = this.waves[this.index];
    if (w.encounter_id) out.push({ kind: "encounter", wave: w, index: this.index });
    else {
      out.push({ kind: "wave", wave: w, index: this.index, pulse: 0 });
      if (this.supplyPlaced < this.actors.supply_nodes) out.push({ kind: "supply", index: this.supplyPlaced++ });
      if (this.hazardPlaced < this.actors.hazard_nodes) out.push({ kind: "hazard_node", index: this.hazardPlaced++ });
    }
    return out;
  }
}
