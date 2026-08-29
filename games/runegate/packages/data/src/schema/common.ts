import { z } from 'zod';

/** ธาตุ 5 ชนิด (§5.3) — น้ำ > ไฟ > ลม > น้ำ | แสง ↔ มืด */
export const Element = z.enum(['water', 'fire', 'wind', 'light', 'dark']);
export type Element = z.infer<typeof Element>;

/** เผ่า 5 แบบ (§5.3) — ไม่มีแพ้ทางในตัว แต่การ์ดให้โบนัสเจาะเผ่า */
export const Race = z.enum(['human', 'beast', 'demon', 'undead', 'insect']);
export type Race = z.infer<typeof Race>;

export const DamageType = z.enum(['physical', 'magic', 'true']);
export type DamageType = z.infer<typeof DamageType>;

/** คลาส 6 สาย (§6.1) */
export const HeroClass = z.enum([
  'swordsman',
  'thief',
  'archer',
  'mage',
  'acolyte',
  'merchant',
]);
export type HeroClass = z.infer<typeof HeroClass>;

/** ตำแหน่งวาง: melee ลงบนทางเดิน / ranged ลงที่สูง */
export const DeployPos = z.enum(['melee', 'ranged']);
export type DeployPos = z.infer<typeof DeployPos>;

export const TargetPriority = z.enum([
  'first', // เดินไกลสุดบนเส้นทาง (ใกล้ฐานที่สุด)
  'last',
  'nearest',
  'lowest_hp',
  'highest_hp',
  'flying_first',
  'elite_first',
  'healer_first',
]);
export type TargetPriority = z.infer<typeof TargetPriority>;

export const StatusKind = z.enum([
  'stun',
  'slow',
  'poison',
  'bind', // หยุดเดินแต่ยังโจมตีได้
  'atk_up',
  'def_down',
  'shield',
  'revealed',
]);
export type StatusKind = z.infer<typeof StatusKind>;

/** ลักษณะพิเศษของศัตรู (§5.4) */
export const EnemyTrait = z.enum([
  'flying', // ข้ามหัว melee — บล็อคไม่ได้ ต้องใช้ ranged
  'stealth', // มองไม่เห็นจนกว่าจะถูก reveal
  'armored', // ลด physical เพิ่ม
  'magic_resist',
  'healer', // ฮีลพวกเดียวกัน
  'swarm', // เร็ว เลือดน้อย มาเป็นกลุ่ม
  'elite',
  'boss',
]);
export type EnemyTrait = z.infer<typeof EnemyTrait>;

export const Rarity = z.union([z.literal(3), z.literal(4), z.literal(5)]);
export type Rarity = z.infer<typeof Rarity>;

/** ที่มาของ id — ใช้ตรวจ cross-reference ตอน validate */
export const Id = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'id ต้องเป็น a-z0-9_ ขึ้นต้นด้วยตัวอักษร');

/** สูตรสีของ sprite placeholder (Phase 2) — Phase 3 จะแทนด้วย atlas จริง */
export const SpriteRecipe = z.object({
  body: z.enum(['humanoid', 'beast', 'floating', 'hulk', 'insect', 'spirit', 'catapult', 'cannon', 'arcane']),
  weapon: z.enum(['none', 'sword', 'bow', 'staff', 'dagger', 'hammer', 'claw', 'spear']).default('none'),
  palette: z.object({
    main: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  scale: z.number().min(0.4).max(3).default(1),
});
export type SpriteRecipe = z.infer<typeof SpriteRecipe>;
