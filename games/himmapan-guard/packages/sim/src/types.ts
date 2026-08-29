import type {
  DamageType,
  DeployPos,
  Element,
  Enemy,
  EnemyTrait,
  Hero,
  Race,
  Skill,
  StatusKind,
} from '@himmapan/data';

export type Faction = 'hero' | 'enemy';

export interface StatusEffect {
  kind: StatusKind;
  /** วินาทีที่เหลือ */
  remaining: number;
  /** ค่าที่คำนวณไว้แล้วตอนติด (slow = สัดส่วน, shield = พลังโล่คงเหลือ, poison = ดาเมจ/วินาที) */
  value: number;
  sourceUid: number;
}

export type ModStat = 'atk' | 'def' | 'mres' | 'aspd' | 'block' | 'range' | 'hp' | 'crit_rate' | 'crit_dmg';

export interface StatMod {
  stat: ModStat;
  mult: number;
  add: number;
  /** Infinity = ตลอดด่าน */
  remaining: number;
}

export interface CombatStats {
  atk: number;
  def: number;
  mres: number;
  aspd: number;
  range: number;
  critRate: number;
  critDmg: number;
}

export interface RuntimeSkill {
  def: Skill;
  cd: number;
}

interface UnitCommon {
  uid: number;
  name: string;
  element: Element;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  base: CombatStats;
  damageType: DamageType;
  statuses: StatusEffect[];
  mods: StatMod[];
  skills: RuntimeSkill[];
  attackCd: number;
  alive: boolean;
  /** สถิติสะสมเพื่อรายงานผลด่าน */
  damageDealt: number;
  damageTaken: number;
  kills: number;
}

export interface HeroUnit extends UnitCommon {
  faction: 'hero';
  heroId: string;
  def: Hero;
  level: number;
  pos: DeployPos;
  tileX: number;
  tileY: number;
  facing: number;
  blockCount: number;
  /** uid ของศัตรูที่กำลังบล็อคอยู่ */
  blocking: number[];
  cost: number;
  /** เวลารอก่อนโจมตีครั้งแรกหลังวาง */
  windup: number;
  ultCd: number;
  ultMaxCd: number;
  hasUlt: boolean;
  antiAir: number;
  revealAura: number;
  lifesteal: number;
  splash: { radius: number; ratio: number } | null;
  costRate: number;
  /** โบนัสความเสียหายเจาะเผ่า (§5.3) — Phase 6 การ์ดจะเติมค่าให้ */
  raceBonus: Partial<Record<Race, number>>;
  /** โบนัสความเสียหายตามธาตุที่ใช้โจมตี */
  elementBonus: Partial<Record<Element, number>>;
  targetUid: number | null;
  deployedAtTick: number;
}

export interface EnemyUnit extends UnitCommon {
  faction: 'enemy';
  enemyId: string;
  def: Enemy;
  race: Race;
  traits: EnemyTrait[];
  pathId: string;
  dist: number;
  moveSpeed: number;
  blockWeight: number;
  leakDamage: number;
  blockedBy: number | null;
  bountyGold: number;
  bountyExp: number;
  targetUid: number | null;
}

export type Unit = HeroUnit | EnemyUnit;

export function isHero(u: Unit): u is HeroUnit {
  return u.faction === 'hero';
}
export function isEnemy(u: Unit): u is EnemyUnit {
  return u.faction === 'enemy';
}

/* ------------------------------------------------------------------ */
/* คำสั่งของผู้เล่น — เก็บเป็น log เพื่อ replay/ตรวจฝั่ง server (§13.2)   */
/* ------------------------------------------------------------------ */

export type Command =
  | { type: 'deploy'; tick: number; heroId: string; tileX: number; tileY: number; facing: number }
  | { type: 'retreat'; tick: number; uid: number }
  | { type: 'ultimate'; tick: number; uid: number };

export type BattleEvent =
  | { t: 'spawn'; uid: number; enemyId: string }
  | { t: 'deploy'; uid: number; heroId: string; tileX: number; tileY: number }
  | { t: 'retreat'; uid: number }
  | { t: 'hit'; from: number; to: number; amount: number; crit: boolean; kind: DamageType; matchup: 'advantage' | 'disadvantage' | 'neutral' }
  | { t: 'heal'; from: number; to: number; amount: number }
  | { t: 'death'; uid: number; faction: Faction }
  | { t: 'leak'; uid: number; damage: number }
  | { t: 'skill'; uid: number; skillId: string; vfx: string; x: number; y: number; radius: number }
  | { t: 'status'; uid: number; kind: StatusKind; durationSec: number }
  | { t: 'wave'; waveId: string; label: string }
  | { t: 'end'; win: boolean };

export type BattleStatus = 'running' | 'won' | 'lost';

export interface HeroReport {
  uid: number;
  heroId: string;
  name: string;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  healed: number;
  alive: boolean;
}

export interface BattleResult {
  status: BattleStatus;
  win: boolean;
  stars: number;
  ticks: number;
  elapsedSec: number;
  baseHp: number;
  baseHpMax: number;
  leaks: number;
  enemiesKilled: number;
  enemiesTotal: number;
  heroesUsed: number;
  ultimatesUsed: number;
  goldEarned: number;
  expEarned: number;
  heroes: HeroReport[];
}
