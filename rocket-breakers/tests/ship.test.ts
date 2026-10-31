import { describe, expect, it } from "vitest";
import { PlayerMotion } from "../src/ships/motion";
import { Assembly } from "../src/ships/assembly";
import { WeaponScheduler, HEAT_MIN_LOCK_SEC, HEAT_UNLOCK } from "../src/combat/weapons";
import { DT } from "../src/core/frameDriver";
import { catalog } from "./helpers";

const motion = () => Object.assign(new PlayerMotion(), { fittedMass: 7, bounds: { x0: 0, y0: 0, x1: 720, y1: 1280 }, pos: { x: 360, y: 640 } });

describe("movement", () => {
  it("uses the single effective-speed formula with a 55% floor", () => {
    const m = motion();
    expect(m.effectiveSpeed()).toBeCloseTo(337.5);
    m.towing = true; m.cargoMass = 20;
    expect(m.effectiveSpeed()).toBeCloseTo(360 * 0.5875);
    m.fittedMass = 28;
    expect(m.effectiveSpeed()).toBeCloseTo(360 * 0.55);
  });
  it("accelerates, caps diagonal speed and clamps the whole assembly", () => {
    const m = motion();
    m.step({ x: 1, y: 0 }, false, DT);
    expect(m.vel.x).toBeCloseTo(30);
    for (let i = 0; i < 600; i++) m.step({ x: -1, y: -1 }, false, DT);
    expect(Math.hypot(m.vel.x, m.vel.y)).toBeLessThanOrEqual(m.effectiveSpeed() + 1e-6);
    m.halfWidth = 33;
    for (let i = 0; i < 300; i++) m.step({ x: -1, y: 0 }, false, DT);
    expect(m.pos.x).toBeCloseTo(33);
  });
  it("dash grants 0.18 s invulnerability and a 2.5 s cooldown", () => {
    const m = motion();
    m.step({ x: 1, y: 0 }, true, DT);
    for (let i = 0; i < 9; i++) m.step({ x: 0, y: 0 }, false, DT);
    expect(m.invulnLeft).toBeGreaterThan(0);
    m.step({ x: 0, y: 0 }, false, DT);
    expect(m.invulnLeft).toBe(0);
    expect(m.tryDash()).toBe(false);
    for (let i = 0; i < 140; i++) m.step({ x: 0, y: 0 }, false, DT);
    expect(m.tryDash()).toBe(true);
  });
});

describe("assembly fitting", () => {
  const w22 = catalog.weapon("W022");
  it("starter loadout is legal and sustainable", () => {
    const a = Assembly.fromStarter(catalog.hull("H01"), catalog);
    const s = new WeaponScheduler();
    s.sync(a.modules);
    expect(s.energyPerSec()).toBeLessThanOrEqual(14 * 0.8);
  });
  it("gives actionable errors and never loses modules", () => {
    const a = Assembly.fromStarter(catalog.hull("H01"), catalog);
    expect(a.canPlace(w22, [2, 4])).toBe("fit.error.overlap");
    expect(a.canPlace(w22, [0, 0])).toBe("fit.error.off_mask");
    expect(a.canPlace(w22, [3, 2])).toBe("fit.error.reactor");
    expect(a.canPlace(w22, [2, 1])).toBe("fit.error.floating");
    expect(a.modules).toHaveLength(2);
    expect(a.suggestOrigins(w22)[0]).toEqual([4, 4]);
    expect(a.place(w22, [4, 4])).toBeNull();
    const heavy = { ...w22, mass: 100 };
    expect(a.canPlace(heavy, [2, 2])).toBe("fit.error.over_mass");
  });
});

describe("weapon scheduling", () => {
  const sched = () => {
    const s = new WeaponScheduler();
    s.sync(Assembly.fromStarter(catalog.hull("H01"), catalog).modules.slice(0, 1));
    return s;
  };
  it("fires at catalog rate; Overdrive ×1.5", () => {
    const s = sched();
    let n = 0;
    for (let i = 0; i < 60; i++) n += s.tick(DT, true, false).length;
    expect(n).toBe(8);
    const o = sched();
    n = 0;
    for (let i = 0; i < 60; i++) n += o.tick(DT, true, true).length;
    expect(n).toBe(12);
  });
  it("spends nothing without energy or with a blocked muzzle", () => {
    const s = sched();
    s.energy = 0; s.energyRegen = 0;
    expect(s.tick(DT, true, false)).toHaveLength(0);
    expect(s.mounts[0].heat).toBe(0);
    const b = sched();
    b.mounts[0].blocked = true;
    b.tick(DT, true, false);
    expect(b.energy).toBe(100);
  });
  it("heat-locks and recovers per SYSTEMS §3", () => {
    const s = sched();
    s.energyRegen = 1000;
    let t = 0;
    while (!s.mounts[0].locked && t++ < 3600) s.tick(DT, true, false);
    expect(s.mounts[0].locked).toBe(true);
    let locked = 0, shots = 0;
    while (s.mounts[0].locked) { shots += s.tick(DT, true, false).length; locked++; }
    expect(shots).toBe(0);
    expect(locked * DT).toBeGreaterThanOrEqual(HEAT_MIN_LOCK_SEC);
    expect(s.mounts[0].heat).toBeLessThanOrEqual(HEAT_UNLOCK);
  });
});
