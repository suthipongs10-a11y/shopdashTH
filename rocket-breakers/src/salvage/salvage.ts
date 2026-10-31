// Salvage item lifecycle (SYSTEMS §5). Source encounter/part IDs persist through
// every transition; transitions are validated against an explicit table and are
// idempotent per transaction id, so replays never duplicate items or entitlements.
import type { Vec } from "../core/geometry";

export type SalvageState =
  | "attached" | "exposed" | "detached_intact" | "acquiring" | "towed" | "secured_run"
  | "fitted_run" | "stowed_run" | "banked" | "destroyed_scrap" | "damaged_scrap" | "expired" | "owner_drop";

const ALLOWED: Record<SalvageState, SalvageState[]> = {
  attached: ["exposed", "detached_intact", "destroyed_scrap", "damaged_scrap"],
  exposed: ["attached", "detached_intact", "destroyed_scrap", "damaged_scrap"],
  detached_intact: ["acquiring", "damaged_scrap", "expired", "banked"],
  acquiring: ["detached_intact", "towed", "damaged_scrap", "expired"],
  towed: ["detached_intact", "secured_run", "damaged_scrap", "banked"],
  secured_run: ["fitted_run", "stowed_run", "banked", "damaged_scrap"],
  fitted_run: ["owner_drop", "stowed_run", "banked", "damaged_scrap"],
  stowed_run: ["fitted_run", "banked", "damaged_scrap"],
  owner_drop: ["acquiring", "expired", "damaged_scrap", "banked"],
  banked: [],
  destroyed_scrap: [],
  damaged_scrap: [],
  expired: [],
};

export const PICKUP_INVULN_SEC = 2;
export const PICKUP_LIFETIME_SEC = 40;
export const PICKUP_WARN_SEC = 10;
export const CAPTURE_MIN_FRACTION = 0.35;

export interface SalvageItem {
  instanceId: string;      // e.g. "run3:B02:tail"
  templateId: string;      // weapon id, e.g. "W022"
  sourceEncounter: string; // boss/enemy id or "player"
  slot: string;
  state: SalvageState;
  pos: Vec;
  prev: Vec;
  vel: Vec;
  integrity: number;
  integrityMax: number;
  mass: number;
  lifetime: number;
  invuln: number;
  repairedOnce: boolean;
  history: { tx: string; from: SalvageState; to: SalvageState; tick: number }[];
}

export function makeItem(instanceId: string, templateId: string, source: string, slot: string, integrityMax: number, mass: number): SalvageItem {
  return {
    instanceId, templateId, sourceEncounter: source, slot, state: "attached",
    pos: { x: 0, y: 0 }, prev: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    integrity: integrityMax, integrityMax, mass, lifetime: PICKUP_LIFETIME_SEC, invuln: 0, repairedOnce: false, history: [],
  };
}

export function canTransition(from: SalvageState, to: SalvageState): boolean {
  return ALLOWED[from].includes(to);
}

// Applies a transition once per tx id. Returns true if the item is now in `to`
// because of this call (false for illegal transitions and replays).
export function transition(item: SalvageItem, to: SalvageState, tx: string, tick: number): boolean {
  if (item.history.some((h) => h.tx === tx)) return false;
  if (!canTransition(item.state, to)) return false;
  item.history.push({ tx, from: item.state, to, tick });
  item.state = to;
  return true;
}

export function isIntact(item: SalvageItem): boolean {
  return item.integrity / item.integrityMax >= CAPTURE_MIN_FRACTION;
}

export function isLoose(item: SalvageItem): boolean {
  return item.state === "detached_intact" || item.state === "owner_drop" || item.state === "acquiring";
}

// Loose pickups age unless paused (boss phase transitions); returns true on expiry.
export function ageLoose(item: SalvageItem, dt: number, timerPaused: boolean, tick: number): boolean {
  item.invuln = Math.max(0, item.invuln - dt);
  if (!isLoose(item) || timerPaused) return false;
  item.lifetime = Math.max(0, item.lifetime - dt);
  return item.lifetime === 0 && transition(item, "expired", `expire:${item.instanceId}:${tick}`, tick);
}
