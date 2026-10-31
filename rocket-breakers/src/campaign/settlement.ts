// Reward settlement (SYSTEMS §5–6). Journal protocol: write pending → apply delta
// once → record applied id → clear pending. Replays after a crash are idempotent.
import type { Profile } from "../save/profile";
import { mergeStars, type ObjectiveStats } from "./stars";

export interface SecuredItem { instanceId: string; templateId: string; source: string; intact: boolean; scrapValue: number }

export interface RunResult {
  runId: string;
  missionId: string;
  sector: number;
  missionIndex: number;
  victory: boolean;
  score: number;
  combatCredits: number;
  combatScrap: number;
  secured: SecuredItem[];      // intact items secured/banked this leg (victory auto-secure included)
  unbanked: SecuredItem[];     // intact items still loose/towed at defeat
  severed: string[];           // boss ids whose signature joint was severed (any outcome)
  stolen: string[];            // boss ids whose signature was secured intact
  encounterIds: string[];      // bosses defeated
  stats?: ObjectiveStats;      // objective counters (campaign missions)
  stars?: [boolean, boolean, boolean] | null; // stars earned this run (null for the test mission)
}

export interface Settlement {
  id: string;
  credits: number;
  scrap: number;
  fragments: Record<string, number>;
  fallbackFragments: string[];
  archive: Record<string, { severed: number; stolen: number; cleared: boolean }>;
  firstClear: boolean;
  missionId: string;
  victory: boolean;
  score: number;
  stars: [boolean, boolean, boolean] | null;      // earned this run
  research: Record<string, number>;              // intact non-signature modules secured → research progress
}

const MAX_APPLIED = 100;

export function baselineRewards(sector: number, mission: number): { credits: number; scrap: number } {
  return { credits: 180 + 70 * sector + 25 * mission, scrap: 15 + 5 * sector + 3 * mission };
}

export function computeSettlement(p: Profile, r: RunResult, signatureOf: (bossId: string) => string): Settlement {
  const base = baselineRewards(r.sector, r.missionIndex);
  const firstClear = r.victory && !(p.test_records[r.missionId]?.clears) && !(p.mission_records[r.missionId]?.stars[0]);
  let credits: number;
  let scrap: number;
  if (r.victory) {
    credits = firstClear ? base.credits * 2 : Math.floor(base.credits * 0.6);
    scrap = base.scrap + r.combatScrap;
  } else {
    credits = Math.floor(Math.min(r.combatCredits * 0.25, base.credits * 0.25));
    const unbankedScrap = r.unbanked.reduce((s, it) => s + it.scrapValue, 0);
    scrap = Math.floor((r.combatScrap + unbankedScrap) * 0.25);
  }
  const fragments: Record<string, number> = {};
  const fallbackFragments: string[] = [];
  const archive: Settlement["archive"] = {};
  const research: Record<string, number> = {};
  for (const bossId of new Set([...r.severed, ...r.encounterIds])) {
    const prev = p.boss_archive[bossId] ?? { severed: 0, stolen: 0, cleared: false };
    archive[bossId] = {
      severed: prev.severed + (r.severed.includes(bossId) ? 1 : 0),
      stolen: prev.stolen + (r.victory && r.stolen.includes(bossId) ? 1 : 0),
      cleared: prev.cleared || (r.victory && r.encounterIds.includes(bossId)),
    };
  }
  if (r.victory) {
    // At most one signature fragment per boss per attempt.
    for (const it of r.secured) {
      if (it.intact && signatureOf(it.source) === it.templateId) fragments[it.templateId] = 1;
      else if (it.intact && it.source !== "player") research[it.templateId] = (research[it.templateId] ?? 0) + 1;
    }
    // First clear fallback: never stacks with intact salvage for the same signature.
    for (const bossId of r.encounterIds) {
      const sig = signatureOf(bossId);
      const cleared = p.boss_archive[bossId]?.cleared ?? false;
      if (!cleared && !fragments[sig] && !(p.blueprint_fragments[sig] > 0)) {
        fragments[sig] = 1;
        fallbackFragments.push(sig);
      }
    }
  }
  return { id: `${p.profile_id}/${r.runId}/0`, credits, scrap, fragments, fallbackFragments, archive, firstClear,
    missionId: r.missionId, victory: r.victory, score: r.score, stars: r.victory ? r.stars ?? null : null, research };
}

// Applies a settlement exactly once. Returns false when it was already applied.
export function applySettlement(p: Profile, s: Settlement): boolean {
  if (p.applied_settlements.includes(s.id)) {
    if ((p.pending_settlement as Settlement | null)?.id === s.id) p.pending_settlement = null;
    return false;
  }
  p.credits += s.credits;
  p.scrap += s.scrap;
  for (const [id, n] of Object.entries(s.fragments)) p.blueprint_fragments[id] = (p.blueprint_fragments[id] ?? 0) + n;
  for (const [id, a] of Object.entries(s.archive)) p.boss_archive[id] = a;
  for (const [id, n] of Object.entries(s.research ?? {})) p.weapon_research[id] = (p.weapon_research[id] ?? 0) + n;
  if (s.stars) {
    const old = p.mission_records[s.missionId];
    p.mission_records[s.missionId] = { stars: mergeStars(old?.stars, s.stars), best_score: Math.max(old?.best_score ?? 0, s.score), difficulty_records: old?.difficulty_records ?? {} };
  }
  const rec = p.test_records[s.missionId] ?? { clears: 0, attempts: 0, best_score: 0 };
  rec.attempts += 1;
  if (s.victory) rec.clears += 1;
  rec.best_score = Math.max(rec.best_score, s.score);
  p.test_records[s.missionId] = rec;
  p.applied_settlements.push(s.id);
  if (p.applied_settlements.length > MAX_APPLIED) p.applied_settlements.splice(0, p.applied_settlements.length - MAX_APPLIED);
  p.pending_settlement = null;
  return true;
}

// Full journal protocol against a persistence callback. `crashAfter` injects a
// failure for tests ("pending" = after writing the journal, "applied" = after applying in memory).
export function settle(p: Profile, s: Settlement, persist: (p: Profile) => boolean, crashAfter?: "pending" | "applied"): void {
  if (!p.applied_settlements.includes(s.id)) {
    p.pending_settlement = s;
    persist(p);
    if (crashAfter === "pending") throw new Error("injected crash after pending write");
    applySettlement(p, s);
    if (crashAfter === "applied") throw new Error("injected crash before final write");
  }
  persist(p);
}

// Boot-time recovery: finish a settlement left pending by a crash.
export function recoverPending(p: Profile): boolean {
  const s = p.pending_settlement as Settlement | null;
  if (!s) return false;
  applySettlement(p, s);
  p.pending_settlement = null;
  return true;
}
