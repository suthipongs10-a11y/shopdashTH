// M2 stage 2: B01 Rivet Crab (P01-03) and the stolen W021 Rivet Claw.
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { CrabBoss, CRAB_TELEGRAPH, CLAW_OPEN } from "../src/combat/crab";
import { applySettlement, computeSettlement } from "../src/campaign/settlement";
import { defaultProfile } from "../src/save/profile";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

const sig = (id: string) => catalog.row<{ signature_weapon_id: string }>("bosses", id)?.signature_weapon_id ?? "";
const idle: TickInput = { move: { x: 0, y: 0 }, fire: false };

function toCrab(w: CombatWorld): CrabBoss {
  for (let i = 0; i < 60 * 120 && !(w.boss && !w.boss.entering); i++) {
    // clear waves quickly: kill everything that spawns
    for (const e of w.enemies) for (const p of e.parts) if (p.kind === "core") p.hp = 0;
    w.step(idle);
  }
  if (!(w.boss instanceof CrabBoss)) throw new Error("crab did not arrive");
  return w.boss;
}

describe("B01 Rivet Crab", () => {
  it("is the P01-03 encounter and opens its joint only after a claw sweep, for 2 s", () => {
    const w = world({ missionId: "P01-03", invulnerable: true });
    const b = toCrab(w);
    let openTicks = 0, sweepSeen = false, openedOutsideSweep = false;
    for (let i = 0; i < 60 * 14; i++) {
      w.step(idle);
      if (b.action?.name === "claw_sweep") sweepSeen = true;
      if (b.jointExposed) { openTicks++; if (b.action?.name !== "claw_sweep") openedOutsideSweep = true; }
    }
    expect(sweepSeen).toBe(true);
    expect(openedOutsideSweep).toBe(false);
    expect(openTicks / 60).toBeGreaterThanOrEqual(CLAW_OPEN - 0.05); // at least one full 2 s window
    expect(CRAB_TELEGRAPH).toBeGreaterThanOrEqual(catalog.boss("B01").minimum_telegraph_sec);
  });

  it("counts a claw sweep hit once per sweep for the named-attack star", () => {
    const w = world({ missionId: "P01-03" });
    const b = toCrab(w);
    // stand right under the crab, inside any sweep's reach
    let hits = 0, sweeps = 0, prev: string | null = null;
    for (let i = 0; i < 60 * 12; i++) {
      w.motion.pos = { x: b.e.pos.x + 66, y: b.e.pos.y + 230 };
      w.hp = w.hpMax;
      w.step(idle);
      const n = b.action?.name ?? null;
      if (n === "claw_sweep" && prev !== "claw_sweep") sweeps++;
      prev = n;
      hits = w.namedAttackHits;
    }
    expect(sweeps).toBeGreaterThan(0);
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThanOrEqual(sweeps);
  });

  it("severing the open joint drops the W021 claw intact and ends claw sweeps", () => {
    const w = world({ missionId: "P01-03", invulnerable: true });
    const b = toCrab(w);
    for (let i = 0; i < 60 * 10 && !b.jointExposed; i++) w.step(idle);
    expect(b.jointExposed).toBe(true);
    w.damagePart(b.e, b.joint, 999, { x: 0, y: 0 });
    w.step(idle);
    expect(b.signatureRemoved).toBe(true);
    expect(b.item.state).toBe("detached_intact");
    expect(b.item.templateId).toBe("W021");
    for (let i = 0; i < 60 * 20; i++) { w.step(idle); expect(b.action?.name).not.toBe("claw_sweep"); }
  });
});

describe("W021 Rivet Claw (stolen)", () => {
  it("catches a small hostile bullet in front and flings it back with capped damage", () => {
    const w = world({ invulnerable: true });
    const claw = catalog.weapon("W021");
    const origin = w.assembly.suggestOrigins(claw)[0];
    expect(origin).toBeTruthy();
    w.assembly.place(claw, origin, "test-claw");
    w.refreshAssembly();
    const from = w.motion.pos;
    w.hostile.spawn("hostile", from.x, from.y - 70, 0, 60, 5, 8, 8);
    const before = w.hostile.active;
    for (let i = 0; i < 90 && w.hostile.active >= before; i++) w.step({ move: { x: 0, y: 0 }, fire: true });
    expect(w.hostile.active).toBeLessThan(before);
    expect(w.events.some((e) => e.type === "deflect" && e.tag === "grab") || w.friendly.items.some((b) => b.alive && b.dmg <= 25 && b.dmg > 8)).toBe(true);
  });
});

// Automated P01-03 run: steal the claw, fit it, beat the crab.
function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function bot(w: CombatWorld): TickInput {
  const b = w.boss;
  const loose = !w.tow?.towing && w.items.find((i) => i.sourceEncounter !== "player" && (i.state === "detached_intact" || i.state === "acquiring"));
  if (loose) return { move: steer(w, { x: loose.pos.x, y: loose.pos.y + 90 }), tractorHeld: true, fire: true };
  const minors = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
  if (minors.length) {
    const t = minors.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine")?.active) ?? minors[0];
    w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" };
    return { move: steer(w, { x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), fire: true };
  }
  if (!b || !b.e.alive) return { move: steer(w, { x: 360, y: 900 }), fire: true };
  const jx = b.e.pos.x + b.joint.offset.x;
  if (!b.signatureRemoved) {
    if (b.jointExposed) { w.lock = { enemyId: b.e.id, partId: b.joint.id }; return { move: steer(w, { x: jx, y: 860 }), fire: true }; }
    return { move: steer(w, { x: jx, y: 860 }), fire: false }; // hold fire: keep the claw intact
  }
  w.lock = { enemyId: b.e.id, partId: "core" };
  return { move: steer(w, { x: b.e.pos.x, y: 880 }), fire: true };
}

describe("P01-03 playthrough (M2 stage 2 gate)", () => {
  it("steals the Rivet Claw, fits it and clears the mission", () => {
    const w = world({ missionId: "P01-03", runId: "crab1", invulnerable: true });
    let fittedW021 = false;
    for (let i = 0; i < 60 * 420 && w.status === "running"; i++) {
      if (w.dock) {
        const it = w.dockItem()!;
        const origin = w.assembly.suggestOrigins(w.dockWeapon()!)[0];
        if (origin && !w.dockFit(origin)) { if (it.templateId === "W021") fittedW021 = true; } else w.dockStow();
        w.endDock();
        continue;
      }
      w.step(bot(w));
    }
    expect(w.status).toBe("victory");
    const r = w.result!;
    expect(r.encounterIds).toEqual(["B01"]);
    expect(r.stolen).toContain("B01");
    expect(fittedW021).toBe(true);
    expect(r.stars?.[0]).toBe(true);
    expect(r.stars?.[1]).toBe(true); // secure_signature W021
    const p = defaultProfile();
    applySettlement(p, computeSettlement(p, r, sig));
    expect(p.blueprint_fragments.W021).toBe(1);
    expect(p.boss_archive.B01.stolen).toBe(1);
  });
});
