import { z } from 'zod';

/** §11 — ทุก faucet/sink อยู่ในไฟล์นี้ เพื่อปรับได้ฝั่ง server โดยไม่ต้องอัพเดตแอป */
export const GachaConfig = z
  .object({
    rates: z.object({ r5: z.number(), r4: z.number(), r3: z.number() }).strict(),
    /** ไม่ออก ★5 ภายใน N ครั้ง → ครั้งที่ N การันตี (§6.3) */
    hardPity: z.number().int().min(1),
    /** เริ่มไต่เรทหลังครั้งที่ N */
    softPityStart: z.number().int().min(1),
    /** เรทที่บวกเพิ่มต่อครั้งหลัง softPityStart */
    softPityStep: z.number().min(0),
    /** แพ้ rate-up ครั้งแรก → ครั้งถัดไปการันตีตัว rate-up */
    rateUpChance: z.number().min(0).max(1),
    costPerPull: z.object({ gems: z.number().int(), scroll: z.number().int() }).strict(),
  })
  .strict()
  .superRefine((g, ctx) => {
    const sum = g.rates.r5 + g.rates.r4 + g.rates.r3;
    if (Math.abs(sum - 1) > 1e-6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `เรทสุ่มรวมต้อง = 1 (ตอนนี้ ${sum})` });
    }
  });
export type GachaConfig = z.infer<typeof GachaConfig>;

export const RefineStep = z
  .object({
    /** ตีจาก +n ไป +(n+1) */
    from: z.number().int().min(0),
    successRate: z.number().min(0).max(1),
    /** ผลเมื่อพลาด (§8.3) — ไม่มี 'destroy' เด็ดขาด */
    onFail: z.enum(['keep', 'downgrade', 'break']),
    oreCost: z.number().int().min(1),
    goldCost: z.number().int().min(0),
  })
  .strict();
export type RefineStep = z.infer<typeof RefineStep>;

export const EconomyConfig = z
  .object({
    energy: z
      .object({
        regenSecPerPoint: z.number().int().min(1),
        baseCap: z.number().int().min(1),
        capPerPlayerLevel: z.number().min(0),
      })
      .strict(),
    gacha: GachaConfig,
    refine: z.array(RefineStep).min(1),
    /** รางวัลรายวันที่ F2P ได้แน่นอน — ใช้ในสเปรดชีตโมเดล 90 วัน (§11.2 ข้อ 1) */
    dailyFaucets: z
      .object({
        questGold: z.number().int(),
        questGems: z.number().int(),
        questEnergy: z.number().int(),
        questScrolls: z.number(),
        loginGems: z.number().int(),
      })
      .strict(),
    /** ราคาสินค้าจริง (บาท) — §11.3 */
    iap: z
      .object({
        monthlyCardTHB: z.number().int(),
        monthlyCardGemsPerDay: z.number().int(),
        monthlyCardInstantGems: z.number().int(),
        battlePassTHB: z.number().int(),
        battlePassGems: z.number().int(),
      })
      .strict(),
    heroLevelUpGold: z.object({ base: z.number(), exp: z.number() }).strict(),
  })
  .strict();
export type EconomyConfig = z.infer<typeof EconomyConfig>;
