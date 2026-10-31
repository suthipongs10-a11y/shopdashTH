import { describe, expect, it } from "vitest";
import { toBossFight, world } from "./helpers";
import { CONTACT_DAMAGE_BODY } from "../src/combat/world";

describe("ship vs enemy bodies", () => {
  it("cannot sit on top of the boss: pushed out, 20 damage per 0.6 s, never insta-killed", () => {
    const w = world({ startAt: "boss" });
    toBossFight(w);
    w.shield = 0;
    const b0 = w.boss!.e.pos;
    w.motion.pos = { x: b0.x - 60, y: b0.y + 120 };
    const hp0 = w.hp;
    let worst = 0;
    for (let i = 0; i < 60; i++) {
      const b = w.boss!.e.pos;
      w.step({ move: { x: (b.x - w.motion.pos.x) / 30, y: -1 }, fire: false }); // keep ramming the body
      worst = Math.max(worst, w.maxPenetration());
    }
    expect(worst).toBeLessThanOrEqual(1.5);
    const hits = Math.round((hp0 - w.hp) / CONTACT_DAMAGE_BODY);
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(hits).toBeLessThanOrEqual(2); // 1 s of contact at one hit per 0.6 s
    expect(w.hp).toBeGreaterThan(0);
  });
  it("dash cannot tunnel into the boss body", () => {
    const w = world({ startAt: "boss" });
    toBossFight(w);
    const b = w.boss!.e.pos;
    w.motion.pos = { x: b.x - 70, y: b.y + 160 };
    let worst = 0;
    w.step({ move: { x: 0, y: -1 }, dash: true, fire: false });
    for (let i = 0; i < 20; i++) {
      w.step({ move: { x: 0, y: -1 }, fire: false });
      worst = Math.max(worst, w.maxPenetration());
    }
    expect(worst).toBeLessThanOrEqual(1.5);
  });
});
