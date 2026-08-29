/** สถานะผู้เล่นนอกด่าน (Phase 5 จะย้ายไปเก็บฝั่ง server — โครงเดียวกัน) */

/** ถุงไอเทม: key = item id, value = จำนวน (ไม่มี key = 0) */
export type Materials = Readonly<Record<string, number>>;

export interface HeroState {
  readonly id: string;
  readonly level: number;
  /** EXP สะสมของเลเวลปัจจุบัน (ยังไม่พอเลื่อนขั้น) */
  readonly exp: number;
  readonly star: number;
  readonly awakened: boolean;
  /** key = skillId, value = ระดับ 1..maxLevel */
  readonly skillLevels: Readonly<Record<string, number>>;
}

export interface PlayerState {
  readonly version: number;
  readonly gold: number;
  readonly gems: number;
  /** ฮีโร่ที่ครอบครองอยู่ (key = heroId) */
  readonly roster: Readonly<Record<string, HeroState>>;
  /** ทีมที่จัดไว้ (สูงสุด TEAM_SIZE ตัว) */
  readonly team: readonly string[];
  readonly materials: Materials;
  /** ดาวที่ดีที่สุดของแต่ละด่าน */
  readonly stars: Readonly<Record<string, number>>;
  /** ด่านที่เคลียร์ครั้งแรกไปแล้ว (ใช้ตัดรางวัล first clear) */
  readonly firstCleared: readonly string[];
}

/** ผลของการกระทำนอกด่าน — สำเร็จได้ state ใหม่, ล้มเหลวได้เหตุผลภาษาไทย */
export type MetaResult<T = PlayerState> =
  | { readonly ok: true; readonly state: T; readonly log_th: string }
  | { readonly ok: false; readonly reason_th: string };

/** ค่าใช้จ่ายของการกระทำ 1 ครั้ง — ใช้ทั้งตอนตรวจและตอนแสดงบน UI */
export interface Cost {
  readonly gold: number;
  /** ไอเทมที่ต้องใช้ (item id → จำนวน) */
  readonly items: Readonly<Record<string, number>>;
  /** EXP ที่ต้องมีสะสม (เฉพาะการเลื่อนเลเวล) */
  readonly exp?: number;
}

/** แหล่งสุ่มที่ replay ได้ — `Rng` ของ sim ใช้ตรงนี้ได้เลย */
export interface RandomSource {
  next(): number;
}
