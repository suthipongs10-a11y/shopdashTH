/**
 * PRNG แบบ deterministic (mulberry32) — §13.2 ข้อ 2
 * ทุกการสุ่มในการต่อสู้ต้องผ่านตัวนี้เท่านั้น เพื่อให้ seed เดิม + input เดิม = ผลลัพธ์เดิมเป๊ะ
 */
export class Rng {
  private state: number;
  /** นับจำนวนครั้งที่ถูกเรียก — ใช้ตรวจ determinism ใน test */
  public calls = 0;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.calls++;
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(p: number): boolean {
    if (p >= 1) return true;
    if (p <= 0) return false;
    return this.next() < p;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.range(minInclusive, maxInclusive + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: อาร์เรย์ว่าง');
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** สำหรับ snapshot/replay */
  getState(): number {
    return this.state;
  }
}

/** แปลงข้อความเป็น seed ตัวเลข (FNV-1a) — ใช้ทำ seed จากชื่อด่าน/ผู้เล่น */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
