import { z } from 'zod';
import { Id } from './common.js';

/** สถิติที่รูนให้ได้ (§7) — ปรับให้เข้า TD: มี cost ลด และ CDR */
export const RuneStat = z.enum([
  'hp_flat',
  'hp_pct',
  'atk_flat',
  'atk_pct',
  'def_flat',
  'def_pct',
  'aspd_pct',
  'crit_rate',
  'crit_dmg',
  'cost_down', // ลด Deploy Cost ของฮีโร่ตัวนี้
  'cdr_pct', // ลด cooldown Ultimate
  'range_flat',
]);
export type RuneStat = z.infer<typeof RuneStat>;

export const RuneSet = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    /** ต้องใส่ครบกี่ชิ้นถึงติดโบนัส (2 หรือ 4) */
    pieces: z.union([z.literal(2), z.literal(4)]),
    bonus: z.object({ stat: RuneStat, value: z.number() }).strict(),
    desc_th: z.string().min(1),
    /** ดันเจี้ยนที่ดรอปเซ็ตนี้ (§9.2) */
    source: z.enum(['giants_keep', 'dragons_lair', 'event']),
  })
  .strict();
export type RuneSet = z.infer<typeof RuneSet>;

/** ช่อง 1/3/5 main stat ตายตัว, ช่อง 2/4/6 สุ่มได้ (§7) */
export const RuneSlotRule = z
  .object({
    slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    fixedMain: RuneStat.optional(),
    mainPool: z.array(RuneStat).default([]),
  })
  .strict();
export type RuneSlotRule = z.infer<typeof RuneSlotRule>;

export const RuneConfig = z
  .object({
    sets: z.array(RuneSet).min(1),
    slotRules: z.array(RuneSlotRule).length(6),
    subStatPool: z.array(RuneStat).min(4),
    /** ระดับความแรร์ → จำนวน substat เริ่มต้น (ขาว/เขียว/ฟ้า/ม่วง/ทอง) */
    rarityStartingSubs: z.array(z.number().int().min(0).max(4)).length(5),
    /** ทุก +3 substat สุ่มอัพ 1 ตัว */
    subUpgradeEveryLevels: z.number().int().min(1).default(3),
    maxLevel: z.number().int().min(1).default(15),
    /** ค่าอัพรูนต่อเลเวล = base * (grade^gradeExp) * (level+1)^levelExp — Gold sink หลัก (§11.2) */
    upgradeCost: z
      .object({ base: z.number().min(1), gradeExp: z.number(), levelExp: z.number() })
      .strict(),
  })
  .strict();
export type RuneConfig = z.infer<typeof RuneConfig>;
