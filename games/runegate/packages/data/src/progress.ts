/**
 * คณิตศาสตร์การเติบโตของฮีโร่ (§6.2) — เลเวล / ดาว / ปลุกพลัง / ระดับสกิล
 *
 * ไฟล์นี้อยู่ใน `data` ไม่ใช่ `meta` เพราะ `sim` ต้องใช้คำนวณสถิติตอนวางฮีโร่
 * แต่ `sim` ห้ามพึ่ง `meta` (meta เป็นชั้นนอกด่าน) — ที่นี่มีแต่ฟังก์ชันบริสุทธิ์
 * ค่าคงที่ทั้งหมดมาจาก `content/progression.json` ที่ส่งเข้ามาเป็นพารามิเตอร์ (§0 ข้อ 8)
 */
import type { Hero, HeroStats } from './schema/hero.js';
import { MAX_LEVEL_BY_STAR } from './schema/hero.js';
import type { ProgressionConfig } from './schema/progression.js';
import type { Effect, Skill } from './schema/skill.js';

/** สภาพการเติบโตของฮีโร่ 1 ตัว — ฟิลด์ที่ไม่ใส่ = ค่าตั้งต้น */
export interface HeroProgress {
  level: number;
  /** ดาวปัจจุบัน — ไม่ระบุ = ดาวธรรมชาติ (เท่ากับ rarity) */
  star?: number;
  awakened?: boolean;
  /** ระดับสกิลรายตัว (key = skillId) — ไม่ระบุ = 1 */
  skillLevels?: Readonly<Record<string, number>>;
}

/** ดาวธรรมชาติ = ระดับความหายากตอนได้มา (3/4/5) */
export function naturalStar(hero: Hero): number {
  return hero.rarity;
}

export function maxLevelForStar(star: number): number {
  const s = Math.min(6, Math.max(1, Math.floor(star)));
  return MAX_LEVEL_BY_STAR[s] ?? MAX_LEVEL_BY_STAR[1]!;
}

/** EXP ที่ต้องใช้เลื่อนจากเลเวล L → L+1 */
export function expToNextLevel(cfg: ProgressionConfig, level: number): number {
  const l = Math.max(1, Math.floor(level));
  return Math.round(cfg.level.expBase * Math.pow(l, cfg.level.expExponent));
}

/** ทองที่ต้องใช้เลื่อนจากเลเวล L → L+1 */
export function goldToNextLevel(cfg: ProgressionConfig, level: number): number {
  const l = Math.max(1, Math.floor(level));
  return Math.round(cfg.level.goldBase * Math.pow(l, cfg.level.goldExponent));
}

/** ตัวคูณสถิติรวมจากดาวที่เพิ่มมาจากดาวธรรมชาติ + ปลุกพลัง */
export function statMultiplier(cfg: ProgressionConfig, hero: Hero, p: HeroProgress): number {
  const star = Math.max(naturalStar(hero), Math.floor(p.star ?? naturalStar(hero)));
  const extraStars = Math.max(0, star - naturalStar(hero));
  const awaken = p.awakened ? cfg.awaken.statBonus : 0;
  return 1 + cfg.star.statBonusPerStar * extraStars + awaken;
}

/**
 * สถิติจริงของฮีโร่ (ยังไม่รวมรูน/อุปกรณ์ — Phase 6)
 * ดาว/ปลุกพลังคูณเฉพาะ hp/atk/def — ไม่แตะ aspd/คริ เพื่อให้จังหวะการตีคาดเดาได้
 */
export function heroStatsFor(cfg: ProgressionConfig, hero: Hero, p: HeroProgress): HeroStats {
  const cap = maxLevelForStar(p.star ?? naturalStar(hero));
  const l = Math.min(cap, Math.max(1, Math.floor(p.level))) - 1;
  const m = statMultiplier(cfg, hero, p);
  return {
    ...hero.base,
    hp: Math.round((hero.base.hp + hero.growth.hp * l) * m),
    atk: Math.round((hero.base.atk + hero.growth.atk * l) * m),
    def: Math.round((hero.base.def + hero.growth.def * l) * m),
  };
}

/** ตัวคูณความแรงของสกิลที่ระดับ n (ระดับ 1 = 1.0 เสมอ) */
export function skillPowerMult(cfg: ProgressionConfig, level: number): number {
  return 1 + cfg.skill.powerPerLevel * (clampSkillLevel(cfg, level) - 1);
}

/** ตัวคูณคูลดาวน์ของสกิลที่ระดับ n (ระดับ 1 = 1.0 เสมอ) */
export function skillCooldownMult(cfg: ProgressionConfig, level: number): number {
  return Math.max(0.2, 1 - cfg.skill.cooldownCutPerLevel * (clampSkillLevel(cfg, level) - 1));
}

export function clampSkillLevel(cfg: ProgressionConfig, level: number): number {
  return Math.min(cfg.skill.maxLevel, Math.max(1, Math.floor(level)));
}

/**
 * สกิลที่ปรับตามระดับแล้ว — คืน object ใหม่เสมอ (ไม่แตะของเดิม)
 * ระดับ 1 คืนตัวเดิมทั้งก้อน เพื่อให้ผลจำลองเดิมไม่ขยับแม้แต่หลักทศนิยม
 */
export function skillAtLevel(cfg: ProgressionConfig, skill: Skill, level: number, awakened = false): Skill {
  const lv = clampSkillLevel(cfg, level);
  const power = skillPowerMult(cfg, lv);
  const cdCut = skillCooldownMult(cfg, lv);
  const ultCut = awakened && skill.type === 'ultimate' ? 1 - cfg.awaken.ultCooldownCut : 1;
  if (power === 1 && cdCut === 1 && ultCut === 1) return skill;
  return {
    ...skill,
    cooldownSec: round2(skill.cooldownSec * cdCut * ultCut),
    effects: skill.effects.map((e) => scaleEffect(e, power)),
  };
}

function scaleEffect(e: Effect, power: number): Effect {
  switch (e.kind) {
    case 'damage':
    case 'heal':
      return { ...e, ratio: round3(e.ratio * power) };
    case 'status':
      // ระยะเวลาไม่ขยาย (สตันยาวขึ้นเรื่อยๆ ทำให้เกมพัง) — ขยายเฉพาะความแรง
      return { ...e, potency: round3(e.potency * power) };
    case 'cost_gain':
      return { ...e, amount: round3(e.amount * power) };
    case 'cost_rate':
      return { ...e, perSec: round3(e.perSec * power) };
    case 'splash_on_hit':
      return { ...e, ratio: round3(e.ratio * power) };
    case 'stat_mod':
      // ขยายเฉพาะส่วนที่เกิน 1 เท่า เช่น ×1.30 ที่ระดับ 3 → ×1.35
      return { ...e, mult: round3(1 + (e.mult - 1) * power), add: round3(e.add * power) };
    case 'trait':
      return { ...e, value: round3(e.value * power) };
    default:
      return e;
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
