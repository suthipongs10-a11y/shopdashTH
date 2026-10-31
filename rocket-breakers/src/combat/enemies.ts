// Common enemies for the salvage slice: E01 Scrap Scout and E03 Shield Barge.
// Movement and fire timing live here; damage resolution lives in the world.
import { makePart, type Part } from "./parts";
import { fan, straight, type Emitter } from "./patterns";
import type { EnemyRow } from "../core/types";
import type { Vec } from "../core/geometry";

export interface Enemy {
  id: string;
  defId: string;
  role: "scout" | "shield" | "boss";
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
}

export const coreOf = (e: Enemy): Part => e.parts.find((p) => p.kind === "core")!;

function base(id: string, row: EnemyRow, role: Enemy["role"], pos: Vec, tag: string, index: number, dir: number): Enemy {
  return {
    id, defId: row.id, role, pos: { ...pos }, prev: { ...pos }, parts: [], alive: true, armor: 0, age: 0,
    fireTimer: 1.2 + index * 0.35, burstLeft: 0, burstTimer: 0, telegraph: 0, charge: 1, credits: 5, scrap: 1,
    score: 100, spawnIndex: index, dir, baseY: pos.y, tag, leftArena: false,
  };
}

export function makeScout(id: string, row: EnemyRow, index: number, fromRight: boolean, tag: string, hpMul = 1): Enemy {
  const dir = fromRight ? -1 : 1;
  const e = base(id, row, "scout", { x: fromRight ? 770 + index * 55 : -50 - index * 55, y: 170 + index * 42 }, tag, index, dir);
  e.parts = [makePart({ id: "core", kind: "core", shape: { type: "circle", r: 17 }, hp: row.base_hp * hpMul, selectable: true })];
  return e;
}

export function makeBarge(id: string, row: EnemyRow, index: number, fromLeft: boolean, tag: string, hpMul = 1): Enemy {
  const dir = fromLeft ? 1 : -1;
  const e = base(id, row, "shield", { x: fromLeft ? -70 : 790, y: 300 + index * 110 }, tag, index, dir);
  e.charge = 3; e.credits = 15; e.scrap = 3; e.score = 300;
  e.parts = [
    makePart({ id: "core", kind: "core", shape: { type: "rect", hw: 40, hh: 20 }, hp: 100 * hpMul, selectable: true }),
    // Frontal shield plate faces the player (down the screen).
    makePart({ id: "shield", kind: "armor", shape: { type: "rect", hw: 44, hh: 6 }, offset: { x: 0, y: 27 }, hp: 50 }),
    // Exposed rear-side joint: breaking it disables the shield (ATTACK_LIBRARY).
    makePart({ id: "joint", kind: "joint", shape: { type: "circle", r: 11 }, offset: { x: 52 * dir * -1, y: -12 }, hp: 30, selectable: true }),
  ];
  return e;
}

const SCOUT_TELEGRAPH = 0.4;

export function updateEnemy(e: Enemy, dt: number, em: Emitter): void {
  e.prev = { ...e.pos };
  e.age += dt;
  if (e.role === "scout") {
    e.pos.x += e.dir * 120 * dt;
    e.pos.y = e.baseY + 22 * e.age + Math.sin(e.age * 2.2 + e.spawnIndex) * 46;
  } else if (e.role === "shield") {
    e.pos.x += e.dir * 55 * dt;
  }
  if (e.pos.x < -140 || e.pos.x > 860 || e.pos.y > 1360) { e.leftArena = true; return; }
  const onScreen = e.pos.x > 24 && e.pos.x < 696 && e.pos.y > 30 && e.pos.y < 1000;
  e.fireTimer -= dt;
  e.telegraph = e.fireTimer <= SCOUT_TELEGRAPH && e.fireTimer > 0 && onScreen ? e.fireTimer : 0;
  if (e.fireTimer <= 0) {
    if (onScreen) {
      if (e.role === "scout") { e.burstLeft = 3; e.burstTimer = 0; }
      else fan(em, { x: e.pos.x, y: e.pos.y + 34 }, 90, 5, 60, 210, 5, 10);
    }
    e.fireTimer = e.role === "scout" ? 1.8 : 2.5;
  }
  if (e.burstLeft > 0) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      straight(em, { x: e.pos.x, y: e.pos.y + 18 }, 90, 250, 4, 6);
      e.burstLeft--;
      e.burstTimer = 0.1;
    }
  }
}
