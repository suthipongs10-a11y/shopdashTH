// Enemy assemblies are made of distinct parts: core, armor, joint and module
// (AGENTS §9). Each part has its own collider and an explicit priority so the
// visible target is the one actually hit. Joint HP and module integrity are separate.
import { segmentCircleT, segmentRectT, type Vec } from "../core/geometry";

export type PartKind = "core" | "armor" | "joint" | "module";
export type Shape =
  | { type: "circle"; r: number }
  | { type: "rect"; hw: number; hh: number }
  | { type: "chain"; r: number; points: Vec[] }; // several circles (segmented tail)

export const PRIORITY: Record<PartKind, number> = { armor: 4, joint: 3, module: 2, core: 1 };

export interface Part {
  id: string;
  kind: PartKind;
  shape: Shape;
  offset: Vec;          // relative to the owning entity, may animate
  hp: number;           // core HP / joint HP / armor HP
  hpMax: number;
  integrity: number;    // modules only
  integrityMax: number;
  active: boolean;      // present and collidable
  invulnerable: boolean; // closed armor absorbs without damage
  selectable: boolean;  // can be target-locked right now
  flash: number;        // visual hit flash timer
  noContact?: boolean;  // excluded from ship-vs-body contact (damages through its own attack instead)
}

export function makePart(p: Partial<Part> & Pick<Part, "id" | "kind" | "shape">): Part {
  return {
    offset: { x: 0, y: 0 }, hp: 1, hpMax: p.hp ?? 1, integrity: 0, integrityMax: p.integrity ?? 0,
    active: true, invulnerable: false, selectable: false, flash: 0, ...p,
  };
}

// Entry fraction along segment a->b into the part placed at `origin`, or -1.
export function partEntryT(part: Part, origin: Vec, a: Vec, b: Vec, pad: number): number {
  const c = { x: origin.x + part.offset.x, y: origin.y + part.offset.y };
  const s = part.shape;
  if (s.type === "circle") return segmentCircleT(a, b, c, s.r + pad);
  if (s.type === "rect") return segmentRectT(a, b, c, s.hw + pad, s.hh + pad);
  let best = -1;
  for (const p of s.points) {
    const t = segmentCircleT(a, b, { x: c.x + p.x, y: c.y + p.y }, s.r + pad);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}

export function partContains(part: Part, origin: Vec, q: Vec, pad = 0): boolean {
  return partEntryT(part, origin, q, q, pad) >= 0;
}

export interface PartHit { part: Part; t: number }

// Earliest part along the path; parts entered within `tieDist` px of the first
// entry are resolved by priority (armor > joint > module > core).
export function firstPartHit(parts: Part[], origin: Vec, a: Vec, b: Vec, pad: number, tieDist = 4): PartHit | null {
  const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let best: PartHit | null = null;
  for (const part of parts) {
    if (!part.active) continue;
    const t = partEntryT(part, origin, a, b, pad);
    if (t < 0) continue;
    if (!best) { best = { part, t }; continue; }
    const closer = (best.t - t) * segLen;
    if (closer > tieDist || (Math.abs(closer) <= tieDist && PRIORITY[part.kind] > PRIORITY[best.part.kind])) best = { part, t };
  }
  return best;
}

export function partWorldPos(part: Part, origin: Vec): Vec {
  return { x: origin.x + part.offset.x, y: origin.y + part.offset.y };
}
