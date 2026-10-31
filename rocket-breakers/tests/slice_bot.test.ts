// M1 gate as an automated playthrough: the bot uses only player inputs (move,
// lock, tractor, dock choices). The player is invulnerable so the bot needn't
// dodge — this proves the salvage loop, not difficulty or feel.
import { describe, expect, it } from "vitest";
import { applySettlement, computeSettlement } from "../src/campaign/settlement";
import { MemoryStore, SaveRepository } from "../src/save/saveRepository";
import { catalog, world } from "./helpers";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Vec } from "../src/core/geometry";

function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function botInput(w: CombatWorld, log: { tailActionsAfterSever: number; plasmaShots: number }): TickInput {
  const b = w.boss;
  const cargo = b?.item;
  if (!b || !b.e.alive) {
    const target = w.enemies[0];
    return { move: steer(w, { x: target ? target.pos.x : 360, y: 860 }), fire: true };
  }
  if (b.signatureRemoved && b.action && ["tail_sweep", "tail_vent"].includes(b.action.name)) log.tailActionsAfterSever++;
  if (cargo && (cargo.state === "detached_intact" || cargo.state === "acquiring")) {
    return { move: steer(w, { x: cargo.pos.x, y: cargo.pos.y + 90 }), tractorHeld: true, fire: true };
  }
  if (w.enemies.length) return { move: steer(w, { x: w.enemies[0].pos.x, y: 900 }), fire: true };
  if (!b.signatureRemoved) {
    if (b.jointExposed) {
      w.lock = { enemyId: b.e.id, partId: "tail_joint" };
      return { move: steer(w, { x: b.e.pos.x + b.joint.offset.x, y: 820 }), fire: true };
    }
    // Hold fire while waiting so the tail stays intact (reckless fire scraps it).
    return { move: steer(w, { x: b.e.pos.x + b.joint.offset.x, y: 820 }), fire: false };
  }
  w.lock = { enemyId: b.e.id, partId: "core" };
  return { move: steer(w, { x: b.e.pos.x - 30, y: 860 }), fire: true };
}

describe("SLICE-01 salvage loop (M1 gate)", () => {
  it("break joint → tow → fit → use stolen attack → boss loses tail → win → bank exactly 1 fragment → reload", () => {
    const w = world({ invulnerable: true, seed: 3 });
    const log = { tailActionsAfterSever: 0, plasmaShots: 0 };
    let docked = false;
    for (let i = 0; i < 60 * 300 && w.status === "running"; i++) {
      if (w.dock) {
        const origin = w.assembly.suggestOrigins(w.dockWeapon()!)[0];
        expect(w.dockFit(origin)).toBeNull();
        expect(w.endDock()).toBe(true);
        docked = true;
        continue;
      }
      const before = w.friendly.items.filter((x) => x.alive && x.model === "plasma").map((x) => x.id);
      w.step(botInput(w, log));
      log.plasmaShots += w.friendly.items.filter((x) => x.alive && x.model === "plasma" && !before.includes(x.id)).length;
    }
    expect(w.status).toBe("victory");
    expect(docked).toBe(true);
    expect(w.boss!.item.state).toBe("banked");
    expect(w.assembly.modules.some((m) => m.weapon.id === "W022")).toBe(true);
    expect(log.plasmaShots).toBeGreaterThan(3);
    expect(log.tailActionsAfterSever).toBe(0);
    expect(w.result!.stolen).toEqual(["B02"]);

    const store = new MemoryStore();
    const repo = new SaveRepository(store);
    const profile = repo.load().profile;
    const s = computeSettlement(profile, w.result!, (id) => catalog.boss(id).signature_weapon_id);
    applySettlement(profile, s);
    repo.save(profile);
    const reloaded = new SaveRepository(store).load().profile;
    expect(reloaded.blueprint_fragments).toEqual({ W022: 1 });
    expect(reloaded.boss_archive.B02).toEqual({ severed: 1, stolen: 1, cleared: true });
    expect(reloaded.test_records["SLICE-01"].clears).toBe(1);
  });
});
