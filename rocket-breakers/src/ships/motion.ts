// Arcade player movement (SYSTEMS §1) and dash (AGENTS §11). Pure state + step.
import { clamp, limitLength, len, type Vec } from "../core/geometry";

export const ACCEL = 1800;
export const DECEL = 2200;
export const DASH_BURST_SEC = 0.25;
export const DASH_INVULN_SEC = 0.18;
export const DASH_COOLDOWN_SEC = 2.5;
// Burst speed multiplier — not specified in SYSTEMS; see docs/DECISIONS.md.
export const DASH_SPEED_MULT = 2.2;
export const MAX_HALF_WIDTH = 94;
const RECENT_MOVE_SEC = 0.3;

export interface Bounds { x0: number; y0: number; x1: number; y1: number }

export class PlayerMotion {
  pos: Vec = { x: 360, y: 900 };
  prev: Vec = { x: 360, y: 900 };
  vel: Vec = { x: 0, y: 0 };
  baseSpeed = 360;
  massCap = 28;
  fittedMass = 0;
  towing = false;
  cargoMass = 0;
  halfWidth = 29;
  bounds: Bounds = { x0: 0, y0: 110, x1: 720, y1: 1040 };
  dashLeft = 0;
  dashCooldown = 0;
  invulnLeft = 0;
  dashDir: Vec = { x: 0, y: -1 };
  lastMoveDir: Vec = { x: 0, y: -1 };
  lastMoveAge = 999;

  towPenalty(): number {
    return this.towing ? 0.2 + 0.15 * clamp(this.cargoMass / 20, 0, 1) : 0;
  }

  // Single formula from SYSTEMS §1; the clamp is the final limit.
  effectiveSpeed(): number {
    return this.baseSpeed * clamp(1 - (0.25 * this.fittedMass) / this.massCap - this.towPenalty(), 0.55, 1);
  }

  get dashing(): boolean { return this.dashLeft > 0; }

  tryDash(): boolean {
    if (this.dashCooldown > 0 || this.dashing) return false;
    this.dashDir = this.lastMoveAge <= RECENT_MOVE_SEC ? { ...this.lastMoveDir } : { x: 0, y: -1 };
    this.dashLeft = DASH_BURST_SEC;
    this.invulnLeft = Math.max(this.invulnLeft, DASH_INVULN_SEC);
    this.dashCooldown = DASH_COOLDOWN_SEC;
    return true;
  }

  step(moveInput: Vec, dashPressed: boolean, dt: number): boolean {
    this.prev = { ...this.pos };
    const input = limitLength(moveInput, 1);
    const l = len(input);
    if (l > 0.2) {
      this.lastMoveDir = { x: input.x / l, y: input.y / l };
      this.lastMoveAge = 0;
    } else this.lastMoveAge += dt;
    const dashed = dashPressed && this.tryDash();
    if (this.dashing) {
      const s = this.baseSpeed * DASH_SPEED_MULT;
      this.vel = { x: this.dashDir.x * s, y: this.dashDir.y * s };
      this.dashLeft = Math.max(this.dashLeft - dt, 0);
      if (!this.dashing) {
        const e = this.effectiveSpeed();
        this.vel = { x: this.dashDir.x * e, y: this.dashDir.y * e };
      }
    } else {
      const e = this.effectiveSpeed();
      const target = { x: input.x * e, y: input.y * e };
      const rate = (l > 0.01 ? ACCEL : DECEL) * dt;
      const dx = target.x - this.vel.x, dy = target.y - this.vel.y;
      const d = Math.hypot(dx, dy);
      this.vel = d <= rate ? target : { x: this.vel.x + (dx / d) * rate, y: this.vel.y + (dy / d) * rate };
    }
    this.invulnLeft = Math.max(this.invulnLeft - dt, 0);
    this.dashCooldown = Math.max(this.dashCooldown - dt, 0);
    this.pos = { x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt };
    this.clampToBounds();
    return dashed;
  }

  // Clamps the whole assembly (half-width), not only the core.
  private clampToBounds(): void {
    const hw = Math.min(this.halfWidth, MAX_HALF_WIDTH);
    const b = this.bounds;
    const x = clamp(this.pos.x, b.x0 + hw, b.x1 - hw);
    const y = clamp(this.pos.y, b.y0, b.y1);
    if (x !== this.pos.x) this.vel.x = 0;
    if (y !== this.pos.y) this.vel.y = 0;
    this.pos = { x, y };
  }
}
