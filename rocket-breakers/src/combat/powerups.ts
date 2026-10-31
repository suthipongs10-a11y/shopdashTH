// Temporary pickups (expansion 1.1, data/powerups.json). Separate from XP choices,
// research and physical salvage: buffs expire, refresh instead of stacking, and
// never touch signature modules or blueprint fragments.
import powerupsJson from "../../data/powerups.json";
import type { Names } from "../core/types";
import type { Rng } from "../core/rng";

export interface PickupDef {
  id: string;
  name: Names;
  duration_sec: number;
  model: string;
  params: Record<string, unknown>;
  compatibility: string;
  icon_asset_id: string;
}

export interface DropRules {
  eligible_kill_increment: number;
  elite_increment: number;
  threshold: number;
  live_pickup_cap: number;
  ordinary_lifetime_sec: number;
}

const DATA = powerupsJson as unknown as { pickups: PickupDef[]; drop_rules: DropRules };
export const PICKUPS: PickupDef[] = DATA.pickups;
export const DROP_RULES: DropRules = DATA.drop_rules;
export const pickupDef = (id: string): PickupDef => PICKUPS.find((p) => p.id === id)!;

// Implemented so far; the rest (support emitters, chain arc, fusion core) follow.
export const IMPLEMENTED = new Set(["PU01", "PU02", "PU05", "PU06", "PU07", "PU08", "PU09", "PU12"]);
export const ROLE: Record<string, "offense" | "survival" | "resource"> = {
  PU01: "offense", PU02: "offense", PU03: "offense", PU04: "offense", PU10: "offense",
  PU05: "survival", PU06: "survival", PU08: "survival",
  PU07: "resource", PU09: "resource", PU11: "resource", PU12: "resource",
};
const ROLE_WEIGHT = { offense: 0.4, survival: 0.4, resource: 0.2 };

export const PICKUP_RADIUS = 46;
export const MAGNET_SPEED = 520;
export const CONVERT_CHARGE = 10;

export interface Pickup {
  instanceId: string;
  defId: string;
  pos: { x: number; y: number };
  prev: { x: number; y: number };
  life: number;
  lifeMax: number;
}

export interface ScrapMote {
  id: number;
  pos: { x: number; y: number };
  prev: { x: number; y: number };
  vel: { x: number; y: number };
  value: number;
  life: number;
}

// Timed buffs: same pickup refreshes to its configured duration, never stacks.
export class BuffManager {
  readonly remaining = new Map<string, number>();

  apply(def: PickupDef): void {
    if (def.duration_sec > 0) this.remaining.set(def.id, def.duration_sec);
  }

  has(id: string): boolean { return (this.remaining.get(id) ?? 0) > 0; }

  tick(dt: number): string[] {
    const expired: string[] = [];
    for (const [id, t] of this.remaining) {
      const left = t - dt;
      if (left <= 0) { this.remaining.delete(id); expired.push(id); } else this.remaining.set(id, left);
    }
    return expired;
  }
}

// Seeded shared accumulator: +0.04 per eligible kill (+0.25 elite); at 1 a drop
// is generated and 1 subtracted. One proc per enemy source id.
export class DropDirector {
  value = 0;
  private procced = new Set<string>();

  onKill(sourceId: string, elite: boolean): boolean {
    if (this.procced.has(sourceId)) return false;
    this.procced.add(sourceId);
    this.value += elite ? DROP_RULES.elite_increment : DROP_RULES.eligible_kill_increment;
    if (this.value >= DROP_RULES.threshold) { this.value -= DROP_RULES.threshold; return true; }
    return false;
  }
}

// Deterministic weighted choice among compatible, implemented pickups.
// Low core HP biases survival to 60% without touching enemy damage.
export function choosePickup(rng: Rng, compatible: (id: string) => boolean, lowHp: boolean): string | null {
  const pool = PICKUPS.filter((p) => IMPLEMENTED.has(p.id) && p.id !== "PU11" && compatible(p.id));
  if (!pool.length) return null;
  const weights = lowHp ? { offense: 0.25, survival: 0.6, resource: 0.15 } : ROLE_WEIGHT;
  const byRole = (r: keyof typeof ROLE_WEIGHT) => pool.filter((p) => ROLE[p.id] === r);
  const roles = (Object.keys(weights) as (keyof typeof ROLE_WEIGHT)[]).filter((r) => byRole(r).length);
  const total = roles.reduce((s, r) => s + weights[r], 0);
  let x = rng.next() * total;
  for (const r of roles) {
    x -= weights[r];
    if (x <= 0) { const list = byRole(r); return list[rng.int(list.length)].id; }
  }
  const list = byRole(roles[roles.length - 1]);
  return list[rng.int(list.length)].id;
}
