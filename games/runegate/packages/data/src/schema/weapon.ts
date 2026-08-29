import { z } from 'zod';
import { DamageType, Element, Id, StatusKind } from './common.js';

/**
 * อาวุธของเครื่องยิง — โครงเดียวครอบทุกรูปแบบการยิง
 * (ยืมแพตเทิร์นจากเกมยิงคลาสสิก: รัวเป็นชุด, กระจาย, ลำแสงทะลุ, ลูกไฟตามเป้า, ระเบิดวิถีโค้ง)
 *
 *   ยิงเดี่ยว      shots 1
 *   รัวเป็นชุด (M) shots 3-5 + burstIntervalSec > 0
 *   กระจาย (S)     shots 3-5 + spreadDeg 30-60 + burstIntervalSec 0
 *   ลำแสง (L)      pierce สูง + speed สูง
 *   ลูกไฟวน (F)    homingTurnRate > 0
 *   ระเบิด/ครก     lob + aoeRadius
 *   คลัสเตอร์      lob + splitOnHit
 */
export const Weapon = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    desc_th: z.string().min(1),
    /** จำนวนกระสุนต่อการยิง 1 ครั้ง */
    shots: z.number().int().min(1).max(9).default(1),
    /** มุมกระจายรวมขององศา (0 = ตรงหมด) */
    spreadDeg: z.number().min(0).max(180).default(0),
    /** ระยะห่างของกระสุนในชุด (0 = ออกพร้อมกัน → กลายเป็นการกระจาย) */
    burstIntervalSec: z.number().min(0).max(1).default(0),
    /** ความเร็วกระสุน (ช่อง/วินาที) */
    speed: z.number().min(1).max(40).default(9),
    /** ดาเมจต่อกระสุน = ATK × ratio */
    ratio: z.number().min(0.05),
    damageType: DamageType.default('physical'),
    element: Element.optional(),
    /** ทะลุศัตรูได้กี่ตัวก่อนหาย (0 = โดนตัวแรกแล้วหาย) */
    pierce: z.number().int().min(0).max(12).default(0),
    /** รัศมีระเบิดตอนกระทบ (0 = โดนตัวเดียว) */
    aoeRadius: z.number().min(0).max(4).default(0),
    /** อัตราการเลี้ยวตามเป้า (เรเดียน/วินาที, 0 = วิ่งตรง) */
    homingTurnRate: z.number().min(0).max(12).default(0),
    /** วิถีโค้ง: พุ่งไปตกที่จุดเป้าหมาย ไม่สนตัวที่ขวางระหว่างทาง */
    lob: z.boolean().default(false),
    /** แตกลูกย่อยเมื่อกระทบ (ครกคลัสเตอร์) */
    splitOnHit: z
      .object({ shots: z.number().int().min(2).max(6), ratio: z.number().min(0.05), aoeRadius: z.number().min(0).max(3) })
      .strict()
      .optional(),
    /** สถานะติดตัวเมื่อโดน */
    onHit: z
      .object({
        status: StatusKind,
        durationSec: z.number().min(0),
        potency: z.number().default(0),
        chance: z.number().min(0).max(1).default(1),
      })
      .strict()
      .optional(),
    vfx: z.enum(['rock', 'bullet', 'shell', 'beam', 'flame', 'bomb', 'shard']).default('bullet'),
  })
  .strict();
export type Weapon = z.infer<typeof Weapon>;
