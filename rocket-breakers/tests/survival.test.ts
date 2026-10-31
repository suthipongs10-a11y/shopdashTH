// Survival mode + hangar upgrades (owner experiment A + B).
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { buyUpgrade, equippableWeapons, shipMods, UPGRADES, upgradeCost } from "../src/campaign/upgrades";
import { applySettlement, computeSettlement } from "../src/campaign/settlement";
import { defaultProfile } from "../src/save/profile";
import { rollChoices, xpToNext } from "../src/combat/survival";
import { Rng } from "../src/core/rng";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

const sig = (id: string) => catalog.row<{ signature_weapon_id: string }>("bosses", id)?.signature_weapon_id ?? "";

describe("hangar", () => {
  it("buys upgrades with credits and applies them to the ship", () => {
    const p = defaultProfile();
    p.credits = 10000;
    expect(buyUpgrade(p, "hull")).toBeNull();
    expect(buyUpgrade(p, "guns")).toBeNull();
    expect(p.credits).toBe(10000 - upgradeCost(UPGRADES[0], 0) - upgradeCost(UPGRADES[2], 0));
    const w = world({ mods: shipMods(p) });
    expect(w.hpMax).toBe(catalog.hull("H01").hp + 20);
    expect(w.damageMul).toBeCloseTo(1.08);
  });
  it("refuses when broke or maxed", () => {
    const p = defaultProfile();
    expect(buyUpgrade(p, "hull")).toBe("hangar.error.credits");
    p.credits = 1e6;
    for (let i = 0; i < 5; i++) buyUpgrade(p, "hull");
    expect(buyUpgrade(p, "hull")).toBe("hangar.error.max");
  });
  it("researched guns and completed blueprints become launch options", () => {
    const p = defaultProfile();
    expect(equippableWeapons(catalog, p)).toEqual([]);
    p.weapon_research.W011 = 1; p.blueprint_fragments.W022 = 3;
    expect(equippableWeapons(catalog, p)).toEqual(["W011", "W022"]);
    p.equipped_weapon = "W011";
    const w = world({ mods: shipMods(p) });
    expect(w.assembly.modules.some((m) => m.weapon.id === "W011")).toBe(true);
  });
});

describe("survival", () => {
  it("offers three distinct picks with at least one gun", () => {
    const c = rollChoices(new Rng(5), ["W001", "W008"]);
    expect(c).toHaveLength(3);
    expect(c.some((x) => x.kind === "weapon")).toBe(true);
    expect(new Set(c.map((x) => x.id)).size).toBe(3);
  });

  function steer(w: CombatWorld, to: Vec): Vec {
    const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
    return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
  }
  function bot(w: CombatWorld): TickInput {
    const part = w.items.find((i) => i.sourceEncounter !== "player" && !i.heldBy && i.state === "detached_intact");
    if (part) return { move: steer(w, { x: part.pos.x, y: part.pos.y + 120 }), tractorTap: !!w.tractorCandidate(), fire: true };
    const t = w.enemies.find((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
    const b = w.boss;
    if (b && b.e.alive && !b.signatureRemoved && (!t)) {
      if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: b.joint.id };
      return { move: steer(w, { x: b.e.pos.x + b.joint.offset.x, y: 860 }), fire: true };
    }
    if (t) { w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" }; return { move: steer(w, { x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), fire: true }; }
    return { move: steer(w, { x: 360, y: 900 }), fire: true };
  }

  it("runs, levels up through picks, meets a boss on the timer, and settles credits + best time", () => {
    const w = world({ mode: "survival", salvageMode: "quick", invulnerable: true, runId: "sv1", seed: 3 });
    let picks = 0, bossSeen = false;
    for (let i = 0; i < 60 * 200; i++) {
      if (w.levelUp) { w.chooseLevelUp(0); picks++; continue; }
      w.step(bot(w));
      if (w.boss) bossSeen = true;
    }
    expect(w.status).toBe("running"); // invulnerable: never ends on its own
    expect(picks).toBeGreaterThanOrEqual(3);
    expect(w.level).toBe(picks + 1 + (w.levelUp ? 1 : 0) - (w.levelUp ? 1 : 0));
    expect(bossSeen).toBe(true);
    expect(xpToNext(1)).toBeGreaterThan(0);
    // die → results
    w.opts.invulnerable = false;
    w.hp = 0; w.step({ move: { x: 0, y: 0 }, fire: false });
    expect(w.status).toBe("defeat");
    const r = w.result!;
    expect(r.missionId).toBe("SURVIVAL");
    expect(r.survival!.sec).toBeGreaterThanOrEqual(199);
    const p = defaultProfile();
    const s = computeSettlement(p, r, sig);
    expect(s.credits).toBeGreaterThan(250);
    applySettlement(p, s);
    expect(p.survival_best).toBe(r.survival!.sec);
  });

  it("a non-invulnerable run eventually ends (it is a real challenge)", () => {
    const w = world({ mode: "survival", salvageMode: "quick", runId: "sv2", seed: 9 });
    let i = 0;
    for (; i < 60 * 900 && w.status === "running"; i++) {
      if (w.levelUp) { w.chooseLevelUp(0); continue; }
      w.step(bot(w));
    }
    expect(w.status).toBe("defeat");
    expect(i / 60).toBeGreaterThan(60); // but not instantly
  });
});
