import { z } from 'zod';
import { DamageType, Element, Id, StatusKind } from './common.js';

/** เป้าหมายของ effect */
export const EffectTarget = z.enum([
  'current_target', // เป้าที่กำลังตีอยู่
  'self',
  'enemies_in_radius',
  'enemies_in_range', // ทุกตัวในระยะโจมตีของฮีโร่
  'blocked_enemies', // ศัตรูที่ตัวเองบล็อคอยู่
  'allies_in_radius',
  'lowest_hp_ally',
]);
export type EffectTarget = z.infer<typeof EffectTarget>;

const base = { target: EffectTarget.default('current_target') };

export const Effect = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('damage'),
    ...base,
    /** ตัวคูณกับ ATK ของผู้ใช้ */
    ratio: z.number().min(0),
    radius: z.number().min(0).default(0),
    damageType: DamageType.optional(),
    element: Element.optional(),
    hits: z.number().int().min(1).default(1),
  }),
  z.object({
    kind: z.literal('heal'),
    ...base,
    ratio: z.number().min(0),
    radius: z.number().min(0).default(0),
  }),
  z.object({
    kind: z.literal('status'),
    ...base,
    status: StatusKind,
    durationSec: z.number().min(0),
    chance: z.number().min(0).max(1).default(1),
    /** ความแรง: slow = ลดความเร็ว %, atk_up = เพิ่ม ATK %, shield = % ของ maxHp */
    potency: z.number().default(0),
    radius: z.number().min(0).default(0),
  }),
  z.object({
    kind: z.literal('cost_gain'),
    /** Merchant: เพิ่ม deploy cost ทันที */
    amount: z.number().min(0),
  }),
  z.object({
    kind: z.literal('cost_rate'),
    /** เพิ่มอัตรางอก cost ต่อวินาที ตลอดเวลาที่ฮีโร่อยู่ในสนาม */
    perSec: z.number(),
  }),
  z.object({
    kind: z.literal('reveal'),
    radius: z.number().min(0),
  }),
  z.object({
    kind: z.literal('splash_on_hit'),
    /** passive: การโจมตีปกติกระจายรอบเป้า */
    radius: z.number().min(0),
    ratio: z.number().min(0),
  }),
  z.object({
    kind: z.literal('stat_mod'),
    ...base,
    stat: z.enum(['atk', 'def', 'mres', 'aspd', 'block', 'range', 'hp', 'crit_rate', 'crit_dmg']),
    /** ตัวคูณ (1.3 = +30%) */
    mult: z.number().default(1),
    add: z.number().default(0),
    durationSec: z.number().min(0).default(0), // 0 = ถาวรตลอดด่าน (passive)
  }),
  z.object({
    kind: z.literal('trait'),
    trait: z.enum(['anti_air', 'reveal_aura', 'true_damage', 'block_pierce', 'lifesteal']),
    value: z.number().default(0),
  }),
]);
export type Effect = z.infer<typeof Effect>;

export const SkillTrigger = z.enum([
  'passive', // ติดตัวตลอด (stat_mod / splash / trait)
  'on_deploy',
  'interval', // ยิงเองตาม cooldown
  'on_attack',
  'on_kill',
  'manual', // Ultimate กดมือ
]);
export type SkillTrigger = z.infer<typeof SkillTrigger>;

export const Skill = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    desc_th: z.string().min(1),
    type: z.enum(['passive', 'auto', 'ultimate']),
    trigger: SkillTrigger,
    cooldownSec: z.number().min(0).default(0),
    initialCooldownSec: z.number().min(0).default(0),
    /** โอกาสทำงานสำหรับ trigger on_attack */
    chance: z.number().min(0).max(1).default(1),
    effects: z.array(Effect).min(1),
    /** เอฟเฟกต์ภาพตอนใช้ (Phase 2 ใช้เลือกสี/รูปแบบ) */
    vfx: z.enum(['none', 'slash', 'arrow', 'nova', 'heal', 'buff', 'coin', 'shadow']).default('none'),
  })
  .strict();
export type Skill = z.infer<typeof Skill>;
