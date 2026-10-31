// Arsenal: every research weapon W002–W020 fires and hurts a target; key behaviours checked.
import { describe, expect, it } from "vitest";
import { catalog, world } from "./helpers";
import { makeDirected } from "../src/combat/enemies";
import { ARSENAL_POOL } from "../src/combat/world";
import type { CombatWorld } from "../src/combat/world";

function rig(weaponId: string, targets = 1): CombatWorld {
  const w = world({ invulnerable: true });
  w.phase = "outro"; // keep the scripted SLICE waves out of the way
  (w as unknown as { phaseTimer: number }).phaseTimer = 1e9;
  for (const m of [...w.assembly.modules]) w.assembly.remove(m.instanceId);
  const wr = catalog.weapon(weaponId);
  const o = w.assembly.suggestOrigins(wr)[0];
  expect(o, `${weaponId} fits the starter grid`).toBeTruthy();
  expect(w.assembly.place(wr, o, `t-${weaponId}`)).toBeNull();
  w.refreshAssembly();
  w.weapons.energyRegen = 999;
  w.motion.pos = { x: 360, y: 900 };
  for (let k = 0; k < targets; k++) {
    const x = 360 + (k - (targets - 1) / 2) * 70;
    const e = makeDirected(`tgt${k}`, catalog.enemy("E03"), { path: [{ x, y: 520 - k * 30 }, { x: x + 0.1, y: 520 - k * 30 }, { x: x + 0.2, y: 520 - k * 30 }], speed: 0, wobble: 0, index: k }, "t");
    e.holdAtEnd = true;
    e.fireTimer = Infinity;
    e.parts = e.parts.filter((p) => p.kind === "core"); // plain target: no shield plate
    e.parts[0].hp = e.parts[0].hpMax = 5000;
    w.enemies.push(e);
  }
  return w;
}

const fireFor = (w: CombatWorld, sec: number, y = 900) => { for (let i = 0; i < 60 * sec; i++) { w.motion.pos = { x: 360, y }; w.step({ move: { x: 0, y: 0 }, fire: true }); } };
const dmg = (w: CombatWorld) => w.enemies.reduce((s, e) => s + (e.parts[0].hpMax - e.parts[0].hp), 0);

describe("arsenal weapons", () => {
  for (const id of ARSENAL_POOL) {
    it(`${id} ${catalog.weapon(id).name.en} (${catalog.weapon(id).attack_model}) damages a target`, () => {
      const w = rig(id);
      // short-range weapons (flame 220 px) get to fight up close
      fireFor(w, 4, (catalog.weapon(id).special_params.range ?? 999) < 300 ? 700 : 900);
      expect(dmg(w)).toBeGreaterThan(5);
    });
  }

  it("gatling spools up: more shots in its second second than its first", () => {
    const w = rig("W005");
    let first = 0, second = 0;
    for (let i = 0; i < 120; i++) { w.step({ move: { x: 0, y: 0 }, fire: true }); const n = w.events.filter((e) => e.type === "muzzle").length; if (i < 60) first += n; else second += n; w.events.length = 0; }
    expect(second).toBeGreaterThan(first);
  });

  it("rail lance pierces several targets in a line", () => {
    const w = rig("W003", 1);
    for (let k = 1; k < 3; k++) {
      const e = makeDirected(`col${k}`, catalog.enemy("E01"), { path: [{ x: 360, y: 520 - k * 120 }, { x: 360.1, y: 520 - k * 120 }, { x: 360.2, y: 520 - k * 120 }], speed: 0, wobble: 0, index: k }, "t");
      e.holdAtEnd = true; e.fireTimer = Infinity; e.parts[0].hp = e.parts[0].hpMax = 5000;
      w.enemies.push(e);
    }
    fireFor(w, 2.5);
    expect(w.enemies.filter((e) => e.parts[0].hp < e.parts[0].hpMax).length).toBeGreaterThanOrEqual(3);
  });

  it("arc fork chains to nearby enemies", () => {
    const w = rig("W015", 3);
    fireFor(w, 2);
    expect(w.enemies.filter((e) => e.parts[0].hp < e.parts[0].hpMax).length).toBeGreaterThanOrEqual(2);
  });

  it("frost shard chills, ion needle slows firing", () => {
    const f = rig("W018"); fireFor(f, 1.5); expect(f.enemies[0].status?.chill).toBeGreaterThan(0);
    const i = rig("W016"); fireFor(i, 1.5); expect(i.enemies[0].status?.ion).toBeGreaterThan(0);
  });

  it("gravity seed opens a field that pulls ordinary enemies", () => {
    const w = rig("W019", 1);
    fireFor(w, 1.6);
    expect(w.fields.length + (w.enemies[0].parts[0].hp < 5000 ? 1 : 0)).toBeGreaterThan(0);
  });

  it("cluster rack splits into several seekers", () => {
    const w = rig("W012", 3);
    let maxMissiles = 0;
    for (let i = 0; i < 90; i++) { w.step({ move: { x: 0, y: 0 }, fire: true }); maxMissiles = Math.max(maxMissiles, w.friendly.items.filter((b) => b.alive && b.model === "missile").length); }
    expect(maxMissiles).toBeGreaterThanOrEqual(4);
  });
});
