// Quick salvage (owner request): tap Tractor near a loose part → it flies in and fits itself.
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { makeItem, transition } from "../src/salvage/salvage";
import { ARMOR_OVERSHIELD, QUICK_PULL_RANGE } from "../src/combat/world";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

function loose(w: CombatWorld, template: string, at: Vec, id = "q:part"): ReturnType<typeof makeItem> {
  const it = makeItem(id, template, "E04", "module", 60, catalog.weapon(template).mass);
  transition(it, "detached_intact", `free:${id}`, 0);
  it.pos = { ...at }; it.prev = { ...at }; it.vel = { x: 0, y: 0 };
  w.items.push(it);
  return it;
}

const quiet = (w: CombatWorld) => { w.director && (w.director.done = true); };

describe("quick salvage", () => {
  it("one tap within range: the part flies in and is fitted and firing within half a second", () => {
    const w = world({ missionId: "P01-01", salvageMode: "quick", invulnerable: true });
    quiet(w);
    const p = w.motion.pos;
    const it = loose(w, "W008", { x: p.x + 150, y: p.y + 120 }); // behind and to the side: no aiming cone
    expect(Math.hypot(150, 120)).toBeLessThan(QUICK_PULL_RANGE);
    expect(w.tractorCandidate()?.instanceId).toBe(it.instanceId);
    w.step({ move: { x: 0, y: 0 }, tractorTap: true, fire: false });
    for (let i = 0; i < 30 && it.state !== "fitted_run"; i++) w.step({ move: { x: 0, y: 0 }, fire: false });
    expect(it.state).toBe("fitted_run");
    expect(w.weapons.mounts.filter((m) => m.module.weapon.id === "W008").length).toBe(2);
    expect(w.events.some((e) => e.type === "fitted" && e.value === 0)).toBe(true);
    expect(w.dock).toBeNull();
  });

  it("hull full: the newest gun swaps in for the oldest ordinary module", () => {
    const w = world({ missionId: "P01-01", salvageMode: "quick", invulnerable: true });
    quiet(w);
    const p = w.motion.pos;
    let swapped = false;
    for (let k = 0; k < 12 && !swapped; k++) {
      const it = loose(w, "W002", { x: p.x, y: p.y - 60 }, `q:${k}`);
      w.events.length = 0;
      w.step({ move: { x: 0, y: 0 }, tractorTap: true, fire: false });
      for (let i = 0; i < 30 && it.state === "acquiring"; i++) w.step({ move: { x: 0, y: 0 }, fire: false });
      swapped = w.events.some((e) => e.type === "fitted" && e.value === 3);
      if (swapped) expect(it.state).toBe("fitted_run");
    }
    expect(swapped).toBe(true);
  });

  it("only boss signatures fitted and no room at all: the part becomes armour", () => {
    const w = world({ missionId: "P01-01", salvageMode: "quick", invulnerable: true });
    quiet(w);
    const sig = catalog.weapon("W022");
    for (const m of [...w.assembly.modules]) w.assembly.remove(m.instanceId);
    for (let k = 0; k < 20; k++) { const o = w.assembly.suggestOrigins(sig)[0]; if (!o || w.assembly.place(sig, o, `sig${k}`)) break; }
    w.refreshAssembly();
    while (w.hold.length < w.holdCapacity) w.hold.push({ item: makeItem(`h${w.hold.length}`, "W001", "E04", "module", 60, 3), module: null });
    const p = w.motion.pos;
    const it = loose(w, "W011", { x: p.x, y: p.y - 60 }); // 4-cell launcher: cannot fit anywhere
    expect(w.assembly.suggestOrigins(catalog.weapon("W011")).length).toBe(0);
    w.step({ move: { x: 0, y: 0 }, tractorTap: true, fire: false });
    for (let i = 0; i < 30 && it.state === "acquiring"; i++) w.step({ move: { x: 0, y: 0 }, fire: false });
    expect(w.events.some((e) => e.type === "fitted" && e.value === 2)).toBe(true);
    expect(w.overshield).toBeGreaterThan(0);
    expect(w.overshield).toBeLessThanOrEqual(ARMOR_OVERSHIELD);
  });
});

// Bots that only tap Tractor (no tow, no dock decisions) clear the playable missions.
function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function bot(w: CombatWorld): TickInput {
  const tap = !!w.tractorCandidate();
  const part = !w.magnet && w.items.find((i) => i.sourceEncounter !== "player" && !i.heldBy && i.state === "detached_intact");
  const b = w.boss;
  if (part) return { move: steer(w, { x: part.pos.x, y: part.pos.y + 120 }), tractorTap: tap, fire: true };
  const onScreen = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
  const t = onScreen.find((e) => e.role === "thief") ?? onScreen.find((e) => e.role === "supply") ?? onScreen.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine")?.active) ?? onScreen[0];
  if (t) { w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" }; return { move: steer(w, { x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), tractorTap: tap, fire: true }; }
  if (b && b.e.alive) {
    const jx = b.e.pos.x + b.joint.offset.x;
    if (!b.signatureRemoved) {
      if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: b.joint.id };
      return { move: steer(w, { x: jx, y: 860 }), fire: b.jointExposed };
    }
    w.lock = { enemyId: b.e.id, partId: "core" };
    return { move: steer(w, { x: b.e.pos.x, y: 880 }), fire: true };
  }
  return { move: steer(w, { x: 360, y: 900 }), tractorTap: tap, fire: true };
}

describe("quick salvage playthroughs", () => {
  for (const [mission, sig] of [["P01-01", null], ["P01-03", "W021"], ["P01-04", null], ["P01-06", "W022"]] as const) {
    it(`${mission} clears with tap-only salvage${sig ? ` and steals ${sig}` : ""}`, () => {
      const w = world({ missionId: mission, salvageMode: "quick", invulnerable: true, runId: `q-${mission}` });
      let fitted = 0;
      for (let i = 0; i < 60 * 420 && w.status === "running"; i++) {
        expect(w.dock).toBeNull(); // never a dock in quick mode
        w.step(bot(w));
        fitted += w.events.filter((e) => e.type === "fitted").length;
        w.events.length = 0;
      }
      expect(w.status).toBe("victory");
      expect(fitted).toBeGreaterThan(0);
      if (sig) {
        expect(w.result!.stolen.length).toBe(1);
        expect(w.result!.secured.some((s) => s.templateId === sig && s.intact)).toBe(true);
      }
    });
  }
});
