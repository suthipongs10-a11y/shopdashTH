// B02 Scorpion Reclaimer (catalog + ATTACK_LIBRARY "Example B02 complete cycle").
// Parts: core, two armoured claws, tail joint (exposed only while venting), a
// closed armour plate over the joint, and the signature tail module (W022).
// Stealing or destroying the tail removes tail attacks for the rest of the fight.
import { makePart, type Part } from "./parts";
import { aimed, fan, ringGap, type Emitter } from "./patterns";
import type { Enemy } from "./enemies";
import type { BossRow } from "../core/types";
import { DEG, lerp, type Vec } from "../core/geometry";
import type { Rng } from "../core/rng";
import { makeItem, transition, type SalvageItem } from "../salvage/salvage";

export type ActionName = "claw_fan" | "tail_sweep" | "tail_vent" | "claw_ring" | "lateral_charge" | "aimed_volley";

export interface BossAction {
  name: ActionName;
  t: number;
  dur: number;
  fired: number;       // emission steps already performed
  a0: number;          // sweep start angle (deg) / ring safe heading
  a1: number;          // sweep end angle (deg)
  target: Vec;         // charge lane end / volley aim
  start: Vec;
}

export const RECOVERY_SEC = 0.6;
export const TRANSITION_SEC = 2;
export const COMPENSATION_WARN_SEC = 0.8;
export const SWEEP_WINDUP = 1.2;
export const SWEEP_ACTIVE = 1.2;
export const SWEEP_RATE_DEG = 25;
export const SWEEP_WIDTH = 12;
export const SWEEP_RANGE = 900;
export const SWEEP_TICK_DMG = 8; // per 0.1 s tick (not in catalog; see DECISIONS)
export const VENT_SEC = 2.5;
export const CHARGE_WARN = 1;
export const CHARGE_SEC = 0.45;
export const CHARGE_SPEED = 600;
export const CONTACT_DAMAGE = 20;

const JOINT_OFFSET: Vec = { x: 88, y: -40 };
const TAIL_HANG: Vec[] = [{ x: 112, y: -8 }, { x: 128, y: 34 }, { x: 122, y: 78 }];
const TAIL_LIFT: Vec[] = [{ x: 108, y: -80 }, { x: 88, y: -114 }, { x: 56, y: -130 }];
const TAIL_ACTIONS: ActionName[] = ["tail_sweep", "tail_vent"];

export class ScorpionBoss {
  readonly e: Enemy;
  readonly core: Part;
  readonly joint: Part;
  readonly plate: Part;
  readonly tail: Part;
  readonly item: SalvageItem;
  phase = 1;
  transition = 0;          // remaining phase-transition / compensation warning time
  recovery = 1.0;
  action: BossAction | null = null;
  loopIndex = 0;
  tailPose = 0;            // 0 = hanging in front, 1 = lifted behind (vent)
  signatureRemoved = false;
  lull = false;            // reduced fire while reinforcements/dock resolve after a sever
  entering = true;
  home: Vec = { x: 360, y: 395 }; // clear of the top HUD and boss bar
  beamAngle: number | null = null; // active sweep beam (deg)
  beamTick = 0;
  private flags = { p2: false, p3: false };
  ringFlip = 1;

  constructor(readonly row: BossRow, runId: string, private em: Emitter, private rng: Rng) {
    this.core = makePart({ id: "core", kind: "core", shape: { type: "circle", r: 62 }, hp: row.core_hp, selectable: true });
    const clawL = makePart({ id: "claw_l", kind: "armor", shape: { type: "circle", r: 32 }, offset: { x: -130, y: 58 }, hp: 1, invulnerable: true });
    const clawR = makePart({ id: "claw_r", kind: "armor", shape: { type: "circle", r: 32 }, offset: { x: 130, y: 58 }, hp: 1, invulnerable: true });
    this.joint = makePart({ id: "tail_joint", kind: "joint", shape: { type: "circle", r: 18 }, offset: { ...JOINT_OFFSET }, hp: row.joint_hp, active: false });
    this.plate = makePart({ id: "tail_plate", kind: "armor", shape: { type: "rect", hw: 24, hh: 22 }, offset: { ...JOINT_OFFSET }, hp: 1, invulnerable: true });
    this.tail = makePart({ id: "tail", kind: "module", shape: { type: "chain", r: 17, points: TAIL_HANG.map((p) => ({ ...p })) },
      integrity: row.signature_module_integrity, selectable: true });
    this.e = {
      id: `boss:${row.id}`, defId: row.id, role: "boss", pos: { x: 360, y: -170 }, prev: { x: 360, y: -170 },
      parts: [this.core, clawL, clawR, this.plate, this.joint, this.tail], alive: true, armor: row.armor, age: 0,
      fireTimer: 0, burstLeft: 0, burstTimer: 0, telegraph: 0, charge: 0, credits: 120, scrap: 20, score: 5000,
      spawnIndex: 0, dir: 1, baseY: 250, tag: "boss", leftArena: false,
    };
    this.item = makeItem(`${runId}:${row.id}:tail`, row.signature_weapon_id, row.id, "tail", row.signature_module_integrity, 7);
  }

  get inTransition(): boolean { return this.transition > 0 || this.entering; }
  get jointExposed(): boolean { return this.joint.active; }
  get hpFrac(): number { return this.core.hp / this.core.hpMax; }

  stingerWorld(): Vec {
    const pts = (this.tail.shape as { points: Vec[] }).points;
    const s = pts[pts.length - 1];
    return { x: this.e.pos.x + s.x, y: this.e.pos.y + s.y };
  }

  clawWorld(side: -1 | 1): Vec {
    return { x: this.e.pos.x + 130 * side, y: this.e.pos.y + 74 };
  }

  loop(): ActionName[] {
    if (this.lull) return ["aimed_volley"];
    const tail = !this.signatureRemoved;
    if (this.phase === 1) return ["claw_fan", "tail_sweep", "tail_vent"];
    if (this.phase === 2) return tail ? ["claw_ring", "tail_sweep", "tail_vent"] : ["claw_ring", "lateral_charge"];
    return tail ? ["claw_ring", "tail_sweep", "tail_vent", "lateral_charge"] : ["claw_ring", "lateral_charge", "claw_fan"];
  }

  update(dt: number, player: Vec): void {
    const e = this.e;
    e.prev = { ...e.pos };
    e.age += dt;
    if (this.entering) {
      e.pos.y = Math.min(this.home.y, e.pos.y + 170 * dt);
      if (e.pos.y >= this.home.y) { this.entering = false; this.recovery = 0.8; }
      this.updatePose(dt);
      return;
    }
    const charging = this.action?.name === "lateral_charge" && this.action.t >= CHARGE_WARN;
    if (!charging) {
      const target = { x: this.home.x + Math.sin(e.age * 0.5) * 60, y: this.home.y };
      e.pos = lerp(e.pos, target, Math.min(1, dt * 2.5));
    }
    this.updatePose(dt);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    if (!this.action) {
      this.recovery -= dt;
      if (this.recovery > 0) return;
      const loop = this.loop();
      this.startAction(loop[this.loopIndex % loop.length], player);
      this.loopIndex++;
    }
    if (this.action) this.runAction(this.action, dt, player);
  }

  private updatePose(dt: number): void {
    const a = this.action;
    const target = a?.name === "tail_vent" && a.t > 0.15 && a.t < a.dur - 0.2 ? 1 : 0;
    this.tailPose += Math.sign(target - this.tailPose) * Math.min(Math.abs(target - this.tailPose), dt / 0.3);
    const pts = (this.tail.shape as { points: Vec[] }).points;
    for (let i = 0; i < pts.length; i++) pts[i] = lerp(TAIL_HANG[i], TAIL_LIFT[i], this.tailPose);
    const exposed = !this.signatureRemoved && this.tailPose > 0.95 && this.action?.name === "tail_vent";
    if (exposed !== this.joint.active && !this.signatureRemoved) {
      this.joint.active = exposed;
      this.joint.selectable = exposed;
      this.plate.active = !exposed;
      transition(this.item, exposed ? "exposed" : "attached", `vent:${this.item.instanceId}:${this.e.age.toFixed(3)}`, 0);
    }
  }

  private startAction(name: ActionName, player: Vec): void {
    const a: BossAction = { name, t: 0, dur: 1, fired: 0, a0: 0, a1: 0, target: { ...player }, start: { ...this.e.pos } };
    switch (name) {
      case "claw_fan": a.dur = 2.0; break;
      case "tail_sweep": {
        const s = this.stingerWorld();
        const toPlayer = Math.atan2(player.y - s.y, player.x - s.x) / DEG;
        const side = this.rng.next() < 0.5 ? -1 : 1;
        a.a0 = toPlayer + 15 * side;
        a.a1 = a.a0 - side * SWEEP_RATE_DEG * SWEEP_ACTIVE;
        a.dur = SWEEP_WINDUP + SWEEP_ACTIVE;
        break;
      }
      // Lift (0.3 s) + full 2.5 s exposure + lower: joint is open for VENT_SEC.
      case "tail_vent": a.dur = VENT_SEC + 0.65; break;
      case "claw_ring": {
        const c = this.e.pos;
        const toPlayer = Math.atan2(player.y - c.y, player.x - c.x) / DEG;
        const jitter = this.phase === 3 ? 22.5 * this.ringFlip : (this.rng.int(3) - 1) * 22.5;
        this.ringFlip *= -1;
        a.a0 = toPlayer + jitter;
        a.dur = 1.2;
        break;
      }
      case "lateral_charge": {
        const dx = player.x - this.e.pos.x, dy = player.y - this.e.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = CHARGE_SPEED * CHARGE_SEC;
        a.target = { x: this.e.pos.x + (dx / d) * reach, y: this.e.pos.y + (dy / d) * reach };
        a.dur = CHARGE_WARN + CHARGE_SEC + 0.6;
        break;
      }
      case "aimed_volley": a.dur = 1.2; break;
    }
    this.action = a;
  }

  private runAction(a: BossAction, dt: number, player: Vec): void {
    a.t += dt;
    const em = this.em;
    switch (a.name) {
      case "claw_fan":
        if (a.fired === 0 && a.t >= 0.6) { fan(em, this.clawWorld(-1), 105, 5, 60, 210, 5, 10); a.fired++; }
        if (a.fired === 1 && a.t >= 1.8) { fan(em, this.clawWorld(1), 75, 5, 60, 210, 5, 10); a.fired++; }
        break;
      case "tail_sweep":
        if (a.t >= SWEEP_WINDUP) {
          const k = Math.min(1, (a.t - SWEEP_WINDUP) / SWEEP_ACTIVE);
          this.beamAngle = a.a0 + (a.a1 - a.a0) * k;
        }
        break;
      case "tail_vent":
        if (a.fired < 3 && a.t >= 0.4 + a.fired * 0.12) { aimed(em, this.clawWorld(-1), player, 230, 5, 8); a.fired++; }
        break;
      case "claw_ring":
        if (a.fired === 0 && a.t >= 0.8) {
          ringGap(em, this.e.pos, a.a0, 16, 3, this.phase === 3 ? 198 : 180, 5, 10);
          a.fired++;
        }
        break;
      case "lateral_charge":
        if (a.t >= CHARGE_WARN && a.t < CHARGE_WARN + CHARGE_SEC) {
          this.e.pos = lerp(a.start, a.target, (a.t - CHARGE_WARN) / CHARGE_SEC);
        }
        break;
      case "aimed_volley":
        if (a.fired < 3 && a.t >= 0.4 + a.fired * 0.12) { aimed(em, this.clawWorld(a.fired % 2 ? 1 : -1), player, 230, 5, 8); a.fired++; }
        break;
    }
    if (a.t >= a.dur) this.endAction();
  }

  private endAction(): void {
    this.action = null;
    this.beamAngle = null;
    this.recovery = RECOVERY_SEC;
  }

  // Called once per tick after damage resolution. Returns events for the world.
  afterDamage(): ("sever_intact" | "sever_scrap" | "tail_destroyed" | "phase2" | "phase3" | "dead")[] {
    const out: ReturnType<ScorpionBoss["afterDamage"]> = [];
    if (!this.signatureRemoved && this.joint.hp <= 0) {
      const intact = this.tail.integrity / this.tail.integrityMax >= 0.35;
      this.removeSignature();
      out.push(intact ? "sever_intact" : "sever_scrap");
    } else if (!this.signatureRemoved && this.tail.integrity <= 0) {
      this.removeSignature();
      out.push("tail_destroyed");
    }
    if (!this.flags.p2 && (this.hpFrac <= 0.6 || this.signatureRemoved) && this.core.hp > 0) {
      this.flags.p2 = true;
      this.phase = 2;
      this.beginTransition(TRANSITION_SEC);
      out.push("phase2");
    } else if (out.length && this.flags.p2) {
      // Signature lost after P2 already started: alternate pattern after a warning.
      this.beginTransition(COMPENSATION_WARN_SEC);
    }
    if (!this.flags.p3 && this.hpFrac <= 0.25 && this.core.hp > 0) {
      this.flags.p3 = true;
      this.phase = 3;
      this.beginTransition(TRANSITION_SEC);
      out.push("phase3");
    }
    if (this.core.hp <= 0 && this.e.alive) {
      this.e.alive = false;
      this.beamAngle = null;
      this.action = null;
      out.push("dead");
    }
    return out;
  }

  startLull(): void { this.lull = true; this.loopIndex = 0; }

  endLull(): void {
    if (!this.lull) return;
    this.lull = false;
    this.loopIndex = 0;
    this.action = null;
    this.beamAngle = null;
    this.beginTransition(COMPENSATION_WARN_SEC);
  }

  // Never stacks transitions: concurrent HP/sever triggers keep one timer.
  private beginTransition(sec: number): void {
    this.transition = Math.max(this.transition, sec);
    if (this.action) this.endAction();
    this.loopIndex = 0;
  }

  private removeSignature(): void {
    this.signatureRemoved = true;
    this.tail.active = false;
    this.tail.selectable = false;
    this.joint.active = false;
    this.joint.selectable = false;
    this.plate.active = false;
    if (this.action && TAIL_ACTIONS.includes(this.action.name)) this.endAction();
    this.beamAngle = null;
  }
}
