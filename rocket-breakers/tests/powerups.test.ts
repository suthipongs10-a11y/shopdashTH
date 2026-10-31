import { describe, expect, it } from "vitest";
import { BuffManager, DropDirector, PICKUPS, choosePickup, pickupDef } from "../src/combat/powerups";
import { Rng } from "../src/core/rng";
import { world } from "./helpers";
import { makeItem } from "../src/salvage/salvage";

const idle = { move: { x: 0, y: 0 }, fire: false };
const collect = (w: ReturnType<typeof world>, id: string) => {
  w.spawnPickup(id, { ...w.motion.pos });
  w.step(idle);
};

describe("power-ups (expansion 1.1)", () => {
  it("uses the 12 authoritative pickup ids", () => {
    expect(PICKUPS.map((p) => p.id)).toEqual(["PU01", "PU02", "PU03", "PU04", "PU05", "PU06", "PU07", "PU08", "PU09", "PU10", "PU11", "PU12"]);
  });
  it("same timed buff refreshes duration instead of stacking", () => {
    const b = new BuffManager();
    b.apply(pickupDef("PU01"));
    b.tick(5);
    b.apply(pickupDef("PU01"));
    expect(b.remaining.get("PU01")).toBe(8);
    b.tick(8.01);
    expect(b.has("PU01")).toBe(false);
  });
  it("triple shot adds exactly 2 side shots at 40% damage, no recursion", () => {
    const w = world({ startAt: "boss" });
    collect(w, "PU01");
    expect(w.buffs.has("PU01")).toBe(true);
    let kinetic = 0, side = 0;
    for (let i = 0; i < 60; i++) {
      const before = new Set(w.friendly.items.filter((b) => b.alive).map((b) => b.id));
      w.step({ ...idle, fire: true });
      for (const b of w.friendly.items) if (b.alive && !before.has(b.id) && b.model === "kinetic") { kinetic++; if (b.dmg < 8) side++; }
    }
    expect(kinetic).toBe(24); // 8 W001 triggers × (1 centre + 2 sides)
    expect(side).toBe(16);
  });
  it("shield restores, overflows into a capped 10 s overshield and never grants invulnerability", () => {
    const w = world({ startAt: "boss" });
    w.shield = 10;
    collect(w, "PU05");
    expect(w.shield).toBe(25);
    expect(w.overshield).toBe(10);
    expect(w.playerInvulnerable).toBe(false);
    for (let i = 0; i < 60 * 10 + 5; i++) { w.pickups.length = 0; w.step(idle); } // isolate from authored drops
    expect(w.overshield).toBe(0);
  });
  it("repair heals core but does not erase recorded core damage", () => {
    const w = world({ startAt: "boss" });
    w.shield = 0;
    w.applyPlayerHit(30, "core", w.motion.pos);
    const recorded = w.coreDamageTaken;
    collect(w, "PU06");
    expect(w.hp).toBe(90);
    expect(w.coreDamageTaken).toBe(recorded);
  });
  it("coolant cuts heat but cannot bypass the 0.8 s minimum heat lock", () => {
    const w = world({ startAt: "boss" });
    const m = w.weapons.mounts[0];
    m.heat = 100; m.locked = true; m.lockTime = 0;
    collect(w, "PU08");
    expect(m.heat).toBeLessThanOrEqual(65);
    expect(m.locked).toBe(true);
    for (let i = 0; i < 30; i++) w.step(idle);
    expect(m.locked).toBe(true); // 0.5 s < 0.8 s minimum
  });
  it("overdrive cell adds 25 capped at 100 without activating", () => {
    const w = world({ startAt: "boss" });
    w.overdriveCharge = 90;
    collect(w, "PU09");
    expect(w.overdriveCharge).toBe(100);
    expect(w.overdriveLeft).toBe(0);
  });
  it("magnet pulls scrap motes but leaves signature salvage alone", () => {
    const w = world({ startAt: "boss" });
    collect(w, "PU07");
    w.motes.push({ id: 999, pos: { x: w.motion.pos.x + 180, y: w.motion.pos.y }, prev: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, value: 3, life: 8 });
    const sig = makeItem("t:B02:tail", "W022", "B02", "tail", 115, 7);
    sig.state = "detached_intact";
    sig.pos = { x: w.motion.pos.x - 150, y: w.motion.pos.y + 60 };
    w.items.push(sig);
    const sigStart = { ...sig.pos };
    const scrapBefore = w.combatScrap;
    for (let i = 0; i < 40; i++) w.step(idle);
    expect(w.combatScrap).toBe(scrapBefore + 3);
    expect(sig.pos).toEqual(sigStart); // salvage is never magnetised
  });
  it("incompatible offensive pickup converts to +10 Overdrive exactly once", () => {
    const w = world({ startAt: "boss" });
    const beam = w.assembly.modules.find((m) => m.weapon.family === "beam")!;
    w.assembly.remove(beam.instanceId);
    w.refreshAssembly();
    collect(w, "PU02");
    expect(w.overdriveCharge).toBe(10);
    expect(w.buffs.has("PU02")).toBe(false);
    w.step(idle);
    expect(w.overdriveCharge).toBe(10);
  });
  it("scrap cache only adds to the unbanked ledger", () => {
    const w = world({ startAt: "boss" });
    collect(w, "PU12");
    expect(w.combatScrap).toBe(15);
  });
  it("drop accumulator: one drop per 25 ordinary kills, elites +0.25, one proc per source", () => {
    const d = new DropDirector();
    let drops = 0;
    for (let i = 0; i < 50; i++) if (d.onKill(`e${i}`, false)) drops++;
    expect(drops).toBe(2);
    expect(d.onKill("e1", false)).toBe(false);
    const e = new DropDirector();
    expect([1, 2, 3, 4].map((i) => e.onKill(`x${i}`, true)).filter(Boolean)).toHaveLength(1);
  });
  it("weighted choice is deterministic and only offers compatible implemented pickups", () => {
    const a = new Rng(5), b = new Rng(5);
    const seqA = Array.from({ length: 20 }, () => choosePickup(a, (id) => id !== "PU02", false));
    const seqB = Array.from({ length: 20 }, () => choosePickup(b, (id) => id !== "PU02", false));
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toContain("PU02");
    expect(seqA).not.toContain("PU11");
  });
  it("live pickup cap queues extra drops instead of erasing", () => {
    const w = world({ startAt: "boss" });
    for (let i = 0; i < 8; i++) w.spawnPickup("PU09", { x: 100, y: 200 });
    expect(w.pickups).toHaveLength(6);
  });
});

describe("authored drop guarantees", () => {
  it("an offensive pickup appears within 30 s even if no enemy is killed", () => {
    const w = world();
    let seen: string | null = null;
    for (let i = 0; i < 60 * 30 && !seen; i++) {
      w.step({ move: { x: 0, y: 0 }, fire: false });
      seen = w.pickups.find((p) => p.defId === "PU01")?.defId ?? null;
    }
    expect(seen).toBe("PU01");
  });
});
