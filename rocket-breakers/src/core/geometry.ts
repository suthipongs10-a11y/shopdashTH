// Swept collision helpers. Fast shots test the whole path of a tick, never only
// the end position, so nothing tunnels through a target.
export interface Vec { x: number; y: number }

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const fromAngle = (rad: number, r = 1): Vec => ({ x: Math.cos(rad) * r, y: Math.sin(rad) * r });
export const DEG = Math.PI / 180;

export function limitLength(a: Vec, max: number): Vec {
  const l = len(a);
  return l > max && l > 0 ? scale(a, max / l) : a;
}

// Fraction t in [0,1] along a->b where the segment first comes within r of c, or -1.
export function segmentCircleT(a: Vec, b: Vec, c: Vec, r: number): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const fx = a.x - c.x, fy = a.y - c.y;
  const A = dx * dx + dy * dy;
  const C = fx * fx + fy * fy - r * r;
  if (C <= 0) return 0;
  if (A === 0) return -1;
  const B = 2 * (fx * dx + fy * dy);
  const disc = B * B - 4 * A * C;
  if (disc < 0) return -1;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : -1;
}

// Entry fraction of segment a->b into an axis-aligned rect centred at c, or -1 (slab test).
export function segmentRectT(a: Vec, b: Vec, c: Vec, halfW: number, halfH: number): number {
  let t0 = 0, t1 = 1;
  const d = sub(b, a);
  const axes: [number, number, number, number][] = [
    [a.x, d.x, c.x - halfW, c.x + halfW],
    [a.y, d.y, c.y - halfH, c.y + halfH],
  ];
  for (const [p, dp, lo, hi] of axes) {
    if (Math.abs(dp) < 1e-9) {
      if (p < lo || p > hi) return -1;
    } else {
      let ta = (lo - p) / dp, tb = (hi - p) / dp;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return -1;
    }
  }
  return t0;
}

// Shortest distance from point p to segment a->b.
export function pointSegmentDistance(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  const t = l2 === 0 ? 0 : clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1);
  return dist(p, add(a, scale(ab, t)));
}
