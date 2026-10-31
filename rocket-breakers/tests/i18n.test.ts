import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { I18n } from "../src/core/i18n";
import { catalog } from "./helpers";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("localisation", () => {
  const i18n = new I18n(catalog);
  it("every entry has Thai and English", () => {
    expect(i18n.missing).toEqual([]);
    // Known catalog gap: fusion names are English-only (docs/DECISIONS.md).
    expect(i18n.needsTranslation.every((k) => k.startsWith("fusions."))).toBe(true);
    expect(i18n.needsTranslation).toHaveLength(8);
  });
  it("every key referenced in source exists", () => {
    const keys = new Set<string>();
    for (const file of sources("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bt\(\s*"([a-z_.0-9]+)"/g)) keys.add(m[1]);
      for (const m of text.matchAll(/"((?:hint|fit\.error)\.[a-z_]+)"/g)) keys.add(m[1]);
    }
    for (let i = 1; i <= 7; i++) keys.add(`howto.step${i}`);
    const missing = [...keys].filter((k) => !i18n.has(k));
    expect(missing).toEqual([]);
  });
  it("formats variables", () => {
    i18n.locale = "en";
    expect(i18n.t("hud.phase", { n: 2 })).toBe("Phase 2");
    i18n.locale = "th";
    expect(i18n.t("weapons.W022.name")).toBe("หางพลาสมาแมงป่อง");
  });
});
