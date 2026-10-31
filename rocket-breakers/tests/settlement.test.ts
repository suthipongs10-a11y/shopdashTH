import { describe, expect, it } from "vitest";
import { applySettlement, computeSettlement, recoverPending, settle, type RunResult } from "../src/campaign/settlement";
import { defaultProfile, type Profile } from "../src/save/profile";
import { MemoryStore, SaveRepository } from "../src/save/saveRepository";
import { catalog } from "./helpers";

const sig = (b: string) => catalog.boss(b).signature_weapon_id;
const tail = { instanceId: "r:B02:tail", templateId: "W022", source: "B02", intact: true, scrapValue: 76 };
const result = (o: Partial<RunResult>): RunResult => ({
  runId: "run1", missionId: "SLICE-01", sector: 1, missionIndex: 6, victory: true, score: 1000,
  combatCredits: 100, combatScrap: 10, secured: [], unbanked: [], severed: [], stolen: [], encounterIds: ["B02"], ...o,
});

describe("settlement", () => {
  it("example 1: first win with intact tail = +1 fragment, not +2", () => {
    const p = defaultProfile();
    const s = computeSettlement(p, result({ secured: [tail], severed: ["B02"], stolen: ["B02"] }), sig);
    expect(s.fragments).toEqual({ W022: 1 });
    expect(s.credits).toBe((180 + 70 + 150) * 2);
    applySettlement(p, s);
    expect(p.blueprint_fragments.W022).toBe(1);
    expect(p.boss_archive.B02).toEqual({ severed: 1, stolen: 1, cleared: true });
  });
  it("example 2: first win with destroyed tail grants the fallback fragment once", () => {
    const p = defaultProfile();
    const s = computeSettlement(p, result({ severed: ["B02"] }), sig);
    expect(s.fragments).toEqual({ W022: 1 });
    expect(s.fallbackFragments).toEqual(["W022"]);
    applySettlement(p, s);
    const again = computeSettlement(p, result({ runId: "run2" }), sig);
    expect(again.fragments).toEqual({});
    expect(again.credits).toBe(Math.floor(400 * 0.6));
  });
  it("defeat: no fragment, 25% formulas, unbanked intact items become 25% scrap", () => {
    const p = defaultProfile();
    const s = computeSettlement(p, result({ victory: false, unbanked: [tail], encounterIds: [] }), sig);
    expect(s.fragments).toEqual({});
    expect(s.credits).toBe(Math.floor(Math.min(100 * 0.25, 400 * 0.25)));
    expect(s.scrap).toBe(Math.floor((10 + 76) * 0.25));
  });
  it("applies exactly once and survives crashes at each journal step", () => {
    for (const crash of ["pending", "applied", undefined] as const) {
      const store = new MemoryStore();
      const repo = new SaveRepository(store);
      const p = defaultProfile();
      repo.save(p);
      const s = computeSettlement(p, result({ secured: [tail], stolen: ["B02"] }), sig);
      try { settle(p, s, (x) => repo.save(x), crash); } catch { /* injected */ }
      const reloaded: Profile = repo.load().profile;
      recoverPending(reloaded);
      applySettlement(reloaded, s); // replay attempt
      expect(reloaded.blueprint_fragments.W022).toBe(1);
      expect(reloaded.credits).toBe(800);
      expect(reloaded.applied_settlements.filter((x) => x === s.id)).toHaveLength(1);
    }
  });
});
