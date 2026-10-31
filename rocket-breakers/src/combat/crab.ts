// B01 Rivet Crab (P01-03 mini boss). Catalog: core 550, armour 13, joint 78,
// signature "front claw" W021 (integrity 115). Expose: after its grabbing claw
// sweep the claw stays out to the side and the shoulder joint is open 2 s.
// Losing the claw removes claw_sweep for good; it then scuttles sideways firing
// rivets in alternating lanes (compensation). ATTACK_LIBRARY: claw_grab → side_dash
// → mine_fan; after removal mine_fan replaces the grab.
//
// Public shape mirrors ScorpionBoss so the world/HUD treat both alike: `tail` is the
// signature module part (the claw here) and `stingerWorld()` its tip.
import { makePart, type Part } from "./parts";
import { aimed, fan, straight, type Emitter } from "./patterns";
import type { Enemy } from "./enemies";
import type { BossRow } from "../core/types";
import { DEG, lerp, type Vec } from "../core/geometry";
import type { Rng } from "../core/rng";
import { makeItem, transition, type SalvageItem } from "../salvage/salvage";
import { COMPENSATION_WARN_SEC, RECOVERY_SEC, TRANSITION_SEC } from "./boss";

export type CrabActionName = "claw_sweep" | "aimed_rivets" | "side_dash" | "mine_fan" | "aimed_volley";

export interface CrabAction {
  name: CrabActionName;
  t: number;
  dur: number;
  fired: number;
  a0: number;      // sweep start angle (deg)
  a1: number;      // sweep end angle (deg)
  reach: number;   // claw lunge reach (px from the socket)
  target: Vec;     // aim / dash end
  start: Vec;
}

export const CRAB_TELEGRAPH = 1.0;     // catalog minimum_telegraph_sec
export const CLAW_ACTIVE = 0.6;
export const CLAW_OPEN = 2.0;          // expose: joint open 2 s
export const CLAW_RETURN = 0.35;
export const CLAW_SWING = 0.25;        // claw moves out to the side before the joint opens
export const CLAW_DMG = 18;            // named attack (Star C counts these hits)
export const CLAW_WIDTH = 22;          // half-width of the claw's damaging capsule
export const CLAW_LEN = 120;           // folded claw length
const CLAW_REST_DEG = 75;              // hangs down in front of the joint
const CLAW_OPEN_DEG = 0;               // held out to the side: joint visible from below
const CLAW_SEGMENTS = [0.3, 0.6, 0.92];
const DASH_SEC = 0.9;
const DASH_X = [150, 570];

// Geometry fits the BATCH_010 art drawn rotated 180° (crab faces the player, 300 px wide):
// body centre slightly below the pivot, grabbing-claw socket front-right.
export const SOCKET: Vec = { x: 66, y: 38 };

export class CrabBoss {
  readonly e: Enemy;
  readonly core: Part;
  readonly joint: Part;
  readonly plate: Part;
  readonly tail: Part;            // signature module: the grabbing claw (W021)
  readonly item: SalvageItem;
  readonly hintPrefix = "claw";
  phase = 1;
  transition = 0;
  recovery = 1.0;
  action: CrabAction | null = null;
  loopIndex = 0;
  signatureRemoved = false;
  lull = false;
  entering = true;
  home: Vec = { x: 360, y: 380 }; // below the hint box and boss bar
  beamAngle: number | null = null; // B02 compatibility (the crab has no beam)
  beamTick = 0;
  clawAngle = CLAW_REST_DEG;
  clawExtend = 0;                 // arm length beyond the socket during a lunge
  sweepHit = false;               // the current sweep already hit the player
  private flags = { p2: false };
  private dashSide = 1;

  constructor(readonly row: BossRow, runId: string, private em: Emitter, private rng: Rng) {
    this.core = makePart({ id: "core", kind: "core", shape: { type: "circle", r: 52 }, offset: { x: 0, y: 22 }, hp: row.core_hp, selectable: true });
    const armour = (id: string, x: number, y: number, r: number) => makePart({ id, kind: "armor", shape: { type: "circle", r }, offset: { x, y }, hp: 1, invulnerable: true });
    this.joint = makePart({ id: "claw_joint", kind: "joint", shape: { type: "circle", r: 16 }, offset: { ...SOCKET }, hp: row.joint_hp, active: false });
    this.plate = makePart({ id: "claw_plate", kind: "armor", shape: { type: "rect", hw: 18, hh: 18 }, offset: { ...SOCKET }, hp: 1, invulnerable: true });
    this.tail = makePart({ id: "claw", kind: "module", shape: { type: "chain", r: 20, points: this.clawPoints() },
      integrity: row.signature_module_integrity, selectable: true, noContact: true });
    this.e = {
      id: `boss:${row.id}`, defId: row.id, role: "boss", pos: { x: 360, y: -170 }, prev: { x: 360, y: -170 },
      parts: [this.core, armour("legs_l", -100, -80, 30), armour("legs_r", 100, -80, 30), armour("mid_legs_l", -120, -5, 22),
        armour("mid_legs_r", 120, -5, 22), armour("big_claw", -112, 80, 34), this.plate, this.joint, this.tail],
      alive: true, armor: row.armor, age: 0, fireTimer: 0, burstLeft: 0, burstTimer: 0, telegraph: 0, charge: 0,
      credits: 80, scrap: 14, score: 3500, spawnIndex: 0, dir: 1, baseY: 250, tag: "boss", leftArena: false,
      path: null, pathI: 0, track: { x: 360, y: -170 }, speed: 0, wobble: 0, wobblePhase: 0, aim: null,
    };
    this.item = makeItem(`${runId}:${row.id}:claw`, row.signature_weapon_id, row.id, "claw", row.signature_module_integrity, 6);
  }

  get inTransition(): boolean { return this.transition > 0 || this.entering; }
  get jointExposed(): boolean { return this.joint.active; }
  get hpFrac(): number { return this.core.hp / this.core.hpMax; }

  // Claw direction (deg) from the socket; renderer aligns the claw sprite to it.
  tailAngle(): number { return this.clawAngle; }

  private clawPoints(): Vec[] {
    const d = { x: Math.cos(this.clawAngle * DEG), y: Math.sin(this.clawAngle * DEG) };
    return CLAW_SEGMENTS.map((f) => ({ x: SOCKET.x + d.x * (this.clawExtend + CLAW_LEN * f), y: SOCKET.y + d.y * (this.clawExtend + CLAW_LEN * f) }));
  }

  socketWorld(): Vec { return { x: this.e.pos.x + SOCKET.x, y: this.e.pos.y + SOCKET.y }; }

  // Claw tip in world space (sever drop point).
  stingerWorld(): Vec {
    const r = this.clawExtend + CLAW_LEN;
    const s = this.socketWorld();
    return { x: s.x + Math.cos(this.clawAngle * DEG) * r, y: s.y + Math.sin(this.clawAngle * DEG) * r };
  }

  mouthWorld(): Vec { return { x: this.e.pos.x, y: this.e.pos.y + 100 }; }

  // Damaging capsule of the claw while it lunges (world space), or null.
  sweepSegment(): { from: Vec; to: Vec; width: number; dmg: number } | null {
    const a = this.action;
    if (!a || a.name !== "claw_sweep" || a.t < CRAB_TELEGRAPH || a.t > CRAB_TELEGRAPH + CLAW_ACTIVE) return null;
    return { from: this.socketWorld(), to: this.stingerWorld(), width: CLAW_WIDTH, dmg: CLAW_DMG };
  }

  loop(): CrabActionName[] {
    if (this.lull) return ["aimed_volley"];
    const claw = !this.signatureRemoved;
    if (this.phase === 1) return ["claw_sweep", "aimed_rivets", "side_dash"];
    return claw ? ["claw_sweep", "aimed_rivets", "mine_fan", "side_dash"] : ["mine_fan", "side_dash", "aimed_rivets"];
  }

  upcoming(): CrabActionName | null {
    if (this.entering) return null;
    const loop = this.loop();
    return loop[this.loopIndex % loop.length];
  }

  // HUD cue: the joint opens after the next/current claw sweep.
  jointSoon(): boolean {
    return !this.jointExposed && (this.action?.name === "claw_sweep" || (!this.action && this.upcoming() === "claw_sweep"));
  }

  exposureLeft(): number {
    const a = this.action;
    if (!this.jointExposed || !a || a.name !== "claw_sweep") return 0;
    return Math.max(0, CRAB_TELEGRAPH + CLAW_ACTIVE + CLAW_SWING + CLAW_OPEN - a.t);
  }

  update(dt: number, player: Vec): void {
    const e = this.e;
    e.prev = { ...e.pos };
    e.age += dt;
    if (this.entering) {
      e.pos.y = Math.min(this.home.y, e.pos.y + 170 * dt);
      if (e.pos.y >= this.home.y) { this.entering = false; this.recovery = 0.8; }
      this.updatePose();
      return;
    }
    const dashing = this.action?.name === "side_dash" && this.action.t >= CRAB_TELEGRAPH;
    if (!dashing) {
      const target = { x: this.home.x + Math.sin(e.age * 0.6) * 50, y: this.home.y };
      e.pos = lerp(e.pos, target, Math.min(1, dt * 2.0));
    }
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); this.updatePose(); return; }
    if (!this.action) {
      this.recovery -= dt;
      if (this.recovery <= 0) {
        const loop = this.loop();
        this.startAction(loop[this.loopIndex % loop.length], player);
        this.loopIndex++;
      }
    }
    if (this.action) this.runAction(this.action, dt, player);
    this.updatePose();
  }

  // Claw pose + joint exposure from the current action.
  private updatePose(): void {
    const a = this.action;
    let angle = CLAW_REST_DEG, extend = 0, open = false;
    if (a?.name === "claw_sweep") {
      const t1 = CRAB_TELEGRAPH, t2 = t1 + CLAW_ACTIVE, t3 = t2 + CLAW_SWING + CLAW_OPEN;
      if (a.t < t1) angle = CLAW_REST_DEG + (a.a0 - CLAW_REST_DEG) * Math.min(1, a.t / 0.4); // wind up toward the start
      else if (a.t < t2) {
        const k = (a.t - t1) / CLAW_ACTIVE;
        angle = a.a0 + (a.a1 - a.a0) * k;
        extend = Math.sin(Math.PI * k) * (a.reach - CLAW_LEN);
      } else if (a.t < t3) {
        const k = Math.min(1, (a.t - t2) / CLAW_SWING);
        angle = a.a1 + (CLAW_OPEN_DEG - a.a1) * k;
        open = k >= 1;
      } else angle = CLAW_OPEN_DEG + (CLAW_REST_DEG - CLAW_OPEN_DEG) * Math.min(1, (a.t - t3) / CLAW_RETURN);
    }
    this.clawAngle = angle;
    this.clawExtend = Math.max(0, extend);
    const pts = (this.tail.shape as { points: Vec[] }).points;
    const next = this.clawPoints();
    for (let i = 0; i < pts.length; i++) pts[i] = next[i];
    const exposed = !this.signatureRemoved && open;
    if (exposed !== this.joint.active && !this.signatureRemoved) {
      this.joint.active = exposed;
      this.joint.selectable = exposed;
      this.plate.active = !exposed;
      transition(this.item, exposed ? "exposed" : "attached", `open:${this.item.instanceId}:${this.e.age.toFixed(3)}`, 0);
    }
  }

  private startAction(name: CrabActionName, player: Vec): void {
    const a: CrabAction = { name, t: 0, dur: 1, fired: 0, a0: 0, a1: 0, reach: CLAW_LEN, target: { ...player }, start: { ...this.e.pos } };
    switch (name) {
      case "claw_sweep": {
        // Lunge toward where the player is at the warning start, sweeping 100° across it.
        const s = this.socketWorld();
        const toPlayer = Math.atan2(player.y - s.y, player.x - s.x) / DEG;
        const side = this.rng.next() < 0.5 ? -1 : 1;
        a.a0 = toPlayer + 50 * side;
        a.a1 = toPlayer - 50 * side;
        a.reach = Math.max(220, Math.min(420, Math.hypot(player.x - s.x, player.y - s.y) + 40));
        a.dur = CRAB_TELEGRAPH + CLAW_ACTIVE + CLAW_SWING + CLAW_OPEN + CLAW_RETURN;
        this.sweepHit = false;
        break;
      }
      case "aimed_rivets": a.dur = CRAB_TELEGRAPH + 0.6; break;
      case "side_dash": {
        this.dashSide = this.e.pos.x < 360 ? 1 : 0;
        a.target = { x: DASH_X[this.dashSide], y: this.e.pos.y };
        a.dur = CRAB_TELEGRAPH + DASH_SEC + 0.3;
        break;
      }
      case "mine_fan": a.dur = CRAB_TELEGRAPH + 0.5; break;
      case "aimed_volley": a.dur = 1.4; break;
    }
    this.action = a;
  }

  private runAction(a: CrabAction, dt: number, player: Vec): void {
    a.t += dt;
    const em = this.em;
    switch (a.name) {
      case "aimed_rivets":
        // aim sampled at the warning start (a.target); 5 rivets in a ±12° spread
        if (a.fired === 0 && a.t >= CRAB_TELEGRAPH) {
          const m = this.mouthWorld();
          const base = Math.atan2(a.target.y - m.y, a.target.x - m.x) / DEG;
          for (let i = -2; i <= 2; i++) straight(em, m, base + i * 6, 240, 5, 8);
          a.fired++;
        }
        break;
      case "side_dash": {
        if (a.t >= CRAB_TELEGRAPH && a.t < CRAB_TELEGRAPH + DASH_SEC) {
          const k = (a.t - CRAB_TELEGRAPH) / DASH_SEC;
          this.e.pos = { x: a.start.x + (a.target.x - a.start.x) * (k * k * (3 - 2 * k)), y: a.start.y };
          // compensation: rivets straight down in alternating lanes while dashing
          if (this.signatureRemoved && a.t >= CRAB_TELEGRAPH + a.fired * 0.15) {
            straight(em, { x: this.e.pos.x + (a.fired % 2 ? 40 : -40), y: this.e.pos.y + 80 }, 90, 230, 5, 8);
            a.fired++;
          }
        }
        if (a.t >= CRAB_TELEGRAPH + DASH_SEC) this.home = { x: a.target.x, y: this.home.y };
        break;
      }
      case "mine_fan":
        if (a.fired === 0 && a.t >= CRAB_TELEGRAPH) { fan(em, this.mouthWorld(), 90, 5, 80, 120, 9, 10); a.fired++; }
        break;
      case "aimed_volley":
        if (a.fired < 3 && a.t >= 0.5 + a.fired * 0.15) { aimed(em, this.mouthWorld(), player, 230, 5, 8); a.fired++; }
        break;
      case "claw_sweep":
        break;
    }
    if (a.t >= a.dur) this.endAction();
  }

  private endAction(): void {
    this.action = null;
    this.recovery = RECOVERY_SEC;
  }

  afterDamage(): ("sever_intact" | "sever_scrap" | "tail_destroyed" | "phase2" | "phase3" | "dead")[] {
    const out: ReturnType<CrabBoss["afterDamage"]> = [];
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
    } else if (out.length && this.flags.p2) this.beginTransition(COMPENSATION_WARN_SEC);
    if (this.core.hp <= 0 && this.e.alive) {
      this.e.alive = false;
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
    this.beginTransition(COMPENSATION_WARN_SEC);
  }

  private beginTransition(sec: number): void {
    this.transition = Math.max(this.transition, sec);
    if (this.action) this.endAction();
    this.loopIndex = 0;
    this.updatePose();
  }

  private removeSignature(): void {
    this.signatureRemoved = true;
    this.tail.active = false;
    this.tail.selectable = false;
    this.joint.active = false;
    this.joint.selectable = false;
    this.plate.active = false;
    if (this.action?.name === "claw_sweep") this.endAction();
  }
}
