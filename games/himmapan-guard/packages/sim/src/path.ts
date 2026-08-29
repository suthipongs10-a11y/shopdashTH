import type { Stage, Waypoint } from '@himmapan/data';

export interface Vec2 {
  x: number;
  y: number;
}

/** เส้นทางเดินของศัตรู แปลงเป็น polyline พร้อมระยะสะสม เพื่อหา "ตำแหน่งที่ระยะ d" ได้ O(log n) */
export class PathTrack {
  readonly points: Vec2[];
  readonly cumulative: number[];
  readonly length: number;

  constructor(waypoints: readonly Waypoint[]) {
    if (waypoints.length < 2) throw new Error('PathTrack ต้องมีอย่างน้อย 2 จุด');
    this.points = waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    this.cumulative = [0];
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      total += Math.hypot(b.x - a.x, b.y - a.y);
      this.cumulative.push(total);
    }
    this.length = total;
  }

  /** ตำแหน่งเมื่อเดินไปแล้ว d หน่วย (หน่วย = 1 ช่อง) */
  at(d: number): Vec2 {
    const dist = Math.max(0, Math.min(d, this.length));
    let i = 1;
    while (i < this.cumulative.length - 1 && this.cumulative[i]! < dist) i++;
    const segStart = this.cumulative[i - 1]!;
    const segLen = this.cumulative[i]! - segStart;
    const a = this.points[i - 1]!;
    const b = this.points[i]!;
    const t = segLen === 0 ? 0 : (dist - segStart) / segLen;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /** ทิศที่กำลังหันไป (เวกเตอร์หน่วย) */
  headingAt(d: number): Vec2 {
    const eps = 0.05;
    const p0 = this.at(Math.max(0, d - eps));
    const p1 = this.at(Math.min(this.length, d + eps));
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
}

export function buildPaths(stage: Stage): Map<string, PathTrack> {
  const m = new Map<string, PathTrack>();
  for (const [name, pts] of Object.entries(stage.paths)) m.set(name, new PathTrack(pts));
  return m;
}

export function tileOf(stage: Stage, x: number, y: number): string {
  return stage.tiles[Math.floor(y)]?.[Math.floor(x)] ?? '.';
}

/** ช่องที่วางฮีโร่ได้ตามชนิด (§5.1) */
export function canDeployOn(tile: string, pos: 'melee' | 'ranged'): boolean {
  if (pos === 'melee') return tile === 'R' || tile === 'G';
  return tile === 'H';
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
