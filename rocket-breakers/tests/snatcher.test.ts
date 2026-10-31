// M2 stage 3: E21 Loot Snatcher and P01-04 Salvage Hunt.
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { makeDirected } from "../src/combat/enemies";
import { makeItem, transition } from "../src/salvage/salvage";
import { SNATCH_BEAM_SEC } from "../src/combat/world";
import { evaluateStars } from "../src/campaign/stars";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

const idle: TickInput = { move: { x: 0, y: 0 }, fire: false };

function setup(): CombatWorld {
  const w = world({ missionId: "P01-04", invulnerable: true });
  w.director!.done = true; // no waves: just the actors placed by the test
  const it = makeItem("t:loot", "W001", "E04", "module", 60, 3);
  transition(it, "detached_intact", "free:t", 0);
  it.pos = { x: 360, y: 500 }; it.prev = { ...it.pos }; it.vel = { x: 0, y: 0 };
  w.items.push(it);
  w.enemies.push(makeDirected("thief1", catalog.enemy("E21"), { path: [{ x: 360, y: -60 }, { x: 360, y: 230 }, { x: 600, y: 270 }, { x: 800, y: 200 }], speed: 150, wobble: 0, index: 0 }, "t"));
  return w;
}

describe("E21 Loot Snatcher", () => {
  it("tractors a loose part for 2 s, then carries it off; the part is never erased", () => {
    const w = setup();
    const it = w.items[0];
    let beamSeen = 0;
    for (let i = 0; i < 60 * 8 && !it.heldBy; i++) { w.step(idle); beamSeen = Math.max(beamSeen, w.enemies[0]?.steal?.beam ?? 0); }
    expect(it.heldBy).toBe("thief1");
    expect(beamSeen).toBeGreaterThan(SNATCH_BEAM_SEC - 0.1);
    expect(w.tractorCandidate()).toBeNull(); // can't tow it out of the snatcher's grip
    for (let i = 0; i < 60 * 10 && w.enemies.length; i++) w.step(idle);
    expect(w.enemies.length).toBe(0); // escaped
    expect(it.heldBy).toBeNull();
    expect(it.state).toBe("detached_intact"); // dropped at the top edge, not deleted
    expect(it.pos.y).toBeGreaterThan(100);
  });

  it("drops the part when shot down", () => {
    const w = setup();
    const it = w.items[0];
    for (let i = 0; i < 60 * 8 && !it.heldBy; i++) w.step(idle);
    const thief = w.enemies[0];
    w.damagePart(thief, thief.parts[0], 999, { ...thief.pos });
    w.step(idle);
    expect(thief.alive).toBe(false);
    expect(it.heldBy).toBeNull();
    expect(it.state).toBe("detached_intact");
  });

  it("can steal the part the player is towing", () => {
    const w = setup();
    const it = w.items[0];
    w.motion.pos = { x: 360, y: 620 };
    for (let i = 0; i < 60 * 3 && !w.tow?.towing; i++) w.step({ move: { x: 0, y: 0 }, tractorHeld: true, fire: false });
    expect(w.tow?.towing).toBe(true);
    for (let i = 0; i < 60 * 8 && !it.heldBy; i++) w.step({ move: { x: 0, y: 0 }, fire: false });
    expect(it.heldBy).toBe("thief1");
    expect(w.tow).toBeNull();
  });
});

describe("P01-04 stars", () => {
  const m = catalog.mission("P01-04");
  it("needs 2 intact parts and no towed part destroyed", () => {
    const base = { supplyDestroyed: 0, coreDamage: 0, interrupts: 0 };
    expect(evaluateStars(m, { ...base, securedIntact: ["W001", "W008"], cargoDestroyed: 0 }, true)).toEqual([true, true, true]);
    expect(evaluateStars(m, { ...base, securedIntact: ["W001"], cargoDestroyed: 1 }, true)).toEqual([true, false, false]);
  });
});

function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function bot(w: CombatWorld): TickInput {
  const onScreen = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
  const thief = onScreen.find((e) => e.role === "thief" && (e.steal?.beam ?? 0) > 0 || e.steal?.carrying);
  const loose = !w.tow?.towing && w.items.find((i) => i.sourceEncounter !== "player" && !i.heldBy && (i.state === "detached_intact" || i.state === "acquiring"));
  if (thief) { w.lock = { enemyId: thief.id, partId: "core" }; return { move: steer(w, { x: thief.pos.x, y: Math.min(1000, thief.pos.y + 300) }), fire: true }; }
  if (loose) return { move: steer(w, { x: loose.pos.x, y: loose.pos.y + 90 }), tractorHeld: true, fire: true };
  const t = onScreen.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine")?.active) ?? onScreen.find((e) => e.role === "thief") ?? onScreen[0];
  if (!t) return { move: steer(w, { x: 360, y: 900 }), fire: true };
  w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" };
  return { move: steer(w, { x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), fire: true };
}

describe("P01-04 playthrough (M2 stage 3 gate)", () => {
  it("brings home at least 2 intact parts despite the snatchers", () => {
    const w = world({ missionId: "P01-04", runId: "hunt1", invulnerable: true });
    for (let i = 0; i < 60 * 420 && w.status === "running"; i++) {
      if (w.dock) { const o = w.assembly.suggestOrigins(w.dockWeapon()!)[0]; if (!o || w.dockFit(o)) { if (w.dockStow()) { w.dockScrapHold(); if (w.dockStow()) w.dockScrap(); } } w.endDock(); continue; }
      w.step(bot(w));
    }
    expect(w.status).toBe("victory");
    const r = w.result!;
    expect(r.secured.filter((s) => s.intact).length).toBeGreaterThanOrEqual(2);
    expect(r.stars?.slice(0, 2)).toEqual([true, true]);
  });
});
