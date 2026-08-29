import { z } from 'zod';
import { Id } from './common.js';

/**
 * ผังช่องของด่าน — 1 ตัวอักษร = 1 tile (§5.1)
 *   R = ทางเดินศัตรู (วาง melee ได้ เพื่อบล็อค)
 *   G = พื้นราบนอกทาง (วาง melee ได้)
 *   H = ที่สูง (วาง ranged ได้เท่านั้น)
 *   X = สิ่งกีดขวาง (วางไม่ได้)
 *   S = จุดเกิดศัตรู
 *   E = ประตูฐาน (ศัตรูถึงตรงนี้ = เสียเลือดฐาน)
 *   . = ช่องว่าง/เหว
 */
export const TileChar = z.enum(['R', 'G', 'H', 'X', 'S', 'E', '.']);
export type TileChar = z.infer<typeof TileChar>;

export const Waypoint = z.tuple([z.number(), z.number()]);
export type Waypoint = z.infer<typeof Waypoint>;

export const WaveGroup = z
  .object({
    enemy: Id,
    count: z.number().int().min(1).max(60),
    /** ระยะห่างการปล่อยแต่ละตัวในกลุ่ม (วินาที) */
    intervalSec: z.number().min(0).default(1),
    /** หน่วงหลังเวฟเริ่ม */
    delaySec: z.number().min(0).default(0),
    path: z.string().min(1).default('main'),
    /** ตัวคูณสถิติเฉพาะกลุ่มนี้ (ใช้ทำ Hard/Hell โดยไม่ต้อง copy ศัตรู) */
    hpMult: z.number().min(0.1).default(1),
    atkMult: z.number().min(0.1).default(1),
  })
  .strict();
export type WaveGroup = z.infer<typeof WaveGroup>;

export const Wave = z
  .object({
    id: z.string().min(1),
    /** เวลาเริ่มเวฟนับจากวินาทีที่ 0 ของด่าน */
    startSec: z.number().min(0),
    label_th: z.string().default(''),
    groups: z.array(WaveGroup).min(1),
  })
  .strict();
export type Wave = z.infer<typeof Wave>;

export const StarCondition = z.discriminatedUnion('type', [
  z.object({ type: z.literal('base_hp_pct'), value: z.number().min(0).max(100) }),
  z.object({ type: z.literal('no_leak') }),
  z.object({ type: z.literal('max_heroes'), value: z.number().int().min(1) }),
  z.object({ type: z.literal('no_ultimate') }),
  z.object({ type: z.literal('clear_under_sec'), value: z.number().min(1) }),
]);
export type StarCondition = z.infer<typeof StarCondition>;

export const StageDifficulty = z.enum(['normal', 'hard', 'hell']);
export type StageDifficulty = z.infer<typeof StageDifficulty>;

export const Stage = z
  .object({
    id: Id,
    name_th: z.string().min(1),
    chapter: z.number().int().min(1),
    index: z.number().int().min(1),
    difficulty: StageDifficulty.default('normal'),
    brief_th: z.string().default(''),
    /** ค่า energy ที่ใช้เข้าด่าน (§10.3) */
    energyCost: z.number().int().min(0).default(6),
    grid: z.object({ w: z.number().int().min(4).max(30), h: z.number().int().min(4).max(20) }).strict(),
    /** h แถว แต่ละแถวยาว w ตัวอักษร (แถวบนสุด = y 0) */
    tiles: z.array(z.string()).min(4),
    /** เส้นทางเดินของศัตรู — key = ชื่อเส้น, value = ลำดับ waypoint (tile coords) */
    paths: z.record(z.string(), z.array(Waypoint).min(2)),
    baseHp: z.number().int().min(1),
    deploy: z
      .object({
        initialCost: z.number().min(0),
        costPerSec: z.number().min(0),
        /** จำนวนฮีโร่ที่วางพร้อมกันได้สูงสุดในสนาม */
        deployLimit: z.number().int().min(1).max(12),
        /** คืน cost เมื่อถอนตัว (สัดส่วน) */
        retreatRefund: z.number().min(0).max(1).default(0.5),
      })
      .strict(),
    waves: z.array(Wave).min(1),
    stars: z
      .object({ two: StarCondition, three: StarCondition })
      .strict(),
    rewards: z
      .object({
        gold: z.number().int().min(0),
        exp: z.number().int().min(0),
        firstClearGems: z.number().int().min(0).default(0),
        dropTable: Id.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.tiles.length !== s.grid.h) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `tiles มี ${s.tiles.length} แถว แต่ grid.h = ${s.grid.h}` });
    }
    s.tiles.forEach((row, y) => {
      if (row.length !== s.grid.w) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `tiles แถว ${y} ยาว ${row.length} แต่ grid.w = ${s.grid.w}` });
      }
      for (const ch of row) {
        if (!TileChar.safeParse(ch).success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `tiles แถว ${y} มีตัวอักษรไม่รู้จัก: "${ch}"` });
        }
      }
    });
    for (const [name, pts] of Object.entries(s.paths)) {
      pts.forEach(([x, y], i) => {
        if (x < 0 || x >= s.grid.w || y < 0 || y >= s.grid.h) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `path "${name}" จุดที่ ${i} (${x},${y}) อยู่นอกกริด` });
        }
      });
    }
    const paths = new Set(Object.keys(s.paths));
    for (const w of s.waves) {
      for (const g of w.groups) {
        if (!paths.has(g.path)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `เวฟ ${w.id} อ้างเส้นทาง "${g.path}" ที่ไม่มีในด่าน` });
        }
      }
    }
  });
export type Stage = z.infer<typeof Stage>;
