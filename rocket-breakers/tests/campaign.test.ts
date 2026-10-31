// M2 stage 1: catalog-driven missions, new enemies, stars and campaign progress.
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { formationSpawns, missionPlayable, MissionDirector, type WaveDef } from "../src/campaign/missionDirector";
import { evaluateStars, mergeStars } from "../src/campaign/stars";
import { applySettlement, computeSettlement } from "../src/campaign/settlement";
import { missionUnlocked, researchPool } from "../src/campaign/progress";
import { defaultProfile } from "../src/save/profile";
import { makeDirected, updateEnemy, VOLLEY_WARN } from "../src/combat/enemies";
import { BulletPool } from "../src/combat/bullets";
import type { CombatWorld, TickInput } from "../src/combat/world";
import type { Enemy } from "../src/combat/enemies";
import type { Vec } from "../src/core/geometry";

const DT = 1 / 60;
const sig = (id: string) => catalog.row<{ signature_weapon_id: string }>("bosses", id)?.signature_weapon_id ?? "";

describe("mission director", () => {
  it("runs P01-01's waves in order with 3 supply nodes", () => {
    const d = new MissionDirector(catalog.mission("P01-01"));
    const seen: string[] = [];
    for (let i = 0; i < 60 * 60 && !d.done; i++) {
      for (const ev of d.tick(DT, true, false)) seen.push(ev.kind === "wave" ? ev.wave.enemy_id! : ev.kind);
    }
    // every catalog wave plays twice (second pass mirrored)
    expect(seen).toEqual(["E01", "supply", "E01", "E02", "supply", "E02", "E03", "supply", "E03", "E04", "E04", "complete"]);
  });

  it("waits for the previous wave to clear", () => {
    const d = new MissionDirector(catalog.mission("P01-01"));
    let waves = 0;
    for (let i = 0; i < 60 * 30; i++) for (const ev of d.tick(DT, i < 100, false)) if (ev.kind === "wave") waves++;
    expect(waves).toBe(1); // wave 1 (spawned at 2 s) is never cleared
  });

  it("formations start and end off screen", () => {
    for (const m of catalog.raw.missions.filter((x) => x.sector_id === "P01")) {
      for (const w of m.waves as unknown as WaveDef[]) {
        if (!w.enemy_id || !["E01", "E02", "E03", "E04"].includes(w.enemy_id)) continue;
        for (const s of formationSpawns(w, catalog.enemy(w.enemy_id))) {
          const a = s.path[0], z = s.path[s.path.length - 1];
          const off = (p: Vec) => p.x < 0 || p.x > 720 || p.y < 0 || p.y > 1280;
          expect(off(a) && off(z), `${w.id} ${JSON.stringify(s.path)}`).toBe(true);
        }
      }
    }
  });

  it("marks only fully supported missions playable", () => {
    const ids = catalog.raw.missions.filter((m) => m.sector_id === "P01" && missionPlayable(m)).map((m) => m.id);
    expect(ids).toEqual(["P01-01", "P01-03", "P01-06"]);
  });
});

describe("new enemies", () => {
  const em = { hostile: new BulletPool(100), speedMul: 1, damageMul: 1 };
  it("E02 samples its aim when the warning starts and fires 3 shots at that point", () => {
    const e = makeDirected("i1", catalog.enemy("E02"), { path: [{ x: 360, y: 300 }, { x: 361, y: 300 }, { x: 362, y: 300 }], speed: 0, wobble: 0, index: 0 }, "t");
    let target = { x: 100, y: 900 };
    let sampled: Vec | null = null;
    for (let i = 0; i < 60 * 3 && em.hostile.active < 3; i++) {
      updateEnemy(e, DT, em, target);
      if (e.telegraph > 0 && !sampled) { sampled = { ...e.aim! }; target = { x: 650, y: 900 }; } // player moves after the aim locks
    }
    expect(sampled).toEqual({ x: 100, y: 900 });
    expect(em.hostile.active).toBe(3);
    for (const b of em.hostile.items.filter((x) => x.alive)) expect(b.vx).toBeLessThan(0); // all toward the sampled point (left)
    expect(VOLLEY_WARN).toBe(0.4);
  });

  function haulerWorld(): { w: CombatWorld; h: Enemy } {
    const w = world({ missionId: "P01-01", invulnerable: true });
    const h = makeDirected("h1", catalog.enemy("E04"), { path: [{ x: 360, y: 400 }, { x: 361, y: 400 }, { x: 362, y: 400 }], speed: 0, wobble: 0, index: 0 }, "t");
    w.enemies.push(h);
    return { w, h };
  }

  it("E04 engine break frees an intact cargo module", () => {
    const { w, h } = haulerWorld();
    const engine = h.parts.find((p) => p.id === "engine")!;
    w.damagePart(h, engine, 30, { ...h.pos });
    expect(h.alive).toBe(false);
    const item = w.items.find((i) => i.sourceEncounter === "E04")!;
    expect(item.state).toBe("detached_intact");
    expect(item.integrity).toBe(60);
    expect(["W001", "W008"]).toContain(item.templateId);
  });

  it("E04 tank kill sets off a fuel blast that hurts nearby enemies and leaves no part", () => {
    const { w, h } = haulerWorld();
    const near = makeDirected("n1", catalog.enemy("E01"), { path: [{ x: 420, y: 430 }, { x: 421, y: 430 }, { x: 422, y: 430 }], speed: 0, wobble: 0, index: 0 }, "t");
    w.enemies.push(near);
    const tank = h.parts.find((p) => p.id === "core")!;
    w.damagePart(h, tank, 999, { ...h.pos });
    w.step({ move: { x: 0, y: 0 }, fire: false });
    expect(h.alive).toBe(false);
    expect(near.alive).toBe(false); // 24 HP scout inside the 110 px blast
    expect(w.items.some((i) => i.sourceEncounter === "E04")).toBe(false);
  });
});

describe("stars and settlement", () => {
  const m = catalog.mission("P01-01");
  it("evaluates P01-01 objectives only on success", () => {
    const s = { supplyDestroyed: 3, coreDamage: 35.4, securedIntact: [], interrupts: 0 };
    expect(evaluateStars(m, s, true)).toEqual([true, true, true]);
    expect(evaluateStars(m, { ...s, coreDamage: 36 }, true)).toEqual([true, true, false]);
    expect(evaluateStars(m, s, false)).toEqual([false, false, false]);
  });
  it("secure_signature needs the intact signature", () => {
    const m6 = catalog.mission("P01-06");
    expect(evaluateStars(m6, { supplyDestroyed: 0, coreDamage: 99, securedIntact: ["W022"], interrupts: 0 }, true)).toEqual([true, true, false]);
  });
  it("merges stars across runs and never removes them", () => {
    expect(mergeStars([true, false, true], [true, true, false])).toEqual([true, true, true]);
    const p = defaultProfile();
    const base = { runId: "r1", missionId: "P01-01", sector: 1, missionIndex: 1, score: 100, combatCredits: 0, combatScrap: 0,
      secured: [], unbanked: [], severed: [], stolen: [], encounterIds: [] };
    const s1 = computeSettlement(p, { ...base, victory: true, stars: [true, false, true] }, sig);
    expect(s1.credits).toBe(275 * 2); // first clear doubles the catalog baseline
    applySettlement(p, s1);
    const s2 = computeSettlement(p, { ...base, runId: "r2", victory: true, stars: [true, true, false] }, sig);
    expect(s2.firstClear).toBe(false);
    applySettlement(p, s2);
    applySettlement(p, computeSettlement(p, { ...base, runId: "r3", victory: false, stars: [false, false, false] }, sig));
    expect(p.mission_records["P01-01"].stars).toEqual([true, true, true]);
  });
  it("intact research cargo adds research progress", () => {
    const p = defaultProfile();
    const s = computeSettlement(p, { runId: "r1", missionId: "P01-01", sector: 1, missionIndex: 1, score: 0, combatCredits: 0, combatScrap: 0,
      secured: [{ instanceId: "x", templateId: "W001", source: "E04", intact: true, scrapValue: 3 }], unbanked: [], severed: [], stolen: [], encounterIds: [],
      victory: true, stars: [true, false, false] }, sig);
    applySettlement(p, s);
    expect(p.weapon_research.W001).toBe(1);
    expect(p.blueprint_fragments).toEqual({});
  });
});

describe("campaign progress", () => {
  it("unlocks sequentially and bridges missions that are not built yet", () => {
    const p = defaultProfile();
    const un = () => catalog.raw.missions.filter((m) => m.sector_id === "P01" && missionUnlocked(catalog, p, m)).map((m) => m.id);
    expect(un()).toEqual(["P01-01"]);
    p.mission_records["P01-01"] = { stars: [true, false, false], best_score: 0, difficulty_records: {} };
    // P01-02 is not built yet, so it bridges straight to P01-03; P01-03 then gates the rest
    expect(un()).toEqual(["P01-01", "P01-02", "P01-03"]);
    p.mission_records["P01-03"] = { stars: [true, false, false], best_score: 0, difficulty_records: {} };
    expect(un()).toEqual(["P01-01", "P01-02", "P01-03", "P01-04", "P01-05", "P01-06"]);
  });
  it("research pool grows with cleared missions", () => {
    const p = defaultProfile();
    expect(researchPool(catalog, p)).toEqual(["W001", "W008"]);
    p.mission_records["P01-02"] = { stars: [true, false, false], best_score: 0, difficulty_records: {} };
    expect(researchPool(catalog, p)).toEqual(["W001", "W002", "W003", "W008"]);
  });
});

// Automated P01-01 playthrough: player inputs only (move, lock, tractor, dock choices).
function steer(w: CombatWorld, to: Vec): Vec {
  const dx = to.x - w.motion.pos.x, dy = to.y - w.motion.pos.y;
  return { x: Math.max(-1, Math.min(1, dx / 25)), y: Math.max(-1, Math.min(1, dy / 25)) };
}

function bot(w: CombatWorld): TickInput {
  const loose = !w.tow?.towing && w.items.find((i) => i.sourceEncounter === "E04" && (i.state === "detached_intact" || i.state === "acquiring"));
  if (loose) return { move: steer(w, { x: loose.pos.x, y: loose.pos.y + 90 }), tractorHeld: true, fire: true };
  const onScreen = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
  const target = onScreen.find((e) => e.role === "supply") ?? onScreen.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine")?.active) ?? onScreen[0];
  if (!target) return { move: steer(w, { x: 360, y: 900 }), fire: true };
  const part = target.role === "cargo" ? "engine" : "core";
  w.lock = { enemyId: target.id, partId: part };
  return { move: steer(w, { x: target.pos.x, y: Math.min(1000, target.pos.y + 320) }), fire: true };
}

describe("P01-01 playthrough (M2 stage 1 gate)", () => {
  it("clears with all three stars and brings home a cargo module", () => {
    const w = world({ missionId: "P01-01", runId: "bot1", invulnerable: true });
    let docks = 0;
    for (let i = 0; i < 60 * 400 && w.status === "running"; i++) {
      if (w.dock) {
        docks++;
        const origin = w.assembly.suggestOrigins(w.dockWeapon()!)[0];
        if (!origin || w.dockFit(origin)) w.dockStow();
        w.endDock();
        continue;
      }
      w.step(bot(w));
    }
    expect(w.status).toBe("victory");
    const r = w.result!;
    expect(r.missionId).toBe("P01-01");
    expect(w.supplyDestroyed).toBe(3);
    expect(r.stars).toEqual([true, true, true]);
    expect(docks).toBeGreaterThan(0);
    expect(r.secured.some((s) => s.source === "E04" && s.intact)).toBe(true);
    const p = defaultProfile();
    applySettlement(p, computeSettlement(p, r, sig));
    expect(p.mission_records["P01-01"].stars).toEqual([true, true, true]);
    expect(Object.values(p.weapon_research).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("P01-06 reaches the B02 encounter from catalog waves", () => {
    const w = world({ missionId: "P01-06", invulnerable: true });
    for (let i = 0; i < 60 * 200 && !w.boss; i++) w.step(bot(w));
    expect(w.boss?.row.id).toBe("B02");
    expect(w.director!.index).toBe(2);
  });
});
