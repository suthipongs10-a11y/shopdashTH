// th/en text: UI strings from data/i18n/ui.json plus catalog names keyed
// "<group>.<id>.name". Thai is the default locale.
import uiJson from "../../data/i18n/ui.json";
import type { Catalog } from "./catalog";
import { PICKUPS } from "../combat/powerups";

export type Locale = "th" | "en";
export const LOCALES: Locale[] = ["th", "en"];
const NAMED_GROUPS = ["sectors", "missions", "hulls", "weapons", "abilities", "utilities", "bosses", "enemies", "hazards", "fusions"] as const;

export class I18n {
  locale: Locale = "th";
  readonly missing: string[] = [];
  // Catalog names given as one untranslated string (seeded into both locales).
  readonly needsTranslation: string[] = [];
  private dict: Record<Locale, Map<string, string>> = { th: new Map(), en: new Map() };

  constructor(catalog?: Catalog) {
    for (const [key, entry] of Object.entries(uiJson as Record<string, unknown>)) this.add(key, entry);
    for (const p of PICKUPS) this.add(`powerups.${p.id}.name`, p.name);
    if (catalog?.valid) {
      for (const group of NAMED_GROUPS) {
        for (const row of catalog.raw[group] as { id: string; name?: unknown }[]) {
          if (row.name !== undefined) this.add(`${group}.${row.id}.name`, row.name);
        }
      }
    }
  }

  has(key: string): boolean {
    return this.dict.th.has(key) && this.dict.en.has(key);
  }

  t(key: string, vars?: Record<string, string | number>): string {
    let s = this.dict[this.locale].get(key) ?? this.dict.th.get(key) ?? key;
    if (vars) for (const [k, val] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(val));
    return s;
  }

  private add(key: string, entry: unknown): void {
    if (typeof entry === "string" && entry) {
      this.needsTranslation.push(key);
      entry = { th: entry, en: entry };
    }
    for (const loc of LOCALES) {
      const text = (entry as Record<string, unknown> | null)?.[loc];
      if (typeof text !== "string" || !text) { this.missing.push(`${key} [${loc}]`); continue; }
      this.dict[loc].set(key, text);
    }
  }
}

// App-wide instance, replaced at boot once the catalog is loaded.
export let i18n = new I18n();
export function setI18n(next: I18n): void { i18n = next; }
export const t = (key: string, vars?: Record<string, string | number>): string => i18n.t(key, vars);
