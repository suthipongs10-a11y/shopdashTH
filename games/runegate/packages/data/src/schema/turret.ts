import { z } from 'zod';
import { DamageType, Element, Id, SpriteRecipe, TargetPriority } from './common.js';

/**
 * เครื่องยิง — สร้างบนแท่น `T` ในด่าน แล้วอัพเกรดต่อได้ระหว่างรบ
 * ต่างจากฮีโร่ตรงที่ไม่ผูกกับเลเวลนอกด่าน พลังมาจาก "ทุ่มแต้มวางอัพเกรด" ล้วนๆ
 */
export const Turret = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    desc_th: z.string().min(1),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    /** แต้มวางที่ใช้สร้าง (tier 1) หรืออัพเกรดขึ้นมา (tier 2–3) */
    cost: z.number().int().min(1).max(80),
    range: z.number().min(1).max(12),
    /** ยิงต่อวินาที */
    aspd: z.number().min(0.05).max(6),
    atk: z.number().min(1),
    critRate: z.number().min(0).max(1).default(0.05),
    critDmg: z.number().min(1).default(1.5),
    damageType: DamageType.default('physical'),
    element: Element,
    targetPriority: TargetPriority.default('first'),
    weapon: Id,
    /** สายอัพเกรดถัดไป (สูงสุด 3 ทาง) — tier 3 เป็นทางตัน */
    upgradesTo: z.array(Id).max(3).default([]),
    /** โบนัสความเสียหายต่อศัตรูบิน */
    antiAir: z.number().min(0).default(0),
    /** เปิดเผยศัตรูล่องหนในรัศมีนี้ (0 = ไม่มี) */
    revealAura: z.number().min(0).default(0),
    sprite: SpriteRecipe,
  })
  .strict();
export type Turret = z.infer<typeof Turret>;
