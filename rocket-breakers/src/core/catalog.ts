// Loads and validates data/catalog.json: counts, unique IDs, every cross-reference
// and starter-loadout legality. Invalid catalogs never reach gameplay.
import rawJson from "../../data/catalog.json";
import type { BossRow, CatalogRaw, EnemyRow, HullRow, UtilityRow, WeaponRow, MissionRow } from "./types";

export const SUPPORTED_SCHEMA = 1;
export const EXPECTED_COUNTS: Record<string, number> = {
  sectors: 8, missions: 48, hulls: 12, weapons: 36, abilities: 12,
  utilities: 12, bosses: 16, enemies: 24, hazards: 8, fusions: 8,
};

type Group = keyof typeof EXPECTED_COUNTS;

export class Catalog {
  readonly errors: string[] = [];
  private index = new Map<string, Map<string, { id: string }>>();

  constructor(readonly raw: CatalogRaw) {
    this.validate();
  }

  get valid(): boolean {
    return this.errors.length === 0;
  }

  row<T>(group: Group, id: string): T | undefined {
    return this.index.get(group)?.get(id) as T | undefined;
  }

  hull(id: string): HullRow { return this.must<HullRow>("hulls", id); }
  weapon(id: string): WeaponRow { return this.must<WeaponRow>("weapons", id); }
  utility(id: string): UtilityRow { return this.must<UtilityRow>("utilities", id); }
  boss(id: string): BossRow { return this.must<BossRow>("bosses", id); }
  enemy(id: string): EnemyRow { return this.must<EnemyRow>("enemies", id); }
  mission(id: string): MissionRow { return this.must<MissionRow>("missions", id); }

  campaignStarSlots(): number {
    return this.raw.missions.reduce((n, m) => n + m.star_objectives.length, 0);
  }

  private must<T>(group: Group, id: string): T {
    const r = this.row<T>(group, id);
    if (!r) throw new Error(`unknown ${group} id ${id}`);
    return r;
  }

  private fail(msg: string): void {
    this.errors.push(msg);
  }

  private ref(where: string, group: Group, id: unknown): void {
    if (typeof id !== "string" || !this.index.get(group)?.has(id)) this.fail(`${where} -> unknown ${group} id '${id}'`);
  }

  private validate(): void {
    const raw = this.raw;
    if (raw.schema_version !== SUPPORTED_SCHEMA) {
      this.fail(`unsupported catalog schema_version ${raw.schema_version}`);
      return;
    }
    for (const group of Object.keys(EXPECTED_COUNTS)) {
      const rows = (raw as unknown as Record<string, { id: string }[]>)[group];
      if (!Array.isArray(rows)) { this.fail(`missing group ${group}`); continue; }
      if (rows.length !== EXPECTED_COUNTS[group]) this.fail(`${group} count ${rows.length} != ${EXPECTED_COUNTS[group]}`);
      const ids = new Map<string, { id: string }>();
      for (const r of rows) {
        if (!r.id || ids.has(r.id)) this.fail(`${group} has empty or duplicate id '${r.id}'`);
        ids.set(r.id, r);
      }
      this.index.set(group, ids);
    }
    if (this.errors.length) return;
    if (this.campaignStarSlots() !== 144 || raw.counts.campaign_stars !== 144) this.fail("campaign stars must total 144");
    for (const m of raw.missions) {
      this.ref(`${m.id}.sector_id`, "sectors", m.sector_id);
      this.ref(`${m.id}.hazard_id`, "hazards", m.hazard_id);
      if (m.unlock_prev !== null) this.ref(`${m.id}.unlock_prev`, "missions", m.unlock_prev);
      if (m.encounter_id !== null) this.ref(`${m.id}.encounter_id`, "bosses", m.encounter_id);
      for (const w of m.waves) {
        if ("enemy_id" in w) this.ref(`${m.id}.wave.enemy_id`, "enemies", w.enemy_id);
        if ("encounter_id" in w) this.ref(`${m.id}.wave.encounter_id`, "bosses", w.encounter_id);
      }
      if (m.star_objectives.length !== 3) this.fail(`${m.id} must have exactly 3 star objectives`);
      for (const o of m.star_objectives) if (o.key === "secure_signature") this.ref(`${m.id}.secure_signature`, "weapons", o.target_id);
      if (m.rewards.credits <= 0 || m.rewards.scrap <= 0) this.fail(`${m.id} rewards must be positive`);
    }
    for (const b of raw.bosses) {
      this.ref(`${b.id}.sector_id`, "sectors", b.sector_id);
      this.ref(`${b.id}.signature_weapon_id`, "weapons", b.signature_weapon_id);
      const w = this.row<WeaponRow>("weapons", b.signature_weapon_id);
      if (w && w.salvage_source !== b.id) this.fail(`${b.id} signature weapon does not point back to boss`);
      if (b.ability_unlock_id !== null) {
        const a = raw.abilities.find((x) => x.id === b.ability_unlock_id);
        if (!a || a.unlock_source !== b.id) this.fail(`${b.id} ability_unlock_id mismatch`);
      }
    }
    for (const a of raw.abilities) this.ref(`abilities.${a.id}.unlock_source`, "bosses", a.unlock_source);
    for (const f of raw.fusions) this.ref(`fusions.${f.id}.requires_utility`, "utilities", f.requires_utility);
    for (const s of raw.sectors) {
      const count = raw.missions.filter((m) => m.sector_id === s.id).length;
      if (count !== 6) this.fail(`sector ${s.id} has ${count} missions, expected 6`);
      const n = Number(s.id.slice(1));
      if (s.unlock_total_stars > (n - 1) * 6) this.fail(`sector ${s.id} star gate could softlock clear-only progression`);
      if (s.requires_previous_final !== null) this.ref(`sectors.${s.id}.requires_previous_final`, "missions", s.requires_previous_final);
    }
    for (const w of raw.weapons) {
      if (w.damage <= 0 || w.trigger_rate <= 0) this.fail(`weapon ${w.id} needs positive damage and trigger_rate`);
      if (w.salvage_source !== null) this.ref(`weapons.${w.id}.salvage_source`, "bosses", w.salvage_source);
    }
    for (const h of raw.hulls) this.validateHull(h);
  }

  // Starter loadouts must be legal fits: on mask, no overlap, under mass cap,
  // sustained draw <= 80% of reactor regen (SYSTEMS §3).
  private validateHull(h: HullRow): void {
    const key = (x: number, y: number) => `${x},${y}`;
    const mask = new Set(h.socket_mask.map(([x, y]) => key(x, y)));
    if (!mask.has(key(...h.reactor_cell))) this.fail(`hull ${h.id} reactor cell outside socket mask`);
    const occupied = new Set<string>();
    let mass = 0;
    let energy = 0;
    for (const item of h.starter_loadout ?? []) {
      const w = this.row<WeaponRow>("weapons", item.weapon_id);
      if (!w) { this.fail(`hull ${h.id} starter weapon ${item.weapon_id} unknown`); continue; }
      for (const [px, py] of w.footprint) {
        const k = key(item.grid_origin[0] + px, item.grid_origin[1] + py);
        if (!mask.has(k) || occupied.has(k)) this.fail(`hull ${h.id} starter ${w.id} illegal cell ${k}`);
        occupied.add(k);
      }
      mass += w.mass;
      energy += w.energy_per_trigger * w.trigger_rate;
    }
    if (mass > h.mass_cap) this.fail(`hull ${h.id} starter loadout over mass cap`);
    if (energy > h.energy_regen * 0.8 + 1e-6) this.fail(`hull ${h.id} starter loadout exceeds 80% energy regen`);
  }
}

let shared: Catalog | null = null;

export function loadCatalog(): Catalog {
  shared ??= new Catalog(rawJson as unknown as CatalogRaw);
  return shared;
}
