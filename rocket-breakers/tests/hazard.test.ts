// M2 stage 4: HZ01 Wreck Drift + hazard nodes (P01-05).
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { evaluateStars } from "../src/campaign/stars";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

const idle: TickInput = { move: { x: 0, y: 0 }, fire: false };

function toFirstNode(w: CombatWorld) {
  for (let i = 0; i < 60 * 20; i++) {
    w.step(idle);
    const n = w.enemies.find((e) => e.role === "hazard_node" && e.holdAtEnd && e.pathI >= (e.path?.length ?? 0));
    if (n) return n;
  }
  throw new Error("no parked hazard node");
}

describe("HZ01 wreck drift", () => {
  it("parked hazard nodes launch wrecks that block bullets both ways", () => {
    const w = world({ missionId: "P01-05", invulnerable: true });
    toFirstNode(w);
    for (let i = 0; i < 60 * 4 && !w.wrecks.length; i++) w.step(idle);
    expect(w.wrecks.length).toBeGreaterThan(0);
    const wr = w.wrecks[0];
    // a hostile bullet flying into the wreck from above dies on it
    w.hostile.spawn("hostile", wr.pos.x, wr.pos.y - 120, 0, 300, 5, 10, 8);
    w.friendly.spawn("kinetic", wr.pos.x, wr.pos.y + 120, 0, -900, 3, 8, 2);
    const h0 = w.hostile.active, f0 = w.friendly.active;
    for (let i = 0; i < 30; i++) w.step(idle);
    expect(w.hostile.active).toBeLessThan(h0);
    expect(w.friendly.active).toBeLessThan(f0);
  });

  it("touching a wreck pushes the ship out and counts hazard damage", () => {
    const w = world({ missionId: "P01-05" });
    toFirstNode(w);
    for (let i = 0; i < 60 * 4 && !w.wrecks.length; i++) w.step(idle);
    const wr = w.wrecks[0];
    w.motion.pos = { x: wr.pos.x, y: wr.pos.y + 10 };
    w.hitInvuln = 0; w.grace = 0;
    w.step(idle);
    expect(w.hazardHits).toBe(1);
    expect(Math.abs(w.motion.pos.x - wr.pos.x) > 30 || Math.abs(w.motion.pos.y - wr.pos.y) > 56).toBe(true);
  });

  it("destroying a node stops its launches; nodes never hold up wave clears", () => {
    const w = world({ missionId: "P01-05", invulnerable: true });
    const n = toFirstNode(w);
    w.damagePart(n, n.parts[0], 999, { ...n.pos });
    w.step(idle);
    expect(w.hazardNodesDestroyed).toBe(1);
    w.events.length = 0;
    for (let i = 0; i < 60 * 4; i++) { for (const e of w.enemies) if (e.role === "hazard_node") e.fireTimer = 99; w.step(idle); }
    // node launches announce themselves with a small blast; ambient drift does not
    expect(w.events.some((e) => e.type === "blast" && e.value === 20)).toBe(false);
  });

  it("P01-05 stars: 3 nodes and no hazard hits", () => {
    const m = catalog.mission("P01-05");
    const base = { supplyDestroyed: 0, coreDamage: 0, securedIntact: [], interrupts: 0 };
    expect(evaluateStars(m, { ...base, hazardNodes: 3, hazardHits: 0 }, true)).toEqual([true, true, true]);
    expect(evaluateStars(m, { ...base, hazardNodes: 2, hazardHits: 1 }, true)).toEqual([true, false, false]);
  });
});

function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function bot(w: CombatWorld): TickInput {
  const me = w.motion.pos;
  const threat = w.wrecks.find((r) => Math.abs(r.pos.x - me.x) < 70 && r.pos.y < me.y && me.y - r.pos.y < 260);
  if (threat) return { move: steer(w, { x: threat.pos.x < me.x ? Math.min(680, threat.pos.x + 120) : Math.max(40, threat.pos.x - 120), y: me.y }), fire: true };
  const on = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
  const t = on.find((e) => e.role === "hazard_node") ?? on[0];
  if (!t) return { move: steer(w, { x: 360, y: 900 }), tractorTap: !!w.tractorCandidate(), fire: true };
  w.lock = { enemyId: t.id, partId: "core" };
  return { move: steer(w, { x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), tractorTap: !!w.tractorCandidate(), fire: true };
}

describe("P01-05 playthrough (M2 stage 4 gate)", () => {
  it("clears and disables all three hazard nodes", () => {
    const w = world({ missionId: "P01-05", salvageMode: "quick", invulnerable: true });
    for (let i = 0; i < 60 * 400 && w.status === "running"; i++) w.step(bot(w));
    expect(w.status).toBe("victory");
    expect(w.hazardNodesDestroyed).toBe(3);
    expect(w.result!.stars?.slice(0, 2)).toEqual([true, true]);
  });
});
