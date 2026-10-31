// Shared reactor energy + per-module heat and fire cadence (SYSTEMS §3).
// Blocked or under-powered guns never spend energy or heat.
import type { FittedModule } from "../ships/assembly";

export const HEAT_MAX = 100;
export const HEAT_UNLOCK = 55;
export const HEAT_MIN_LOCK_SEC = 0.8;
export const COOL_IDLE = 18;
export const COOL_FIRING = 10;
export const OD_FIRE_RATE = 1.5;
export const OD_ENERGY_REGEN = 2;
export const OD_HEAT = 0.75;

export interface Mount {
  module: FittedModule;
  cooldown: number;
  heat: number;
  locked: boolean;
  lockTime: number;
  blocked: boolean;
  shotIndex: number;
  spool: number;      // 0..1, gatling spin-up
}

export class WeaponScheduler {
  mounts: Mount[] = [];
  energy = 100;
  energyCapacity = 100;
  energyRegen = 14;
  coolingMul = 1; // PU08 coolant
  rateMul = 1;    // hangar "ammo feed" / survival fire-rate picks

  sync(modules: FittedModule[]): void {
    const keep = new Map(this.mounts.map((m) => [m.module.instanceId, m]));
    this.mounts = modules.map((module) => keep.get(module.instanceId) ??
      { module, cooldown: 0, heat: 0, locked: false, lockTime: 0, blocked: false, shotIndex: 0, spool: 0 });
  }

  // Mounts run in list order: earlier (primary) guns get power first, later guns
  // stagger when the reactor runs low.
  tick(dt: number, fireHeld: boolean, overdrive: boolean): Mount[] {
    const fired: Mount[] = [];
    for (const m of this.mounts) {
      const w = m.module.weapon;
      const firing = fireHeld && !m.locked && !m.blocked && !m.module.disabled;
      m.cooldown -= dt;
      // spool_gatling (W005): fire rate ramps from 30% to full over spool_sec while firing
      const spoolSec = w.attack_model === "spool_gatling" ? (w.special_params.spool_sec ?? 1.2) : 0;
      if (spoolSec) m.spool = Math.max(0, Math.min(1, m.spool + (firing ? dt : -2 * dt) / spoolSec));
      const rateMul = spoolSec ? 0.3 + 0.7 * m.spool : 1;
      if (firing && m.cooldown <= 0) {
        if (this.energy >= w.energy_per_trigger) {
          this.energy -= w.energy_per_trigger;
          m.heat += w.heat_per_trigger * (overdrive ? OD_HEAT : 1);
          m.cooldown += 1 / (w.trigger_rate * rateMul * this.rateMul * (overdrive ? OD_FIRE_RATE : 1));
          m.shotIndex++;
          fired.push(m);
          if (m.heat >= HEAT_MAX) { m.heat = HEAT_MAX; m.locked = true; m.lockTime = 0; }
        } else m.cooldown = 0;
      }
      if (!firing) m.cooldown = Math.max(m.cooldown, 0);
      m.heat = Math.max(m.heat - (firing ? COOL_FIRING : COOL_IDLE) * this.coolingMul * dt, 0);
      if (m.locked) {
        m.lockTime += dt;
        if (m.heat <= HEAT_UNLOCK && m.lockTime >= HEAT_MIN_LOCK_SEC) m.locked = false;
      }
    }
    this.energy = Math.min(this.energy + this.energyRegen * (overdrive ? OD_ENERGY_REGEN : 1) * dt, this.energyCapacity);
    return fired;
  }

  energyPerSec(): number {
    return this.mounts.reduce((s, m) => s + m.module.weapon.trigger_rate * m.module.weapon.energy_per_trigger, 0);
  }
}
