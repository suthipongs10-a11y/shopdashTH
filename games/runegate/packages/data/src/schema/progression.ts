import { z } from 'zod';
import { Id } from './common.js';

/** ตารางการเติบโตของฮีโร่ (§6.2) — เลเวล / ดาว / ปลุกพลัง / สกิล */
export const ProgressionConfig = z
  .object({
    level: z
      .object({
        /** EXP ที่ต้องใช้เลื่อนจากเลเวล L ไป L+1 = base × L^exp */
        expBase: z.number().min(1),
        expExponent: z.number().min(0.1),
        /** ทองที่ต้องใช้ = base × L^exp */
        goldBase: z.number().min(1),
        goldExponent: z.number().min(0.1),
        /** EXP ที่ได้ต่อยาเพิ่มประสบการณ์ 1 ขวด */
        expPerPotion: z.number().int().min(1),
      })
      .strict(),
    star: z
      .object({
        /** เศษวิญญาณของฮีโร่ตัวนั้นที่ต้องใช้เลื่อนจากดาว S ไป S+1 = base × S */
        shardsPerStar: z.number().int().min(1),
        goldBase: z.number().int().min(1),
        /** ตัวคูณสถิติต่อ 1 ดาวที่เพิ่มจากดาวเริ่มต้น */
        statBonusPerStar: z.number().min(0),
        maxStar: z.number().int().min(1).max(6),
      })
      .strict(),
    awaken: z
      .object({
        /** เอสเซนซ์ธาตุเดียวกับฮีโร่ที่ต้องใช้ */
        essence: z.number().int().min(1),
        gold: z.number().int().min(1),
        /** ต้องถึงดาวนี้ก่อนถึงปลุกพลังได้ */
        minStar: z.number().int().min(1).max(6),
        statBonus: z.number().min(0),
        /** ลดคูลดาวน์ท่าไม้ตาย */
        ultCooldownCut: z.number().min(0).max(0.5),
      })
      .strict(),
    skill: z
      .object({
        maxLevel: z.number().int().min(1).max(10),
        /** ม้วนคาถาที่ต้องใช้ต่อ 1 ระดับ = base × ระดับปัจจุบัน */
        scrollsPerLevel: z.number().int().min(1),
        goldBase: z.number().int().min(1),
        /** ต่อ 1 ระดับ: เพิ่มตัวคูณผล และลดคูลดาวน์ */
        powerPerLevel: z.number().min(0),
        cooldownCutPerLevel: z.number().min(0).max(0.2),
      })
      .strict(),
    /** ของแจกตอนเริ่มเกมใหม่ (Phase 5 จะย้ายไปฝั่ง server) */
    starter: z
      .object({
        gold: z.number().int().min(0),
        gems: z.number().int().min(0),
        heroes: z.array(Id).min(1),
        materials: z.record(z.string(), z.number().int().min(0)),
      })
      .strict(),
  })
  .strict();
export type ProgressionConfig = z.infer<typeof ProgressionConfig>;
