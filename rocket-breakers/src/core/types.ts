// Row shapes of data/catalog.json (schema 1). Catalog stays the source of truth;
// these types only describe the fields the runtime reads.
export type Cell = [number, number];
export interface Names { th: string; en: string }

export interface HullRow {
  id: string; name: Names; hp: number; shield: number; base_speed: number; mass_cap: number;
  reactor_capacity: number; energy_regen: number; socket_mask: Cell[]; reactor_cell: Cell;
  cargo_capacity: number; asset_id: string; passive: string;
  starter_loadout: { weapon_id: string; grid_origin: Cell }[] | null;
}

export interface WeaponRow {
  id: string; name: Names; family: string; attack_model: string; damage: number; trigger_rate: number;
  projectiles_per_trigger: number; energy_per_trigger: number; heat_per_trigger: number; mass: number;
  footprint: Cell[]; rotation_allowed: boolean; firing_arc_deg: number;
  special_params: Record<string, number>; source: string; salvage_source: string | null;
  unlock: string; asset_id: string; fabrication_credits: number; fabrication_scrap: number;
}

export interface UtilityRow {
  id: string; name: Names; effect: string; mass: number; footprint: Cell[]; max_copies: number;
  unlock: string; asset_id: string;
}

export interface BossRow {
  id: string; name: Names; sector_id: string; role: string; core_hp: number; armor: number; joint_hp: number;
  signature_module_integrity: number; signature_part_name: string; signature_weapon_id: string;
  ability_unlock_id: string | null; expose_trigger: string; stolen_behavior: string; compensation_phase: string;
  phase_patterns: Record<string, string[]>; minimum_telegraph_sec: number; signature_asset_id: string;
  core_asset_id: string; part_budget: number; respawn_signature: boolean;
}

export interface EnemyRow {
  id: string; name: Names; role: string; attack_model: string; movement: string; base_hp: number;
  base_damage: number; speed: number; telegraph_sec: number; threat_cost: number; xp: number;
  asset_id: string; counter: string;
}

export interface MissionRow {
  id: string; name: Names; sector_id: string; role: string; unlock_prev: string | null;
  encounter_id: string | null; duration_target_sec: number; hazard_id: string; seed: number;
  waves: Record<string, unknown>[];
  star_objectives: { key: string; threshold: number; target_id?: string; description_th: string }[];
  rewards: { credits: number; scrap: number };
}

export interface SectorRow {
  id: string; name: Names; unlock_total_stars: number; requires_previous_final: string | null;
  planet_asset_id: string;
}

export interface CatalogRaw {
  schema_version: number; content_version: string; counts: Record<string, number>;
  sectors: SectorRow[]; hulls: HullRow[]; weapons: WeaponRow[]; utilities: UtilityRow[];
  bosses: BossRow[]; enemies: EnemyRow[]; missions: MissionRow[];
  abilities: { id: string; name: Names; unlock_source: string; [k: string]: unknown }[];
  hazards: { id: string; name: Names; [k: string]: unknown }[];
  fusions: { id: string; name: string | Names; requires_utility: string; [k: string]: unknown }[];
}
