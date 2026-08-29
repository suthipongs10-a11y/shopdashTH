import { z } from 'zod';
import { DamageType, DeployPos, Element, HeroClass, Id, Rarity, SpriteRecipe, TargetPriority } from './common.js';

export const HeroStats = z
  .object({
    hp: z.number().min(1),
    atk: z.number().min(0),
    /** ลด physical damage แบบหักลบ (flat) */
    def: z.number().min(0),
    /** ลด magic damage แบบสัดส่วน 0..0.9 */
    mres: z.number().min(0).max(0.9),
    /** โจมตีต่อวินาที */
    aspd: z.number().min(0.05).max(5),
    critRate: z.number().min(0).max(1).default(0.05),
    critDmg: z.number().min(1).default(1.5),
  })
  .strict();
export type HeroStats = z.infer<typeof HeroStats>;

export const Hero = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    /** ชื่ออาชีพหลัง Awaken (§6.1) — Phase 4 ถึงใช้จริง */
    awakenName_th: z.string().min(1),
    lore_th: z.string().default(''),
    class: HeroClass,
    element: Element,
    rarity: Rarity,
    pos: DeployPos,
    /** ค่า Deploy Cost (§5.2) */
    cost: z.number().int().min(1).max(60),
    /** จำนวนศัตรูที่บล็อคได้ (ranged ปกติ 0) */
    blockCount: z.number().int().min(0).max(4),
    /** ระยะโจมตีเป็นหน่วย tile */
    range: z.number().min(0.5).max(12),
    damageType: DamageType,
    targetPriority: TargetPriority.default('first'),
    /** สถิติที่เลเวล 1 ดาวเริ่มต้น */
    base: HeroStats,
    /** ค่าที่เพิ่มต่อ 1 เลเวล */
    growth: z
      .object({ hp: z.number().min(0), atk: z.number().min(0), def: z.number().min(0) })
      .strict(),
    /** เวลาก่อนโจมตีครั้งแรกหลังวาง (กันวางแล้วตีทันที) */
    deployWindupSec: z.number().min(0).default(0.4),
    redeployCooldownSec: z.number().min(1).default(20),
    skills: z.array(Id).max(3),
    sprite: SpriteRecipe,
  })
  .strict();
export type Hero = z.infer<typeof Hero>;

/** เพดานเลเวลตามดาว (§6.2) */
export const MAX_LEVEL_BY_STAR: Readonly<Record<number, number>> = {
  1: 15,
  2: 20,
  3: 25,
  4: 30,
  5: 35,
  6: 40,
};

/** สถิติจริงของฮีโร่ที่เลเวล L (ยังไม่รวมรูน/อุปกรณ์ — Phase 6) */
export function heroStatsAtLevel(hero: Hero, level: number): HeroStats {
  const l = Math.max(1, Math.floor(level)) - 1;
  return {
    ...hero.base,
    hp: Math.round(hero.base.hp + hero.growth.hp * l),
    atk: Math.round(hero.base.atk + hero.growth.atk * l),
    def: Math.round(hero.base.def + hero.growth.def * l),
  };
}
