import { describe, expect, it } from "vitest";
import { FrameDriver } from "../src/core/frameDriver";
import { Rng } from "../src/core/rng";
import { world } from "./helpers";

const input = (tick: number) => ({
  move: { x: Math.sin(tick * 0.05), y: Math.cos(tick * 0.031) * 0.6 },
  dash: tick % 200 === 50,
  overdrive: tick % 120 === 0,
  fire: true,
});

function run(frameDt: (f: number) => number, ticks: number): string {
  const w = world({ seed: 7 });
  const d = new FrameDriver();
  for (let f = 0; w.tick < ticks; f++) {
    const n = d.advance(frameDt(f));
    for (let i = 0; i < n && w.tick < ticks; i++) w.step(input(w.tick));
  }
  return w.stateHash();
}

describe("determinism", () => {
  it("identical game state at 30/60/144 Hz and jittery frames", () => {
    const rng = new Rng(99);
    const jitter = Array.from({ length: 20000 }, () => rng.range(0.004, 0.045));
    const ticks = 60 * 40;
    const h60 = run(() => 1 / 60, ticks);
    expect(run(() => 1 / 30, ticks)).toBe(h60);
    expect(run(() => 1 / 144, ticks)).toBe(h60);
    expect(run((f) => jitter[f], ticks)).toBe(h60);
  });
});
