// Local profile schema (TECHNICAL "Save schema"). Blueprint progress and physical
// run items are modelled separately; total stars are always recomputed, never stored.
export const CURRENT_SCHEMA = 1;
export const CONTENT_VERSION = "1.0";

export interface Settings {
  language: "th" | "en"; shake: number; flash: number; photosensitive: boolean;
  autoLock: boolean; autoTractor: boolean; handedness: "right" | "left"; sound: number; touchSensitivity: number;
  classicSalvage?: boolean; // false/absent = quick salvage (tap to pull, auto-fit)
}

export interface BossArchive { severed: number; stolen: number; cleared: boolean }

export interface Profile {
  schema_version: number;
  profile_id: string;
  content_version: string;
  settings: Settings;
  mission_records: Record<string, { stars: [boolean, boolean, boolean]; best_score: number; difficulty_records: Record<string, unknown> }>;
  test_records: Record<string, { clears: number; attempts: number; best_score: number }>;
  boss_archive: Record<string, BossArchive>;
  unlocked_hulls: string[];
  blueprint_fragments: Record<string, number>;
  weapon_research: Record<string, number>;
  credits: number;
  scrap: number;
  loadouts: unknown[];
  active_run: unknown;
  applied_settlements: string[];
  pending_settlement: unknown;
  run_counter: number;
  upgrades?: Record<string, number>;   // hangar levels (absent in old saves = none)
  equipped_weapon?: string | null;     // extra gun the ship launches with
  survival_best?: number;              // best survival time (s)
  [unknownKey: string]: unknown;
}

export function defaultSettings(): Settings {
  return { language: "th", shake: 1, flash: 1, photosensitive: false, autoLock: false, autoTractor: false, handedness: "right", sound: 0.7, touchSensitivity: 1.0, classicSalvage: false };
}

export function uuid(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function defaultProfile(): Profile {
  return {
    schema_version: CURRENT_SCHEMA, profile_id: uuid(), content_version: CONTENT_VERSION,
    settings: defaultSettings(), mission_records: {}, test_records: {}, boss_archive: {},
    unlocked_hulls: ["H01"], blueprint_fragments: {}, weapon_research: {}, credits: 0, scrap: 0,
    loadouts: [], active_run: null, applied_settlements: [], pending_settlement: null, run_counter: 0,
  };
}

export function totalStars(p: Profile): number {
  return Object.values(p.mission_records).reduce((n, r) => n + r.stars.filter(Boolean).length, 0);
}
