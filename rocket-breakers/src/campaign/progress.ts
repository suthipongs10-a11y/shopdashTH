// Campaign progress rules (pure): sequential unlocks and the research pool.
import type { Catalog } from "../core/catalog";
import type { MissionRow } from "../core/types";
import type { Profile } from "../save/profile";
import { missionPlayable } from "./missionDirector";

export const cleared = (p: Profile, id: string): boolean => !!p.mission_records[id]?.stars[0];

// Missions unlock sequentially. While a mission is not built yet ("coming soon")
// it never blocks the next one (DECISIONS: M2 stage 1 unlock bridge). Players who
// cleared the old test mission keep access to that boss.
export function missionUnlocked(c: Catalog, p: Profile, m: MissionRow): boolean {
  if (!m.unlock_prev) return true;
  if (cleared(p, m.unlock_prev)) return true;
  if (m.encounter_id && p.boss_archive[m.encounter_id]?.cleared) return true;
  const prev = c.mission(m.unlock_prev);
  return !missionPlayable(prev) && missionUnlocked(c, p, prev);
}

// Weapons an E04 cargo module may contain: starter research plus research unlocked by cleared missions.
export function researchPool(c: Catalog, p: Profile): string[] {
  return c.raw.weapons.filter((w) => w.source === "research" && (w.unlock === "starter" || cleared(p, w.unlock))).map((w) => w.id);
}
