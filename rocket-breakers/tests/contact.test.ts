import { describe, expect, it } from "vitest";
import { toBossFight, world } from "./helpers";
import { CONTACT_DAMAGE_BODY, PLAYER_BODY_RADIUS } from "../src/combat/world";

const BOSS_CORE_R = 62;

describe("ship vs enemy bodies", () => {
  it("cannot sit on top of the boss: pushed out, 20 damage per 0.6 s, never insta-killed", () => {
    const w = world({ startAt: "boss" });
    toBossFight(w);
    w.shield = 0;
    const b0 = w.boss!.e.pos;
    w.motion.pos = { x: b0.x, y: b0.y + BOSS_CORE_R + PLAYER_BODY_RADIUS + 5 };
    const hp0 = w.hp;
    let minGap = Infinity;
    for (let i = 0; i < 60; i++) {
      const b = w.boss!.e.pos;
      w.step({ move: { x: (b.x - w.motion.pos.x) / 30, y: -1 }, fire: false }); // keep ramming the core
      minGap = Math.min(minGap, Math.hypot(w.motion.pos.x - b.x, w.motion.pos.y - b.y));
    }
    expect(minGap).toBeGreaterThanOrEqual(BOSS_CORE_R + PLAYER_BODY_RADIUS - 2);
    const hits = Math.round((hp0 - w.hp) / CONTACT_DAMAGE_BODY);
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(hits).toBeLessThanOrEqual(2); // 1 s of contact at one hit per 0.6 s
    expect(w.hp).toBeGreaterThan(0);
  });
  it("dash cannot tunnel through the boss core", () => {
    const w = world({ startAt: "boss" });
    toBossFight(w);
    const b = w.boss!.e.pos;
    w.motion.pos = { x: b.x, y: b.y + BOSS_CORE_R + PLAYER_BODY_RADIUS + 30 };
    let minGap = Infinity;
    w.step({ move: { x: 0, y: -1 }, dash: true, fire: false });
    for (let i = 0; i < 20; i++) {
      w.step({ move: { x: 0, y: -1 }, fire: false });
      const c = w.boss!.e.pos;
      minGap = Math.min(minGap, Math.hypot(w.motion.pos.x - c.x, w.motion.pos.y - c.y));
    }
    expect(minGap).toBeGreaterThanOrEqual(BOSS_CORE_R + PLAYER_BODY_RADIUS - 2);
  });
});
