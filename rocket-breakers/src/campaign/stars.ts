// Star objective evaluation (AGENTS §6, SYSTEMS §6). Stars are only evaluated on a
// successful run, from counters recorded during play; B/C require A on that run.
import type { MissionRow } from "../core/types";

export interface ObjectiveStats {
  supplyDestroyed: number;
  coreDamage: number;          // after shields; repairs never undo it
  securedIntact: string[];     // template ids secured/banked intact this run
  interrupts: number;          // boss charge interrupts landed
  namedAttackHits?: number;    // hits from the boss's signature attack
  cargoDestroyed?: number;     // parts destroyed after the player started towing them
}

export function emptyStats(): ObjectiveStats {
  return { supplyDestroyed: 0, coreDamage: 0, securedIntact: [], interrupts: 0, namedAttackHits: 0 };
}

// Objective keys this build can evaluate; others are shown but cannot be earned yet.
export const SUPPORTED_OBJECTIVES = new Set(["clear_mission", "destroy_supply_nodes", "core_damage_at_most", "secure_signature", "avoid_named_attack_hits", "secure_intact_parts", "cargo_destroyed_at_most"]);

export function objectiveMet(o: MissionRow["star_objectives"][number], s: ObjectiveStats, victory: boolean): boolean {
  if (!victory) return false;
  switch (o.key) {
    case "clear_mission": return true;
    case "destroy_supply_nodes": return s.supplyDestroyed >= o.threshold;
    case "core_damage_at_most": return Math.round(s.coreDamage) <= o.threshold;
    case "secure_intact_parts": return s.securedIntact.length >= o.threshold;
    case "cargo_destroyed_at_most": return (s.cargoDestroyed ?? 0) <= o.threshold;
    case "avoid_named_attack_hits": return (s.namedAttackHits ?? 0) <= o.threshold;
    case "secure_signature": return !!o.target_id && s.securedIntact.includes(o.target_id);
    default: return false;
  }
}

export function evaluateStars(m: MissionRow, s: ObjectiveStats, victory: boolean): [boolean, boolean, boolean] {
  const r = m.star_objectives.map((o) => objectiveMet(o, s, victory));
  return [!!r[0], !!r[1], !!r[2]];
}

// new_stars[i] = old_stars[i] OR earned[i]
export function mergeStars(old: readonly boolean[] | undefined, earned: readonly boolean[]): [boolean, boolean, boolean] {
  return [0, 1, 2].map((i) => !!old?.[i] || !!earned[i]) as [boolean, boolean, boolean];
}
