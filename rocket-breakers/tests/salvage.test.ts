import { describe, expect, it } from "vitest";
import { canTransition, makeItem, transition } from "../src/salvage/salvage";
import { toBossFight, world } from "./helpers";
import type { CombatWorld } from "../src/combat/world";

const idle = { move: { x: 0, y: 0 }, fire: false };

function forceVent(w: CombatWorld): void {
  // Run until the tail joint is exposed by the vent behaviour.
  for (let i = 0; i < 60 * 40 && !w.boss!.jointExposed; i++) w.step(idle);
  if (!w.boss!.jointExposed) throw new Error("joint never exposed");
}

describe("salvage state machine", () => {
  it("rejects illegal transitions and replays", () => {
    const it0 = makeItem("r:B02:tail", "W022", "B02", "tail", 115, 7);
    expect(transition(it0, "towed", "t1", 1)).toBe(false);
    expect(transition(it0, "detached_intact", "t2", 1)).toBe(true);
    expect(transition(it0, "acquiring", "t2", 2)).toBe(false); // same tx replayed
    expect(canTransition("banked", "fitted_run")).toBe(false);
  });
});

describe("selective dismantling (B02)", () => {
  it("joint exposure lasts the full 2.5 s vent window", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    forceVent(w);
    let open = 0;
    while (w.boss!.jointExposed) { w.step(idle); open++; }
    expect(open / 60).toBeGreaterThanOrEqual(2.45);
  });

  it("joint broken at 35% integrity detaches intact; 34.99% becomes scrap", () => {
    for (const [frac, expected] of [[0.35, "detached_intact"], [0.3499, "damaged_scrap"]] as const) {
      const w = world({ invulnerable: true, startAt: "boss" });
      toBossFight(w);
      forceVent(w);
      const b = w.boss!;
      b.tail.integrity = b.tail.integrityMax * frac;
      w.damagePart(b.e, b.joint, 1000, b.e.pos);
      w.step(idle);
      expect(b.item.state).toBe(expected);
      expect(b.signatureRemoved).toBe(true);
    }
  });

  it("reckless fire on the tail body destroys the loot and still removes the attack", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    const b = w.boss!;
    // stray hits only chip it (25%)...
    for (let i = 0; i < 20; i++) w.damagePart(b.e, b.tail, 8, b.stingerWorld());
    expect(b.tail.integrity).toBeGreaterThan(b.tail.integrityMax * 0.5);
    // ...but deliberately locking and firing on the tail body still destroys the loot
    w.lock = { enemyId: b.e.id, partId: b.tail.id };
    for (let i = 0; i < 20; i++) w.damagePart(b.e, b.tail, 8, b.stingerWorld());
    w.step(idle);
    expect(b.item.state).toBe("destroyed_scrap");
    expect(w.items.filter((x) => x.state === "detached_intact")).toHaveLength(0);
    expect(w.hints).toContain("hint.scrap");
  });

  it("stolen tail permanently removes tail attacks; compensation starts once even with HP crossing the same tick", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    forceVent(w);
    const b = w.boss!;
    b.core.hp = b.core.hpMax * 0.59; // HP threshold and sever on the same tick
    w.damagePart(b.e, b.joint, 1000, b.e.pos);
    w.step(idle);
    expect(b.phase).toBe(2);
    expect(b.transition).toBeLessThanOrEqual(2);
    const seen = new Set<string>();
    b.endLull();
    for (let i = 0; i < 60 * 30; i++) { w.step(idle); if (b.action) seen.add(b.action.name); }
    expect(seen.has("tail_sweep")).toBe(false);
    expect(seen.has("tail_vent")).toBe(false);
    expect(seen.has("claw_ring")).toBe(true);
    expect(seen.has("lateral_charge")).toBe(true);
    expect(w.events.filter((e) => e.type === "phase" && e.value === 2).length).toBeLessThanOrEqual(1);
  });

  it("core death with the tail attached scraps it — no loot for blasting the core", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    const b = w.boss!;
    w.damagePart(b.e, b.core, 1e6, b.e.pos);
    w.step(idle);
    expect(b.e.alive).toBe(false);
    expect(b.item.state).toBe("destroyed_scrap");
  });

  it("tow snap keeps remaining lifetime/invulnerability and leaves one owner", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    forceVent(w);
    const b = w.boss!;
    w.damagePart(b.e, b.joint, 1000, b.e.pos);
    w.step(idle);
    const item = b.item;
    item.pos = { x: 360, y: 700 }; // move the part into open space, away from the boss body
    item.vel = { x: 0, y: 0 };
    w.motion.pos = { x: item.pos.x, y: item.pos.y + 80 };
    for (let i = 0; i < 60 && w.tow?.towing !== true; i++) {
      w.motion.pos = { x: item.pos.x, y: item.pos.y + 80 };
      w.step({ ...idle, tractorHeld: true });
    }
    expect(item.state).toBe("towed");
    const lifeBefore = item.lifetime;
    const invulnBefore = item.invuln;
    item.pos = { x: w.motion.pos.x, y: w.motion.pos.y + 600 }; // drag far past cable max
    for (let i = 0; i < 60 && item.state === "towed"; i++) { w.step(idle); item.pos = { x: w.motion.pos.x, y: w.motion.pos.y + 600 }; }
    expect(item.state).toBe("detached_intact");
    expect(item.lifetime).toBeLessThanOrEqual(lifeBefore);
    expect(item.invuln).toBeLessThanOrEqual(invulnBefore); // snap never re-grants invulnerability
    expect(w.items.filter((x) => x.instanceId === item.instanceId)).toHaveLength(1);
  });

  it("invalid fitting at the dock returns an error and loses nothing", () => {
    const w = world({ invulnerable: true, startAt: "boss" });
    toBossFight(w);
    forceVent(w);
    const b = w.boss!;
    w.damagePart(b.e, b.joint, 1000, b.e.pos);
    w.step(idle);
    b.item.state = "towed";
    w.tow = { itemId: b.item.instanceId, progress: 1, overLength: 0, towing: true, releaseArmed: 0 };
    w.enemies = [];
    for (let i = 0; i < 10 && !w.dock; i++) w.step(idle); // sever hitstop freezes a few ticks
    expect(w.dock).not.toBeNull();
    expect(w.dockFit([2, 4])).toBe("fit.error.overlap");
    expect(w.assembly.modules).toHaveLength(2);
    expect(w.endDock()).toBe(false); // must decide first
    expect(w.dockFit([4, 4])).toBeNull();
    expect(w.assembly.modules).toHaveLength(3);
    expect(w.endDock()).toBe(true);
    expect(w.grace).toBeGreaterThan(0);
  });
});

describe("player damage", () => {
  it("one bullet over core and module applies one damage transaction", () => {
    const w = world({ startAt: "boss" });
    w.shield = 0;
    const p = w.motion.pos;
    w.hostile.spawn("hostile", p.x, p.y - 30, 0, 600, 10, 10);
    const hp = w.hp;
    w.step(idle);
    w.step(idle);
    expect(hp - w.hp).toBeLessThanOrEqual(10);
    expect(w.events.filter((e) => e.type === "player_hit")).toHaveLength(1);
  });
  it("shield absorbs first and invulnerability blocks the follow-up", () => {
    const w = world({ startAt: "boss" });
    const p = w.motion.pos;
    w.hostile.spawn("hostile", p.x, p.y - 20, 0, 600, 5, 10);
    w.hostile.spawn("hostile", p.x, p.y - 40, 0, 600, 5, 10);
    w.step(idle); w.step(idle); w.step(idle);
    expect(w.hp).toBe(w.hpMax);
    expect(w.shield).toBe(15);
  });
});
