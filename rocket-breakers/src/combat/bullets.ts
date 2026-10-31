// Pooled projectiles (TECHNICAL budgets: 300 friendly, 600 hostile). Fixed
// capacity with a free list — no allocation during combat.
export type BulletModel = "kinetic" | "plasma" | "hostile";

export interface Bullet {
  slot: number; id: number; alive: boolean; model: BulletModel;
  x: number; y: number; px: number; py: number; vx: number; vy: number;
  r: number; dmg: number; age: number; life: number;
  blast: number; homing: number; turnRate: number; grazed: boolean; hitCargo: boolean;
}

export class BulletPool {
  readonly items: Bullet[] = [];
  private free: number[] = [];
  private nextId = 1;
  active = 0;

  constructor(readonly capacity: number) {
    for (let i = 0; i < capacity; i++) {
      this.items.push({ slot: i, id: 0, alive: false, model: "kinetic", x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
        r: 3, dmg: 0, age: 0, life: 6, blast: 0, homing: 0, turnRate: 0, grazed: false, hitCargo: false });
      this.free.push(capacity - 1 - i);
    }
  }

  // Returns null when full; callers schedule fewer volleys rather than erase live bullets.
  spawn(model: BulletModel, x: number, y: number, vx: number, vy: number, r: number, dmg: number, life = 6): Bullet | null {
    const slot = this.free.pop();
    if (slot === undefined) return null;
    const b = this.items[slot];
    Object.assign(b, { id: this.nextId++, alive: true, model, x, y, px: x, py: y, vx, vy, r, dmg, age: 0, life,
      blast: 0, homing: 0, turnRate: 0, grazed: false, hitCargo: false });
    this.active++;
    return b;
  }

  kill(b: Bullet): void {
    if (!b.alive) return;
    b.alive = false;
    this.free.push(b.slot);
    this.active--;
  }

  // Moves every live bullet one tick and culls those far off screen or expired.
  move(dt: number): void {
    for (const b of this.items) {
      if (!b.alive) continue;
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.age += dt;
      if (b.age > b.life || b.x < -80 || b.x > 800 || b.y < -120 || b.y > 1400) this.kill(b);
    }
  }

  clear(): void {
    for (const b of this.items) this.kill(b);
  }
}
