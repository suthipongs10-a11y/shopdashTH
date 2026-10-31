// Common enemies: E01 Scrap Scout, E02 Needle Interceptor, E03 Shield Barge,
// E04 Fuel Hauler and mission supply nodes. Movement and fire timing live here;
// damage resolution lives in the world. Campaign waves move along authored paths
// (MissionDirector); the SLICE-01 test mission keeps its original movement.
import { makePart, type Part } from "./parts";
import { aimed, fan, ringGap, straight, type Emitter } from "./patterns";
import type { EnemyRow } from "../core/types";
import type { Vec } from "../core/geometry";

export interface Enemy {
  id: string;
  defId: string;
  role: "scout" | "shield" | "boss" | "interceptor" | "cargo" | "supply" | "thief" | "hazard_node";
  pos: Vec;
  prev: Vec;
  parts: Part[];
  alive: boolean;
  armor: number;
  age: number;
  fireTimer: number;
  burstLeft: number;
  burstTimer: number;
  telegraph: number;   // seconds of visible warning before the next volley
  charge: number;      // Overdrive charge on kill (1–5)
  credits: number;
  scrap: number;
  score: number;
  spawnIndex: number;
  dir: number;         // entry direction (+1 from left, -1 from right)
  baseY: number;
  tag: string;         // mission grouping (e.g. "wave1", "reinforcement")
  leftArena: boolean;
  // Path movement (campaign waves): waypoints followed at `speed`; leaves when done.
  path: Vec[] | null;
  pathI: number;
  track: Vec;          // position on the path before wobble
  speed: number;
  wobble: number;      // perpendicular sine amplitude (scouts)
  wobblePhase: number;
  aim: Vec | null;     // aimed volley target, sampled when the warning starts
  // Loot Snatcher (E21) state, driven by the world (it needs the salvage list).
  steal?: { target: string | null; beam: number; carrying: string | null; idle: number };
  holdAtEnd?: boolean;
  // Status effects from player weapons (seconds left): chill slows movement, ion slows firing, burn ticks damage.
  status?: { chill: number; ion: number; burn: number };
  // Elite (one per second wave pass): tougher, gold-marked, extra ring attack, sure weapon drop.
  elite?: { ring: number }; // stay at the last waypoint instead of leaving (hazard nodes)
}

export const coreOf = (e: Enemy): Part => e.parts.find((p) => p.kind === "core")!;

function base(id: string, row: EnemyRow, role: Enemy["role"], pos: Vec, tag: string, index: number, dir: number): Enemy {
  return {
    id, defId: row.id, role, pos: { ...pos }, prev: { ...pos }, parts: [], alive: true, armor: 0, age: 0,
    fireTimer: 1.2 + index * 0.35, burstLeft: 0, burstTimer: 0, telegraph: 0, charge: 1, credits: 5, scrap: 1,
    score: 100, spawnIndex: index, dir, baseY: pos.y, tag, leftArena: false,
    path: null, pathI: 0, track: { ...pos }, speed: 0, wobble: 0, wobblePhase: 0, aim: null,
  };
}

export function makeScout(id: string, row: EnemyRow, index: number, fromRight: boolean, tag: string, hpMul = 1): Enemy {
  const dir = fromRight ? -1 : 1;
  const e = base(id, row, "scout", { x: fromRight ? 770 + index * 55 : -50 - index * 55, y: 170 + index * 42 }, tag, index, dir);
  e.parts = [makePart({ id: "core", kind: "core", shape: { type: "circle", r: 20 }, hp: row.base_hp * hpMul, selectable: true })];
  return e;
}

export function makeBarge(id: string, row: EnemyRow, index: number, fromLeft: boolean, tag: string, hpMul = 1): Enemy {
  const dir = fromLeft ? 1 : -1;
  const e = base(id, row, "shield", { x: fromLeft ? -70 : 790, y: 300 + index * 110 }, tag, index, dir);
  e.charge = 3; e.credits = 15; e.scrap = 3; e.score = 300;
  e.parts = [
    // Sized to the BATCH_003 E03 art (about 104 px square when drawn).
    makePart({ id: "core", kind: "core", shape: { type: "rect", hw: 42, hh: 34 }, hp: 100 * hpMul, selectable: true }),
    // Frontal shield plate faces the player (down the screen).
    makePart({ id: "shield", kind: "armor", shape: { type: "rect", hw: 40, hh: 6 }, offset: { x: 0, y: 41 }, hp: 50 }),
    // Exposed rear-side joint: breaking it disables the shield (ATTACK_LIBRARY).
    makePart({ id: "joint", kind: "joint", shape: { type: "circle", r: 11 }, offset: { x: 54 * dir * -1, y: -30 }, hp: 30, selectable: true }),
  ];
  return e;
}

export interface SpawnSpec { path: Vec[]; speed: number; wobble: number; index: number }

export const HAZARD_NODE_ROW: EnemyRow = {
  id: "HZNODE", name: { th: "เครื่องกำเนิดซากลอย", en: "Wreck launcher" }, role: "hazard_node", attack_model: "none", movement: "hold",
  base_hp: 160, base_damage: 0, speed: 120, telegraph_sec: 0.6, threat_cost: 0, xp: 0, asset_id: "hazard_HZ02", counter: "destroy it to stop the wreck drift",
};

export const SUPPLY_ROW: EnemyRow = {
  id: "SUPPLY", name: { th: "จุดส่งกำลัง", en: "Supply node" }, role: "supply", attack_model: "none", movement: "drift",
  base_hp: 60, base_damage: 0, speed: 50, telegraph_sec: 0, threat_cost: 0, xp: 0, asset_id: "", counter: "shoot before it drifts away",
};

// Campaign enemy built from its catalog row; colliders are sized to the BATCH_003 art.
export function makeElite(e: Enemy): void {
  for (const p of e.parts) if (p.kind === "core") { p.hp *= ELITE_HP_MUL; p.hpMax = p.hp; }
  e.score *= 3; e.charge *= 2; e.credits *= 2;
  e.elite = { ring: 1.6 + e.spawnIndex * 0.2 };
}

export function makeDirected(id: string, row: EnemyRow, spec: SpawnSpec, tag: string): Enemy {
  const start = spec.path[0];
  const dir = spec.path.length > 1 && spec.path[1].x < start.x ? -1 : 1;
  const role: Enemy["role"] = ({ E01: "scout", E02: "interceptor", E03: "shield", E04: "cargo", E21: "thief", SUPPLY: "supply", HZNODE: "hazard_node" } as Record<string, Enemy["role"]>)[row.id] ?? "scout";
  const e = base(id, row, role, start, tag, spec.index, dir);
  e.path = spec.path.map((p) => ({ ...p }));
  e.pathI = 1;
  e.speed = spec.speed;
  e.wobble = spec.wobble;
  e.wobblePhase = spec.index * 1.3;
  e.fireTimer = 1.0 + spec.index * 0.3;
  switch (role) {
    case "scout":
      e.parts = [makePart({ id: "core", kind: "core", shape: { type: "circle", r: 20 }, hp: row.base_hp, selectable: true })];
      break;
    case "interceptor":
      e.charge = 2; e.credits = 8; e.scrap = 1; e.score = 150;
      e.parts = [makePart({ id: "core", kind: "core", shape: { type: "circle", r: 22 }, hp: row.base_hp, selectable: true })];
      break;
    case "shield":
      e.charge = 3; e.credits = 15; e.scrap = 3; e.score = 300;
      e.parts = [
        makePart({ id: "core", kind: "core", shape: { type: "rect", hw: 42, hh: 34 }, hp: row.base_hp, selectable: true }),
        makePart({ id: "shield", kind: "armor", shape: { type: "rect", hw: 40, hh: 6 }, offset: { x: 0, y: 41 }, hp: 50 }),
        makePart({ id: "joint", kind: "joint", shape: { type: "circle", r: 11 }, offset: { x: 54 * dir * -1, y: -30 }, hp: 30, selectable: true }),
      ];
      break;
    case "cargo":
      // Two fuel tanks (core: shooting them sets off the fuel) either side of the
      // engine block (joint 25 HP: breaking it frees the cargo module intact).
      e.charge = 2; e.credits = 10; e.scrap = 2; e.score = 200; e.fireTimer = Infinity;
      e.parts = [
        makePart({ id: "core", kind: "core", shape: { type: "chain", r: 27, points: [{ x: -43, y: -3 }, { x: 43, y: -3 }] }, hp: row.base_hp, selectable: true }),
        makePart({ id: "engine", kind: "joint", shape: { type: "rect", hw: 15, hh: 42 }, hp: 25, selectable: true }),
      ];
      break;
    case "thief":
      // Loot Snatcher: no damaging attack; tractors loose or towed salvage (2 s beam).
      e.charge = 2; e.credits = 10; e.scrap = 1; e.score = 250; e.fireTimer = Infinity;
      e.steal = { target: null, beam: 0, carrying: null, idle: 0 };
      e.parts = [makePart({ id: "core", kind: "core", shape: { type: "circle", r: 24 }, hp: row.base_hp, selectable: true })];
      break;
    case "hazard_node":
      e.charge = 3; e.credits = 15; e.scrap = 3; e.score = 400; e.fireTimer = 0.9; e.holdAtEnd = true;
      e.parts = [makePart({ id: "core", kind: "core", shape: { type: "rect", hw: 26, hh: 40 }, hp: row.base_hp, selectable: true })];
      break;
    case "supply":
      e.charge = 2; e.credits = 10; e.scrap = 2; e.score = 250; e.fireTimer = Infinity;
      e.parts = [makePart({ id: "core", kind: "core", shape: { type: "rect", hw: 30, hh: 30 }, hp: row.base_hp, selectable: true })];
      break;
    default:
      break;
  }
  return e;
}

const SCOUT_TELEGRAPH = 0.4;
export const ELITE_HP_MUL = 2.5;
export const ELITE_RING_EVERY = 3.4;
export const ELITE_RING_WARN = 0.6;
export const CHILL_SLOW = 0.5; // frost: half movement speed
export const ION_SLOW = 0.5;   // ion: half firing cadence
export const VOLLEY_WARN = 0.4;
export const VOLLEY_SHOTS = 3;
export const VOLLEY_GAP = 0.12;
export const VOLLEY_EVERY = 2;

// Elite ring: 12-way burst with a 3-slot gap toward the player, after a 0.6 s warning.
function eliteRing(e: Enemy, dt: number, em: Emitter, target: Vec): void {
  const el = e.elite!;
  const onScreen = e.pos.x > 40 && e.pos.x < 680 && e.pos.y > 140 && e.pos.y < 900;
  el.ring -= dt * (e.status && e.status.ion > 0 ? ION_SLOW : 1);
  if (el.ring <= 0) {
    el.ring = ELITE_RING_EVERY;
    if (onScreen) ringGap(em, { ...e.pos }, Math.atan2(target.y - e.pos.y, target.x - e.pos.x) / (Math.PI / 180), 12, 3, 170, 6, 9);
  }
}

// Follow the path along a base track; the visible position adds the wobble.
function followPath(e: Enemy, dt: number): void {
  const path = e.path!;
  let budget = e.speed * dt * (e.status && e.status.chill > 0 ? CHILL_SLOW : 1);
  let p = e.track;
  while (budget > 0 && e.pathI < path.length) {
    const to = path[e.pathI];
    const dx = to.x - p.x, dy = to.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) { p = { ...to }; budget -= d; e.pathI++; }
    else { p = { x: p.x + (dx / d) * budget, y: p.y + (dy / d) * budget }; budget = 0; }
  }
  e.track = p;
  if (e.pathI >= path.length) {
    if (e.holdAtEnd) { e.pos = { ...p }; return; }
    e.leftArena = true; return;
  }
  const a = path[e.pathI - 1], b = path[e.pathI];
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const s = e.wobble ? Math.sin(e.age * 2.2 + e.wobblePhase) * e.wobble : 0;
  e.pos = { x: p.x - ((b.y - a.y) / d) * s, y: p.y + ((b.x - a.x) / d) * s };
}

export function updateEnemy(e: Enemy, dt: number, em: Emitter, target: Vec = { x: 360, y: 900 }): void {
  e.prev = { ...e.pos };
  e.age += dt;
  if (e.path) {
    followPath(e, dt);
    if (e.leftArena) return;
    updateFire(e, dt, em, target);
    return;
  }
  if (e.role === "scout") {
    e.pos.x += e.dir * 120 * dt * (e.status && e.status.chill > 0 ? CHILL_SLOW : 1);
    e.pos.y = e.baseY + 22 * e.age + Math.sin(e.age * 2.2 + e.spawnIndex) * 46;
  } else if (e.role === "shield") {
    e.pos.x += e.dir * 55 * dt * (e.status && e.status.chill > 0 ? CHILL_SLOW : 1);
  }
  if (e.pos.x < -140 || e.pos.x > 860 || e.pos.y > 1360) { e.leftArena = true; return; }
  updateFire(e, dt, em, target);
}

function updateFire(e: Enemy, dt: number, em: Emitter, target: Vec): void {
  if (e.elite) eliteRing(e, dt, em, target);
  const onScreen = e.pos.x > 24 && e.pos.x < 696 && e.pos.y > 30 && e.pos.y < 1000;
  if (e.role === "cargo" || e.role === "supply" || e.role === "thief" || e.role === "hazard_node") return; // no damaging attack (body contact still hurts)
  const warn = e.role === "interceptor" ? VOLLEY_WARN : SCOUT_TELEGRAPH;
  const wasWarning = e.telegraph > 0;
  e.fireTimer -= dt * (e.status && e.status.ion > 0 ? ION_SLOW : 1);
  e.telegraph = e.fireTimer <= warn && e.fireTimer > 0 && onScreen ? e.fireTimer : 0;
  // aimed_volley: the aim is sampled when the warning starts and never retargets.
  if (e.role === "interceptor" && e.telegraph > 0 && !wasWarning) e.aim = { ...target };
  if (e.fireTimer <= 0) {
    if (onScreen) {
      if (e.role === "scout") { e.burstLeft = 3; e.burstTimer = 0; }
      else if (e.role === "interceptor") { e.burstLeft = VOLLEY_SHOTS; e.burstTimer = 0; if (!e.aim) e.aim = { ...target }; }
      else fan(em, { x: e.pos.x, y: e.pos.y + 34 }, 90, 5, 60, 210, 5, 10);
    }
    e.fireTimer = e.role === "scout" ? 1.8 : e.role === "interceptor" ? VOLLEY_EVERY : 2.5;
  }
  if (e.burstLeft > 0) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      if (e.role === "interceptor") aimed(em, { x: e.pos.x, y: e.pos.y + 20 }, e.aim ?? target, 230, 5, 8);
      else straight(em, { x: e.pos.x, y: e.pos.y + 18 }, 90, 250, 4, 6);
      e.burstLeft--;
      e.burstTimer = e.role === "interceptor" ? VOLLEY_GAP : 0.1;
      if (e.burstLeft === 0) e.aim = null;
    }
  }
}
