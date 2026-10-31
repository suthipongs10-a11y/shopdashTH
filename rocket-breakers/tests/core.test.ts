import { describe, expect, it } from "vitest";
import { Catalog, EXPECTED_COUNTS } from "../src/core/catalog";
import { AssetResolver, parseCsv } from "../src/core/assets";
import { FrameDriver } from "../src/core/frameDriver";
import { segmentCircleT, segmentRectT } from "../src/core/geometry";
import { catalog } from "./helpers";

describe("catalog", () => {
  it("loads with the full v1 scope", () => {
    expect(catalog.errors).toEqual([]);
    for (const [g, n] of Object.entries(EXPECTED_COUNTS)) expect((catalog.raw as unknown as Record<string, unknown[]>)[g]).toHaveLength(n);
    expect(catalog.campaignStarSlots()).toBe(144);
  });
  it("compiles M1 values from data", () => {
    expect(catalog.hull("H01").base_speed).toBe(360);
    expect(catalog.weapon("W022").salvage_source).toBe("B02");
    expect(catalog.boss("B02").joint_hp).toBe(78);
    expect(catalog.boss("B02").signature_module_integrity).toBe(115);
  });
  it("reports broken references and duplicates", () => {
    const raw = structuredClone(catalog.raw);
    raw.bosses[1].signature_weapon_id = "W999";
    raw.missions[0].hazard_id = "HZ99";
    const broken = new Catalog(raw);
    expect(broken.valid).toBe(false);
    expect(broken.errors.join("\n")).toMatch(/W999/);
    const dup = structuredClone(catalog.raw);
    dup.weapons[1].id = dup.weapons[0].id;
    expect(new Catalog(dup).errors.join("\n")).toMatch(/duplicate/);
  });
});

describe("assets", () => {
  it("parses the manifest and marks unintegrated art as placeholder", () => {
    const r = new AssetResolver();
    expect(r.errors).toEqual([]);
    expect(r.rows.size).toBe(386);
    expect(r.resolve("hull_H02")).toMatchObject({ status: "planned", placeholder: true });
    expect(r.resolve("nope").placeholder).toBe(true);
    // BATCH_001 delivered art is integrated with a runtime path
    expect(r.resolve("hull_H01")).toMatchObject({ status: "integrated", path: "assets/sprites/hull_H01.webp", placeholder: false });
    expect(r.missingForRelease(["hull_H01", "hull_H02"])).toEqual(["hull_H02"]);
  });
  it("handles quoted CSV fields", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("frame driver", () => {
  it("produces 60 ticks per second at any refresh rate", () => {
    const d = new FrameDriver();
    let n = 0;
    for (let i = 0; i < 144; i++) n += d.advance(1 / 144);
    expect(n).toBe(60);
    expect(d.advance(1 / 30)).toBe(2);
    expect(d.advance(5)).toBe(8);
    d.paused = true;
    expect(d.advance(1)).toBe(0);
  });
});

describe("swept geometry", () => {
  it("catches fast shots that would tunnel", () => {
    expect(segmentCircleT({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 0, y: 50 }, 10)).toBeCloseTo(0.4);
    expect(segmentCircleT({ x: 40, y: 100 }, { x: 40, y: 0 }, { x: 0, y: 50 }, 10)).toBe(-1);
    expect(segmentRectT({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 0, y: 50 }, 5, 5)).toBeCloseTo(0.45);
  });
});
