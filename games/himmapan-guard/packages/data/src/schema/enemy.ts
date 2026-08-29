import { z } from 'zod';
import { DamageType, Element, EnemyTrait, Id, Race, SpriteRecipe } from './common.js';

export const Enemy = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    race: Race,
    element: Element,
    traits: z.array(EnemyTrait).default([]),
    hp: z.number().min(1),
    atk: z.number().min(0),
    def: z.number().min(0),
    mres: z.number().min(0).max(0.9),
    /** tile ต่อวินาที */
    moveSpeed: z.number().min(0.05).max(6),
    aspd: z.number().min(0.05).max(5),
    range: z.number().min(0.2).max(10),
    damageType: DamageType,
    /** กินช่องบล็อคกี่ช่อง (บอสตัวใหญ่กิน 2-3) */
    blockWeight: z.number().int().min(1).max(4).default(1),
    /** เลือดฐานที่เสียเมื่อหลุดเข้าฐาน */
    leakDamage: z.number().int().min(1).default(1),
    bounty: z.object({ gold: z.number().int().min(0), exp: z.number().int().min(0) }).strict(),
    /** สกิลของศัตรู (ใช้ schema เดียวกับฮีโร่) */
    skills: z.array(Id).default([]),
    /** การ์ดที่ดรอปจากตัวนี้ (§8.2) — Phase 6 */
    cardId: Id.optional(),
    sprite: SpriteRecipe,
  })
  .strict();
export type Enemy = z.infer<typeof Enemy>;
