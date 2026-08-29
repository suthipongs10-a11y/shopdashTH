import { z } from 'zod';
import { Element, Id, Race, StatusKind } from './common.js';

/** เอฟเฟกต์การ์ดมอนสเตอร์ (§8.2) */
export const CardEffect = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('race_damage'), race: Race, pct: z.number() }),
  z.object({ kind: z.literal('element_damage'), element: Element, pct: z.number() }),
  z.object({ kind: z.literal('stat'), stat: z.enum(['hp', 'atk', 'def', 'aspd', 'crit_rate', 'crit_dmg', 'range']), pct: z.number() }),
  z.object({ kind: z.literal('on_hit_status'), status: StatusKind, chance: z.number().min(0).max(1), durationSec: z.number().min(0), potency: z.number().default(0) }),
  z.object({ kind: z.literal('gold_bonus'), pct: z.number() }),
  z.object({ kind: z.literal('cost_down'), value: z.number() }),
]);
export type CardEffect = z.infer<typeof CardEffect>;

export const Card = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    /** มอนสเตอร์ที่ดรอปการ์ดใบนี้ */
    sourceEnemy: Id,
    /** เรทดรอป 0.0005–0.01 (§8.2) */
    dropRate: z.number().min(0.0001).max(0.05),
    /** เศษการ์ดกี่ชิ้นแลกได้ 1 ใบ */
    shardsToCraft: z.number().int().min(1).default(50),
    slot: z.enum(['weapon', 'armor', 'accessory', 'any']),
    effects: z.array(CardEffect).min(1),
    desc_th: z.string().min(1),
  })
  .strict();
export type Card = z.infer<typeof Card>;
