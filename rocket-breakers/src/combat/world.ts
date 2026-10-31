// CombatWorld — deterministic fixed-tick simulation of one mission leg.
// Tick order (TECHNICAL): input → mission spawn → movement → weapons →
// projectile movement / swept collision → damage → part transitions →
// pickups / tow → objectives → visual events. Rendering only reads this state.
import type { Catalog } from "../core/catalog";
import { DT } from "../core/frameDriver";
import { DEG, clamp, dist, pointSegmentDistance, type Vec } from "../core/geometry";
import { Rng } from "../core/rng";
import type { WeaponRow } from "../core/types";
import { Assembly, TILE, cellToLocal, type FittedModule } from "../ships/assembly";
import { PlayerMotion } from "../ships/motion";
import { BulletPool, type Bullet } from "./bullets";
import { coreOf, makeBarge, makeScout, updateEnemy, type Enemy } from "./enemies";
import { firstPartHit, partContains, partWorldPos, PRIORITY, type Part } from "./parts";
import type { Emitter } from "./patterns";
import { CONTACT_DAMAGE, SWEEP_RANGE, SWEEP_TICK_DMG, SWEEP_WIDTH, ScorpionBoss } from "./boss";
import { WeaponScheduler, type Mount } from "./weapons";
import { ageLoose, isIntact, makeItem, transition, PICKUP_INVULN_SEC, type SalvageItem } from "../salvage/salvage";
import type { RunResult, SecuredItem } from "../campaign/settlement";
import { BuffManager, DropDirector, DROP_RULES, CONVERT_CHARGE, MAGNET_SPEED, PICKUP_RADIUS, choosePickup, pickupDef, type Pickup, type ScrapMote } from "./powerups";

export const WORLD_W = 720;
export const WORLD_H = 1280;
export const PLAYER_BOUNDS = { x0: 0, y0: 110, x1: 720, y1: 1040 };
export const CORE_RADIUS = 12;
export const HIT_INVULN_SEC = 0.45;
export const SHIELD_DELAY_SEC = 4;
export const SHIELD_REGEN = 8;
export const GRAZE_PAD = 20;
export const GRAZE_PER_BULLET = 0.25;
export const GRAZE_CAP_PER_SEC = 3;
export const OVERDRIVE_SEC = 5;
export const SEVER_CHARGE = 15;
export const WEAK_POINT_BONUS = 1.25;
export const CORE_SPILL_MAX = 0.1;
export const MODULE_TO_CORE = 0.25;
export const TRACTOR_RANGE = 150;
export const TRACTOR_CONE_DEG = 40;
export const TRACTOR_DWELL = 0.6;
export const CABLE_REST = 90;
export const CABLE_MAX = 240;
export const CABLE_SNAP_SEC = 0.75;
export const CARGO_RADIUS = 18;
export const DOCK_GRACE_SEC = 1;
export const RELEASE_CONFIRM_SEC = 1.5;
export const OWNER_DROP_REPAIR = 0.3;
export const MOTE_LIFE = 8;
export const MOTE_PICK_RADIUS = 34;
export const MAGNET_RADIUS = 220;
export const HITSTOP_SEVER_TICKS = 4;   // 0.06 s
export const HITSTOP_ELITE_TICKS = 2;   // 0.035 s
export const HITSTOP_COOLDOWN = 0.5;
export const LOW_HP_AID_FRAC = 0.3;
export const LOW_HP_AID_COOLDOWN = 60;

export interface TickInput {
  move: Vec;
  dash?: boolean;
  overdrive?: boolean;
  tractorHeld?: boolean;
  tractorTap?: boolean;
  fire?: boolean;
}

export type GameEvent =
  | { type: "muzzle"; pos: Vec; family: string }
  | { type: "hit" | "deflect" | "blast" | "kill" | "player_hit" | "shield_hit" | "graze" | "joint_break" | "sever" | "scrap" | "secured" | "tractor_lock" | "snap" | "overdrive" | "dash" | "phase" | "boss_dead" | "module_lost" | "pickup" | "scrap_pick" | "converted"; pos: Vec; value?: number; tag?: string };

export interface WorldOptions {
  seed?: number;
  runId?: string;
  autoLock?: boolean;
  autoTractor?: boolean;
  invulnerable?: boolean; // test/dev only: player takes no damage
  startAt?: "intro" | "boss";
}

interface Lock { enemyId: string; partId: string }

export class CombatWorld {
  readonly rng: Rng;
  readonly runId: string;
  tick = 0;
  status: "running" | "victory" | "defeat" = "running";
  // player
  motion = new PlayerMotion();
  assembly: Assembly;
  weapons = new WeaponScheduler();
  hp: number;
  hpMax: number;
  shield: number;
  shieldMax: number;
  shieldDelay = 0;
  hitInvuln = 0;
  grace = 0;
  overdriveCharge = 0;
  overdriveLeft = 0;
  grazeWindow = 0;
  grazeThisSec = 0;
  coreDamageTaken = 0;
  lock: Lock | null = null;
  hold: { item: SalvageItem; module: FittedModule | null }[] = [];
  holdCapacity: number;
  // world
  enemies: Enemy[] = [];
  boss: ScorpionBoss | null = null;
  friendly = new BulletPool(300);
  hostile = new BulletPool(600);
  items: SalvageItem[] = [];
  tow: { itemId: string; progress: number; overLength: number; towing: boolean; releaseArmed: number } | null = null;
  dock: { itemId: string } | null = null;
  beams: { from: Vec; to: Vec; ttl: number }[] = [];
  blasts: { pos: Vec; r: number; ttl: number }[] = [];
  events: GameEvent[] = [];
  hints: string[] = [];
  private shownHints = new Set<string>();
  private plasmaTargets = new Map<number, Lock>();
  private contactCd = 0;
  // mission
  phase: "intro" | "wave1" | "wave2" | "boss_entry" | "boss" | "outro" = "intro";
  phaseTimer = 2.5;
  reinforcementsSpawned = false;
  severed: string[] = [];
  stolen: string[] = [];
  kills = 0;
  score = 0;
  combatCredits = 0;
  combatScrap = 0;
  result: RunResult | null = null;
  // power-ups (expansion 1.1)
  pickups: Pickup[] = [];
  motes: ScrapMote[] = [];
  buffs = new BuffManager();
  drops = new DropDirector();
  overshield = 0;
  overshieldLeft = 0;
  hitstop = 0;
  private hitstopCd = 0;
  private pickupQueue: string[] = [];
  private pickupSeq = 0;
  private moteSeq = 0;
  private lastAidAt = -999;
  private authored = { offense: false, defense: false, rescue: false };
  private wave1Kills = 0;
  private lastBossAction: string | null = null;
  private em: Emitter;
  private nextEnemy = 1;
  private bossDeadAt = -1;

  constructor(readonly catalog: Catalog, readonly opts: WorldOptions = {}) {
    this.rng = new Rng(opts.seed ?? 20261031);
    this.runId = opts.runId ?? "run1";
    const hull = catalog.hull("H01");
    this.assembly = Assembly.fromStarter(hull, catalog);
    this.hp = this.hpMax = hull.hp;
    this.shield = this.shieldMax = hull.shield;
    this.holdCapacity = hull.cargo_capacity;
    this.motion.baseSpeed = hull.base_speed;
    this.motion.massCap = hull.mass_cap;
    this.motion.bounds = PLAYER_BOUNDS;
    this.weapons.energyCapacity = this.weapons.energy = hull.reactor_capacity;
    this.weapons.energyRegen = hull.energy_regen;
    this.em = { hostile: this.hostile, speedMul: 1, damageMul: 1 };
    this.refreshAssembly();
    if (opts.startAt === "boss") { this.phase = "boss_entry"; this.phaseTimer = 0; }
  }

  // ---------------------------------------------------------------- queries
  get towedItem(): SalvageItem | null {
    return this.tow ? this.items.find((i) => i.instanceId === this.tow!.itemId) ?? null : null;
  }

  get playerInvulnerable(): boolean {
    return !!this.opts.invulnerable || this.motion.invulnLeft > 0 || this.hitInvuln > 0 || this.grace > 0 || !!this.dock;
  }

  enemyById(id: string): Enemy | undefined {
    return id === this.boss?.e.id ? this.boss.e : this.enemies.find((e) => e.id === id);
  }

  lockedPart(): { enemy: Enemy; part: Part } | null {
    if (!this.lock) return null;
    const enemy = this.enemyById(this.lock.enemyId);
    const part = enemy?.parts.find((p) => p.id === this.lock!.partId);
    return enemy && enemy.alive && part ? { enemy, part } : null;
  }

  allEnemies(): Enemy[] {
    return this.boss && this.boss.e.alive ? [...this.enemies, this.boss.e] : this.enemies;
  }

  // Tractor eligibility: in range and inside the forward aim cone.
  tractorCandidate(): SalvageItem | null {
    if (this.tow?.towing) return null;
    let best: SalvageItem | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      if (it.state !== "detached_intact" && it.state !== "owner_drop" && it.state !== "acquiring") continue;
      const d = dist(it.pos, this.motion.pos);
      if (d > TRACTOR_RANGE) continue;
      const ang = Math.abs(Math.atan2(it.pos.x - this.motion.pos.x, -(it.pos.y - this.motion.pos.y))) / DEG;
      if (ang > TRACTOR_CONE_DEG / 2 && d > 40) continue;
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  // ---------------------------------------------------------------- commands
  // Tap-to-lock: the highest-priority selectable part under the point.
  lockAt(p: Vec): boolean {
    let best: Lock | null = null;
    let bestScore = -Infinity;
    for (const e of this.allEnemies()) {
      for (const part of e.parts) {
        if (!part.active || !part.selectable || !partContains(part, e.pos, p, 16)) continue;
        const score = PRIORITY[part.kind] * 1000 - dist(partWorldPos(part, e.pos), p);
        if (score > bestScore) { bestScore = score; best = { enemyId: e.id, partId: part.id }; }
      }
    }
    if (best) this.lock = best;
    return !!best;
  }

  // Cycle through selectable parts (keyboard/gamepad), joints first.
  cycleLock(): void {
    const options: Lock[] = [];
    for (const e of this.allEnemies()) for (const part of e.parts) if (part.active && part.selectable) options.push({ enemyId: e.id, partId: part.id });
    if (!options.length) { this.lock = null; return; }
    options.sort((a, b) => {
      const pa = this.enemyById(a.enemyId)!.parts.find((x) => x.id === a.partId)!;
      const pb = this.enemyById(b.enemyId)!.parts.find((x) => x.id === b.partId)!;
      return PRIORITY[pb.kind] - PRIORITY[pa.kind];
    });
    const i = this.lock ? options.findIndex((o) => o.enemyId === this.lock!.enemyId && o.partId === this.lock!.partId) : -1;
    this.lock = options[(i + 1) % options.length];
  }

  // ---------------------------------------------------------------- tick
  step(input: TickInput): void {
    if (this.status !== "running" || this.dock) return;
    // Hitstop freezes the whole simulation, timers included.
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.tick++;
    this.hitstopCd = Math.max(0, this.hitstopCd - DT);
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
    this.updateMission();
    // movement
    this.motion.towing = !!this.tow?.towing;
    this.motion.cargoMass = this.towedItem?.mass ?? 0;
    if (this.motion.step(input.move, !!input.dash, DT)) {
      this.events.push({ type: "dash", pos: { ...this.motion.pos } });
      if (this.tow && !this.tow.towing) this.tow = null; // dash cancels acquiring
    }
    for (const e of this.enemies) updateEnemy(e, DT, this.em);
    this.enemies = this.enemies.filter((e) => !e.leftArena);
    if (this.boss?.e.alive) this.boss.update(DT, this.motion.pos);
    if (input.overdrive && this.overdriveCharge >= 100 && this.overdriveLeft <= 0) {
      this.overdriveCharge = 0;
      this.overdriveLeft = OVERDRIVE_SEC;
      this.events.push({ type: "overdrive", pos: { ...this.motion.pos } });
    }
    const od = this.overdriveLeft > 0;
    this.overdriveLeft = Math.max(0, this.overdriveLeft - DT);
    // weapons
    this.updateAutoLock();
    for (const m of this.weapons.tick(DT, input.fire ?? true, od)) this.fire(m);
    // projectiles
    this.steerPlasma();
    this.friendly.move(DT);
    this.hostile.move(DT);
    // collision + damage
    this.resolveFriendly();
    this.resolveHostile();
    this.resolveBossBeamAndContact();
    // part transitions
    this.resolveDeaths();
    // pickups / tow
    this.updateSalvage(input);
    this.updatePickups();
    // objectives / player state
    this.updatePlayerTimers();
    if (this.hp <= 0) this.finish(false);
    for (const b of this.beams) b.ttl -= DT;
    this.beams = this.beams.filter((b) => b.ttl > 0);
    for (const b of this.blasts) b.ttl -= DT;
    this.blasts = this.blasts.filter((b) => b.ttl > 0);
    for (const e of this.allEnemies()) for (const p of e.parts) p.flash = Math.max(0, p.flash - DT);
  }

  // ---------------------------------------------------------------- mission
  private spawnId(prefix: string): string { return `${prefix}${this.nextEnemy++}`; }

  private updateMission(): void {
    this.phaseTimer -= DT;
    const minorsAlive = this.enemies.length > 0;
    // Safe dock opens once the current micro-wave is clear while towing a part.
    const towed = this.tow?.towing ? this.towedItem : null;
    if (towed && !minorsAlive && !this.dock && (!this.boss || this.boss.lull || !this.boss.e.alive) && this.phase !== "intro") {
      this.startDock(towed);
      return;
    }
    switch (this.phase) {
      case "intro":
        if (this.phaseTimer <= 0) {
          this.phase = "wave1";
          for (let i = 0; i < 5; i++) this.enemies.push(makeScout(this.spawnId("e"), this.catalog.enemy("E01"), i, true, "wave1"));
        }
        break;
      case "wave1":
        if (!minorsAlive) {
          this.phase = "wave2";
          this.hint("hint.flank");
          for (let i = 0; i < 2; i++) this.enemies.push(makeBarge(this.spawnId("e"), this.catalog.enemy("E03"), i, i === 0, "wave2"));
          for (let i = 0; i < 3; i++) this.enemies.push(makeScout(this.spawnId("e"), this.catalog.enemy("E01"), i, false, "wave2"));
        }
        break;
      case "wave2":
        if (!minorsAlive) { this.phase = "boss_entry"; this.phaseTimer = 2; }
        break;
      case "boss_entry":
        if (this.phaseTimer <= 0 && !this.boss) {
          this.boss = new ScorpionBoss(this.catalog.boss("B02"), this.runId, this.em, this.rng);
          this.items.push(this.boss.item);
          this.phase = "boss";
          this.hint("hint.boss");
        }
        break;
      case "boss": {
        const b = this.boss!;
        if (b.lull && !minorsAlive) {
          const st = b.item.state;
          if (st !== "detached_intact" && st !== "acquiring" && st !== "towed") b.endLull();
        }
        if (!b.e.alive) {
          if (this.bossDeadAt < 0) this.bossDeadAt = this.tick;
          for (const e of this.enemies) this.killEnemy(e, false);
          this.enemies = [];
          const secs = (this.tick - this.bossDeadAt) * DT;
          if ((this.hostile.active === 0 && secs > 1) || secs > 5) this.finish(true);
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- weapons
  private updateAutoLock(): void {
    const lp = this.lockedPart();
    if (this.lock && (!lp || !lp.part.active)) this.lock = null;
    if (this.opts.autoLock && this.boss?.jointExposed && this.lock?.partId !== "tail_joint") {
      this.lock = { enemyId: this.boss.e.id, partId: "tail_joint" };
    }
  }

  private muzzleWorld(m: Mount): Vec {
    const l = this.assembly.muzzleLocal(m.module);
    return { x: this.motion.pos.x + l.x, y: this.motion.pos.y + l.y };
  }

  // Aim toward the locked part only inside the weapon's firing arc; else forward.
  aimAngle(m: Mount): { angle: number; tracking: boolean } {
    const forward = -90;
    const lp = this.lockedPart();
    if (!lp || !lp.part.selectable) return { angle: forward, tracking: false };
    const from = this.muzzleWorld(m);
    const to = partWorldPos(lp.part, lp.enemy.pos);
    const a = Math.atan2(to.y - from.y, to.x - from.x) / DEG;
    const half = m.module.weapon.firing_arc_deg / 2;
    return Math.abs(a - forward) <= half ? { angle: a, tracking: true } : { angle: forward, tracking: false };
  }

  private fire(m: Mount): void {
    const w = m.module.weapon;
    const from = this.muzzleWorld(m);
    const { angle } = this.aimAngle(m);
    this.events.push({ type: "muzzle", pos: from, family: w.family });
    const sp = w.special_params;
    if (w.attack_model === "pulse_beam") {
      const laser = this.buffs.has("PU02") ? 1.15 : 1; // PU02 laser core: +15% damage and range
      const range = (sp.range ?? 600) * laser;
      const to = { x: from.x + Math.cos(angle * DEG) * range, y: from.y + Math.sin(angle * DEG) * range };
      const hit = this.firstEnemyHit(from, to, 0);
      const end = hit ? { x: from.x + (to.x - from.x) * hit.t, y: from.y + (to.y - from.y) * hit.t } : to;
      if (hit) this.damagePart(hit.enemy, hit.part, w.damage * laser, end);
      this.beams.push({ from, to: end, ttl: sp.pulse_duration ?? 0.08 });
    } else if (w.attack_model === "curved_plasma") {
      const side = m.shotIndex % 2 ? 1 : -1;
      const a = (angle + (sp.curve_deg ?? 25) * side) * DEG;
      const speed = sp.speed ?? 500;
      const b = this.friendly.spawn("plasma", from.x, from.y, Math.cos(a) * speed, Math.sin(a) * speed, 7, w.damage, 3);
      if (b) {
        b.blast = sp.blast_radius ?? 45;
        b.turnRate = 150;
        const target = this.plasmaTarget(from);
        if (target) this.plasmaTargets.set(b.id, target);
      }
    } else {
      const speed = sp.speed ?? 800;
      for (let k = 0; k < w.projectiles_per_trigger; k++) {
        this.friendly.spawn("kinetic", from.x, from.y, Math.cos(angle * DEG) * speed, Math.sin(angle * DEG) * speed, 3, w.damage, 2);
      }
      // PU01 triple shot: 2 side shots at ±12°, 40% damage. Side shots are plain
      // projectiles, so they can never spawn further side shots.
      if (w.family === "kinetic" && this.buffs.has("PU01")) {
        for (const side of [-12, 12]) {
          const a = (angle + side) * DEG;
          this.friendly.spawn("kinetic", from.x, from.y, Math.cos(a) * speed, Math.sin(a) * speed, 3, w.damage * 0.4, 2);
        }
      }
    }
  }

  // Stolen tail: curved plasma that seeks enemy joints (catalog stolen_behavior).
  private plasmaTarget(from: Vec): Lock | null {
    const lp = this.lockedPart();
    if (lp && lp.part.selectable) return { enemyId: lp.enemy.id, partId: lp.part.id };
    let best: Lock | null = null;
    let bestScore = Infinity;
    for (const e of this.allEnemies()) for (const p of e.parts) {
      if (!p.active || !p.selectable) continue;
      const score = dist(from, partWorldPos(p, e.pos)) - (p.kind === "joint" ? 400 : 0);
      if (score < bestScore) { bestScore = score; best = { enemyId: e.id, partId: p.id }; }
    }
    return best;
  }

  private steerPlasma(): void {
    for (const b of this.friendly.items) {
      if (!b.alive || b.model !== "plasma" || b.age > 1.2) continue;
      const tgt = this.plasmaTargets.get(b.id);
      const enemy = tgt && this.enemyById(tgt.enemyId);
      const part = enemy?.parts.find((p) => p.id === tgt!.partId);
      if (!enemy || !enemy.alive || !part?.active) continue;
      const to = partWorldPos(part, enemy.pos);
      const cur = Math.atan2(b.vy, b.vx);
      let want = Math.atan2(to.y - b.y, to.x - b.x) - cur;
      want = Math.atan2(Math.sin(want), Math.cos(want));
      const turn = clamp(want, -b.turnRate * DEG * DT, b.turnRate * DEG * DT);
      const speed = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(cur + turn) * speed;
      b.vy = Math.sin(cur + turn) * speed;
    }
  }

  // ---------------------------------------------------------------- damage
  private firstEnemyHit(a: Vec, b: Vec, pad: number): { enemy: Enemy; part: Part; t: number } | null {
    let best: { enemy: Enemy; part: Part; t: number } | null = null;
    for (const e of this.allEnemies()) {
      if (!e.alive) continue;
      const h = firstPartHit(e.parts, e.pos, a, b, pad);
      if (h && (!best || h.t < best.t)) best = { enemy: e, part: h.part, t: h.t };
    }
    return best;
  }

  private resolveFriendly(): void {
    for (const b of this.friendly.items) {
      if (!b.alive) continue;
      const hit = this.firstEnemyHit({ x: b.px, y: b.py }, { x: b.x, y: b.y }, b.r);
      if (!hit) continue;
      const at = { x: b.px + (b.x - b.px) * hit.t, y: b.py + (b.y - b.py) * hit.t };
      this.damagePart(hit.enemy, hit.part, b.dmg, at);
      if (b.blast > 0) this.blast(at, b.blast, b.dmg, hit.enemy.id);
      this.plasmaTargets.delete(b.id);
      this.friendly.kill(b);
    }
  }

  // One hit per entity per blast; the nearest part of each other entity in range.
  private blast(at: Vec, r: number, dmg: number, directId: string): void {
    this.blasts.push({ pos: at, r, ttl: 0.3 });
    this.events.push({ type: "blast", pos: at, value: r });
    for (const e of this.allEnemies()) {
      if (e.id === directId || !e.alive) continue;
      let best: Part | null = null;
      let bestD = Infinity;
      for (const p of e.parts) {
        if (!p.active) continue;
        const d = dist(partWorldPos(p, e.pos), at);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best && bestD <= r + 30) this.damagePart(e, best, dmg, at);
    }
  }

  damagePart(e: Enemy, part: Part, dmg: number, at: Vec): void {
    part.flash = 0.08;
    const core = coreOf(e);
    const armorMul = 100 / (100 + clamp(e.armor, 0, 200));
    switch (part.kind) {
      case "armor":
        if (part.invulnerable) { this.events.push({ type: "deflect", pos: at }); return; }
        part.hp -= dmg;
        if (part.hp <= 0) { part.active = false; this.events.push({ type: "joint_break", pos: at, tag: part.id }); }
        break;
      case "joint":
        part.hp -= dmg * WEAK_POINT_BONUS;
        if (part.hp <= 0 && part.active) {
          part.active = false;
          part.selectable = false;
          this.events.push({ type: "joint_break", pos: at, tag: part.id });
          if (e.role === "shield") {
            const shield = e.parts.find((p) => p.id === "shield");
            if (shield) shield.active = false;
            if (this.hitstopCd <= 0) { this.hitstop = HITSTOP_ELITE_TICKS; this.hitstopCd = HITSTOP_COOLDOWN; }
          }
        }
        break;
      case "module":
        part.integrity -= dmg;
        core.hp -= dmg * CORE_SPILL_MAX * armorMul;
        if (e.role === "boss" && !this.boss!.signatureRemoved) {
          this.hint(part.integrity / part.integrityMax < 0.35 ? "hint.tail_critical" : "hint.tail_damaged");
        }
        break;
      case "core":
        core.hp -= dmg * armorMul;
        break;
    }
    this.events.push({ type: "hit", pos: at, tag: part.kind });
  }

  private killEnemy(e: Enemy, credit = true): void {
    if (!e.alive) return;
    e.alive = false;
    this.events.push({ type: "kill", pos: { ...e.pos }, tag: e.role });
    if (!credit) return;
    this.kills++;
    this.score += e.score;
    this.combatCredits += e.credits;
    this.overdriveCharge = Math.min(100, this.overdriveCharge + e.charge);
    // Scrap drops as collectible motes (unbanked until settlement).
    for (let i = 0; i < e.scrap; i++) {
      const a = this.rng.next() * Math.PI * 2;
      this.motes.push({ id: this.moteSeq++, pos: { ...e.pos }, prev: { ...e.pos }, vel: { x: Math.cos(a) * 90, y: Math.sin(a) * 90 + 40 }, value: 1, life: MOTE_LIFE });
    }
    this.authoredDrops(e);
    if (this.drops.onKill(e.id, e.role === "shield")) {
      const id = choosePickup(this.rng, (pid) => this.pickupCompatible(pid), this.hp / this.hpMax <= LOW_HP_AID_FRAC);
      if (id) this.spawnPickup(id, e.pos);
    }
  }

  // Mission-authored guarantees: an offensive pickup early in wave 1 and a
  // defensive one from the first elite; independent of the drop accumulator.
  private authoredDrops(e: Enemy): void {
    if (e.tag === "wave1" && ++this.wave1Kills === 3 && !this.authored.offense) {
      this.authored.offense = true;
      this.spawnPickup(this.pickupCompatible("PU01") ? "PU01" : "PU09", e.pos);
    }
    if (e.role === "shield" && !this.authored.defense) {
      this.authored.defense = true;
      this.spawnPickup("PU05", e.pos);
    }
  }

  // ---------------------------------------------------------------- pickups
  pickupCompatible(id: string): boolean {
    const families = this.assembly.modules.filter((m) => !m.disabled).map((m) => m.weapon.family);
    if (id === "PU01") return families.includes("kinetic");
    if (id === "PU02") return families.includes("beam");
    return true;
  }

  spawnPickup(id: string, at: Vec): void {
    if (this.pickups.length >= DROP_RULES.live_pickup_cap) { this.pickupQueue.push(id); return; } // never erase a live pickup
    const pos = { x: clamp(at.x, 40, 680), y: clamp(at.y, 160, 900) };
    this.pickups.push({ instanceId: `${this.runId}:pu${this.pickupSeq++}`, defId: id, pos, prev: { ...pos }, life: DROP_RULES.ordinary_lifetime_sec, lifeMax: DROP_RULES.ordinary_lifetime_sec });
  }

  private updatePickups(): void {
    const me = this.motion.pos;
    const magnet = this.buffs.has("PU07");
    for (const p of this.pickups) {
      p.prev = { ...p.pos };
      p.pos.y = Math.min(1020, p.pos.y + 55 * DT);
      p.life -= DT;
      if (dist(p.pos, me) <= PICKUP_RADIUS) { this.collectPickup(p); p.life = -1; }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);
    while (this.pickupQueue.length && this.pickups.length < DROP_RULES.live_pickup_cap) this.spawnPickup(this.pickupQueue.shift()!, { x: 360, y: 200 });
    // Magnet pulls ordinary scrap only — never salvage, pickups or mines.
    for (const m of this.motes) {
      m.prev = { ...m.pos };
      const d = dist(m.pos, me);
      if (magnet && d <= MAGNET_RADIUS && d > 1) {
        m.vel = { x: ((me.x - m.pos.x) / d) * MAGNET_SPEED, y: ((me.y - m.pos.y) / d) * MAGNET_SPEED };
      } else m.vel = { x: m.vel.x * 0.94, y: m.vel.y * 0.94 + 4 };
      m.pos = { x: m.pos.x + m.vel.x * DT, y: m.pos.y + m.vel.y * DT };
      m.life -= DT;
      if (dist(m.pos, me) <= MOTE_PICK_RADIUS) {
        this.combatScrap += m.value;
        this.events.push({ type: "scrap_pick", pos: { ...m.pos }, value: m.value });
        m.life = -1;
      }
    }
    this.motes = this.motes.filter((m) => m.life > 0 && m.pos.y < 1300);
    // Guarantees hold even if the player lets enemies escape: offensive pickup by
    // 20 s of mission time, defensive one once wave 2 is over.
    if (!this.authored.offense && this.tick * DT >= 20) {
      this.authored.offense = true;
      this.spawnPickup(this.pickupCompatible("PU01") ? "PU01" : "PU09", { x: clamp(me.x, 120, 600), y: 260 });
    }
    if (!this.authored.defense && (this.phase === "boss_entry" || this.phase === "boss")) {
      this.authored.defense = true;
      this.spawnPickup("PU05", { x: clamp(me.x, 120, 600), y: 300 });
    }
    // Boss arena rescue: one visible repair drop after the first completed tail sweep.
    const act = this.boss?.action?.name ?? null;
    if (this.lastBossAction === "tail_sweep" && act !== "tail_sweep" && !this.authored.rescue) {
      this.authored.rescue = true;
      this.spawnPickup(this.hp < this.hpMax ? "PU06" : "PU05", { x: clamp(me.x, 120, 600), y: 560 });
    }
    this.lastBossAction = act;
    // Low-HP aid at most once per 60 s, presented as an ordinary drop.
    const secs = this.tick * DT;
    if (this.hp / this.hpMax <= LOW_HP_AID_FRAC && secs - this.lastAidAt >= LOW_HP_AID_COOLDOWN && this.phase !== "intro") {
      this.lastAidAt = secs;
      this.spawnPickup(this.hp < this.hpMax * 0.2 ? "PU06" : "PU05", { x: clamp(me.x + (this.rng.next() - 0.5) * 200, 80, 640), y: Math.max(200, me.y - 300) });
    }
  }

  private collectPickup(p: Pickup): void {
    const def = pickupDef(p.defId);
    const at = { ...p.pos };
    if (!this.pickupCompatible(def.id)) {
      // Loadout changed after spawn: convert once, never silently discard.
      this.overdriveCharge = Math.min(100, this.overdriveCharge + CONVERT_CHARGE);
      this.events.push({ type: "converted", pos: at, tag: def.id, value: CONVERT_CHARGE });
      return;
    }
    const params = def.params as Record<string, number>;
    switch (def.id) {
      case "PU05": {
        const restore = params.restore ?? 25;
        const room = this.shieldMax - this.shield;
        this.shield = Math.min(this.shieldMax, this.shield + restore);
        const excess = Math.max(0, restore - room);
        if (excess > 0) { this.overshield = Math.min(params.overshield_cap ?? 25, this.overshield + excess); this.overshieldLeft = params.overshield_sec ?? 10; }
        break;
      }
      case "PU06": {
        this.hp = Math.min(this.hpMax, this.hp + (params.core_hp ?? 20)); // recorded core damage is not rolled back
        const worst = [...this.assembly.modules].filter((m) => !m.disabled).sort((a, b) => a.integrity / a.integrityMax - b.integrity / b.integrityMax)[0];
        if (worst) worst.integrity = Math.min(worst.integrityMax, worst.integrity + (params.module_integrity ?? 10));
        break;
      }
      case "PU08":
        for (const m of this.weapons.mounts) m.heat = Math.max(0, m.heat - (params.instant_heat_reduction ?? 35)); // min lock time still applies
        break;
      case "PU09":
        this.overdriveCharge = Math.min(params.max ?? 100, this.overdriveCharge + (params.charge ?? 25));
        break;
      case "PU12":
        this.combatScrap += params.scrap ?? 15; // unbanked: only paid out through settlement
        break;
    }
    this.buffs.apply(def);
    this.events.push({ type: "pickup", pos: at, tag: def.id });
  }

  private resolveDeaths(): void {
    for (const e of this.enemies) if (e.alive && coreOf(e).hp <= 0) this.killEnemy(e);
    this.enemies = this.enemies.filter((e) => e.alive);
    const b = this.boss;
    if (!b || !b.e.alive) return;
    for (const ev of b.afterDamage()) {
      const at = { x: b.e.pos.x + 88, y: b.e.pos.y - 40 };
      if (ev === "sever_intact" || ev === "sever_scrap" || ev === "tail_destroyed") {
        this.severed.push(b.row.id);
        if (this.hitstopCd <= 0) { this.hitstop = HITSTOP_SEVER_TICKS; this.hitstopCd = HITSTOP_COOLDOWN; }
        this.onSignatureRemoved(ev, at);
      } else if (ev === "phase2" || ev === "phase3") {
        this.events.push({ type: "phase", pos: { ...b.e.pos }, value: ev === "phase2" ? 2 : 3 });
      } else if (ev === "dead") {
        this.score += b.e.score;
        this.combatCredits += b.e.credits;
        this.combatScrap += b.e.scrap;
        this.kills++;
        // Core death auto-scraps a still-attached signature part: no loot for blasting the core.
        if (b.item.state === "attached" || b.item.state === "exposed") transition(b.item, "destroyed_scrap", `coredeath:${b.item.instanceId}`, this.tick);
        this.events.push({ type: "boss_dead", pos: { ...b.e.pos } });
      }
    }
  }

  private onSignatureRemoved(ev: "sever_intact" | "sever_scrap" | "tail_destroyed", at: Vec): void {
    const b = this.boss!;
    const item = b.item;
    if (ev === "sever_intact") {
      transition(item, "detached_intact", `sever:${item.instanceId}`, this.tick);
      item.integrity = b.tail.integrity;
      item.pos = { ...b.stingerWorld() };
      item.prev = { ...item.pos };
      item.vel = { x: -30, y: 70 };
      item.invuln = PICKUP_INVULN_SEC;
      this.overdriveCharge = Math.min(100, this.overdriveCharge + SEVER_CHARGE);
      this.score += 1000;
      this.events.push({ type: "sever", pos: at, tag: "intact" });
      this.hint("hint.tractor");
    } else {
      transition(item, ev === "tail_destroyed" ? "destroyed_scrap" : "damaged_scrap", `sever:${item.instanceId}`, this.tick);
      this.combatScrap += 10;
      this.events.push({ type: "scrap", pos: at });
      this.hint("hint.scrap");
    }
    // Boss calls a small escort wave; a calmer pattern runs until it is resolved.
    if (!this.reinforcementsSpawned) {
      this.reinforcementsSpawned = true;
      for (let i = 0; i < 3; i++) {
        const s = makeScout(this.spawnId("r"), this.catalog.enemy("E01"), i, i % 2 === 0, "reinforcement");
        s.baseY = 120 + i * 30;
        this.enemies.push(s);
      }
      b.startLull();
    }
  }

  // ---------------------------------------------------------------- player damage
  private moduleCells(): { module: FittedModule; c: Vec }[] {
    const out: { module: FittedModule; c: Vec }[] = [];
    for (const m of this.assembly.modules) {
      if (m.disabled) continue;
      for (const cell of m.cells) {
        const l = cellToLocal(cell);
        out.push({ module: m, c: { x: this.motion.pos.x + l.x, y: this.motion.pos.y + l.y } });
      }
    }
    return out;
  }

  private resolveHostile(): void {
    const core = this.motion.pos;
    const cells = this.moduleCells();
    const cargo = this.towedItem;
    const invuln = this.playerInvulnerable;
    for (const b of this.hostile.items) {
      if (!b.alive) continue;
      const a = { x: b.px, y: b.py }, z = { x: b.x, y: b.y };
      // cargo absorbs half and the shot continues with the rest
      if (cargo && !b.hitCargo && cargo.invuln <= 0 && pointSegmentDistance(cargo.pos, a, z) <= CARGO_RADIUS + b.r) {
        b.hitCargo = true;
        cargo.integrity -= b.dmg * 0.5;
        b.dmg *= 0.5;
        this.events.push({ type: "hit", pos: { ...cargo.pos }, tag: "cargo" });
        if (cargo.integrity <= 0) this.loseCargo(cargo, "damaged_scrap");
      }
      const dCore = pointSegmentDistance(core, a, z);
      let target: "core" | FittedModule | null = dCore <= CORE_RADIUS + b.r ? "core" : null;
      if (!target) {
        for (const cell of cells) {
          if (Math.abs(cell.c.x - b.x) <= TILE / 2 - 2 + b.r && Math.abs(cell.c.y - b.y) <= TILE / 2 - 2 + b.r) { target = cell.module; break; }
        }
      }
      if (target) {
        if (!invuln) { this.applyPlayerHit(b.dmg, target, z); this.hostile.kill(b); }
        continue;
      }
      if (!b.grazed && !invuln && dCore <= CORE_RADIUS + GRAZE_PAD + b.r) {
        b.grazed = true;
        if (this.grazeThisSec < GRAZE_CAP_PER_SEC) {
          const g = Math.min(GRAZE_PER_BULLET, GRAZE_CAP_PER_SEC - this.grazeThisSec);
          this.grazeThisSec += g;
          this.overdriveCharge = Math.min(100, this.overdriveCharge + g);
          this.events.push({ type: "graze", pos: z });
        }
      }
    }
  }

  // Shield first; module hits transmit 25% to the core; one event per projectile.
  applyPlayerHit(dmg: number, target: "core" | FittedModule, at: Vec): void {
    if (this.playerInvulnerable) return;
    this.shieldDelay = SHIELD_DELAY_SEC;
    this.hitInvuln = HIT_INVULN_SEC;
    if (this.overshield > 0) {
      const absorbed = Math.min(this.overshield, dmg);
      this.overshield -= absorbed;
      dmg -= absorbed;
      this.events.push({ type: "shield_hit", pos: at });
      if (dmg <= 0) return;
    }
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      this.events.push({ type: "shield_hit", pos: at });
      if (dmg <= 0) return;
    }
    if (target === "core") {
      this.hp -= dmg;
      this.coreDamageTaken += dmg;
    } else {
      target.integrity -= dmg;
      this.hp -= dmg * MODULE_TO_CORE;
      this.coreDamageTaken += dmg * MODULE_TO_CORE;
      if (target.integrity <= 0) this.loseModule(target);
    }
    this.events.push({ type: "player_hit", pos: at, value: dmg });
  }

  // A broken module detaches once as a recoverable owner-tagged pickup; a module
  // that was already reclaimed and repaired becomes scrap (no infinite shields).
  private loseModule(m: FittedModule): void {
    m.disabled = true;
    const l = this.assembly.muzzleLocal(m);
    this.assembly.remove(m.instanceId);
    this.refreshAssembly();
    const id = m.salvageId ?? `${this.runId}:player:${m.instanceId}`;
    let item = this.items.find((i) => i.instanceId === id);
    if (!item) {
      item = makeItem(id, m.weapon.id, "player", "module", m.integrityMax, m.weapon.mass);
      item.state = "fitted_run";
      this.items.push(item);
    }
    const pos = { x: this.motion.pos.x + l.x, y: this.motion.pos.y + l.y };
    this.events.push({ type: "module_lost", pos });
    if (item.repairedOnce) {
      transition(item, "damaged_scrap", `lost:${id}:${this.tick}`, this.tick); // permanent blueprints untouched
      return;
    }
    transition(item, "owner_drop", `drop:${id}:${this.tick}`, this.tick);
    item.integrity = 0;
    item.pos = pos;
    item.prev = { ...pos };
    item.vel = { x: 0, y: 40 };
    item.invuln = PICKUP_INVULN_SEC;
    item.lifetime = 40;
    this.hint("hint.module_lost");
  }

  private resolveBossBeamAndContact(): void {
    const b = this.boss;
    if (!b || !b.e.alive) return;
    this.contactCd = Math.max(0, this.contactCd - DT);
    if (b.beamAngle !== null) {
      b.beamTick -= DT;
      if (b.beamTick <= 0) {
        b.beamTick = 0.1;
        const from = b.stingerWorld();
        const to = { x: from.x + Math.cos(b.beamAngle * DEG) * SWEEP_RANGE, y: from.y + Math.sin(b.beamAngle * DEG) * SWEEP_RANGE };
        const hw = SWEEP_WIDTH / 2;
        if (pointSegmentDistance(this.motion.pos, from, to) <= hw + CORE_RADIUS) this.applyPlayerHit(SWEEP_TICK_DMG, "core", { ...this.motion.pos });
        else {
          const cell = this.moduleCells().find((c) => pointSegmentDistance(c.c, from, to) <= hw + TILE / 2 - 2);
          if (cell) this.applyPlayerHit(SWEEP_TICK_DMG, cell.module, cell.c);
        }
      }
    } else b.beamTick = 0;
    if (this.contactCd <= 0 && dist(b.e.pos, this.motion.pos) <= 62 + CORE_RADIUS + 10) {
      this.contactCd = 0.6;
      this.applyPlayerHit(CONTACT_DAMAGE, "core", { ...this.motion.pos });
    }
  }

  private updatePlayerTimers(): void {
    this.buffs.tick(DT);
    this.weapons.coolingMul = this.buffs.has("PU08") ? 1.2 : 1;
    this.overshieldLeft = Math.max(0, this.overshieldLeft - DT);
    if (this.overshieldLeft <= 0) this.overshield = 0;
    this.hitInvuln = Math.max(0, this.hitInvuln - DT);
    this.grace = Math.max(0, this.grace - DT);
    this.shieldDelay = Math.max(0, this.shieldDelay - DT);
    if (this.shieldDelay <= 0) this.shield = Math.min(this.shieldMax, this.shield + SHIELD_REGEN * DT);
    this.grazeWindow += DT;
    if (this.grazeWindow >= 1) { this.grazeWindow = 0; this.grazeThisSec = 0; }
  }

  // ---------------------------------------------------------------- salvage
  private updateSalvage(input: TickInput): void {
    const paused = !!this.boss?.inTransition;
    for (const it of this.items) {
      it.prev = { ...it.pos };
      if (it.state === "detached_intact" || it.state === "owner_drop" || it.state === "acquiring") {
        it.pos = { x: clamp(it.pos.x + it.vel.x * DT, 30, 690), y: clamp(it.pos.y + it.vel.y * DT, 120, 1000) };
        it.vel = { x: it.vel.x * 0.985, y: it.vel.y * 0.985 };
        if (ageLoose(it, DT, paused, this.tick)) {
          if (this.tow?.itemId === it.instanceId) this.tow = null;
          this.events.push({ type: "scrap", pos: { ...it.pos }, tag: "expired" });
        }
      } else it.invuln = Math.max(0, it.invuln - DT);
    }
    // tractor acquisition (hold), or auto-tractor using the same eligibility checks
    const cand = this.tractorCandidate();
    if (cand) this.hint("hint.tractor_hold");
    const wantTractor = !!input.tractorHeld || (!!this.opts.autoTractor && !!cand);
    if (this.tow && !this.tow.towing) {
      const it = this.towedItem;
      if (!it || !cand || cand.instanceId !== it.instanceId || !wantTractor) {
        if (it?.state === "acquiring") transition(it, "detached_intact", `cancel:${it.instanceId}:${this.tick}`, this.tick);
        this.tow = null;
      } else {
        this.tow.progress += DT;
        if (this.tow.progress >= TRACTOR_DWELL) {
          transition(it, "towed", `tow:${it.instanceId}:${this.tick}`, this.tick);
          this.tow.towing = true;
          this.events.push({ type: "tractor_lock", pos: { ...it.pos } });
          this.hint("hint.tow");
        }
      }
    } else if (!this.tow && cand && wantTractor) {
      if (transition(cand, "acquiring", `acq:${cand.instanceId}:${this.tick}`, this.tick)) {
        this.tow = { itemId: cand.instanceId, progress: 0, overLength: 0, towing: false, releaseArmed: 0 };
      }
    }
    // towing: kinematic follower on a spring cable behind the ship
    if (this.tow?.towing) {
      const it = this.towedItem!;
      const target = { x: this.motion.pos.x, y: this.motion.pos.y + CABLE_REST };
      it.vel = { x: it.vel.x * 0.86 + (target.x - it.pos.x) * 0.9, y: it.vel.y * 0.86 + (target.y - it.pos.y) * 0.9 };
      const sp = Math.hypot(it.vel.x, it.vel.y);
      if (sp > 700) it.vel = { x: (it.vel.x / sp) * 700, y: (it.vel.y / sp) * 700 };
      it.pos = { x: it.pos.x + it.vel.x * DT, y: it.pos.y + it.vel.y * DT };
      const len = dist(it.pos, this.motion.pos);
      this.tow.overLength = len > CABLE_MAX ? this.tow.overLength + DT : 0;
      if (this.tow.overLength >= CABLE_SNAP_SEC) {
        this.releaseTow("snap");
      } else if (input.tractorTap) {
        // Releasing a signature needs a confirming second tap.
        if (this.tow.releaseArmed > 0) this.releaseTow("release");
        else { this.tow.releaseArmed = RELEASE_CONFIRM_SEC; this.hint("hint.release_confirm"); }
      }
      if (this.tow) this.tow.releaseArmed = Math.max(0, this.tow.releaseArmed - DT);
    }
  }

  private releaseTow(kind: "snap" | "release"): void {
    const it = this.towedItem;
    if (it) {
      transition(it, "detached_intact", `${kind}:${it.instanceId}:${this.tick}`, this.tick);
      it.vel = { x: 0, y: 30 };
      this.events.push({ type: "snap", pos: { ...it.pos }, tag: kind });
    }
    this.tow = null;
  }

  private loseCargo(it: SalvageItem, to: "damaged_scrap"): void {
    transition(it, to, `cargo:${it.instanceId}:${this.tick}`, this.tick);
    this.combatScrap += 5;
    this.events.push({ type: "scrap", pos: { ...it.pos }, tag: "cargo" });
    if (this.tow?.itemId === it.instanceId) this.tow = null;
  }

  // ---------------------------------------------------------------- dock
  private startDock(it: SalvageItem): void {
    transition(it, "secured_run", `secure:${it.instanceId}`, this.tick);
    this.tow = null;
    this.dock = { itemId: it.instanceId };
    this.events.push({ type: "secured", pos: { ...it.pos } });
    this.hint("hint.dock");
  }

  dockItem(): SalvageItem | null {
    return this.dock ? this.items.find((i) => i.instanceId === this.dock!.itemId) ?? null : null;
  }

  dockWeapon(): WeaponRow | null {
    const it = this.dockItem();
    return it ? this.catalog.weapon(it.templateId) : null;
  }

  // Fit the docked part at `origin`; optionally first move an installed module to the hold.
  dockFit(origin: [number, number], swapOutId?: string): string | null {
    const it = this.dockItem();
    const w = this.dockWeapon();
    if (!it || !w) return "fit.error.no_item";
    let removed: FittedModule | null = null;
    if (swapOutId) {
      if (this.hold.length >= this.holdCapacity) return "fit.error.hold_full";
      removed = this.assembly.remove(swapOutId);
    }
    const err = this.assembly.place(w, origin, it.instanceId);
    if (err) {
      if (removed) this.assembly.modules.push(removed); // revert: nothing is lost
      return err;
    }
    if (removed) this.hold.push({ item: makeItem(`${this.runId}:player:${removed.instanceId}`, removed.weapon.id, "player", "module", removed.integrityMax, removed.weapon.mass), module: removed });
    const fitted = this.assembly.modules[this.assembly.modules.length - 1];
    // Reclaimed owner drops are repaired to 30% once per part instance per mission.
    if (it.history.some((h) => h.to === "owner_drop")) {
      fitted.integrity = Math.max(1, fitted.integrityMax * OWNER_DROP_REPAIR);
      it.repairedOnce = true;
    }
    transition(it, "fitted_run", `fit:${it.instanceId}:${this.tick}`, this.tick);
    this.refreshAssembly();
    if (it.sourceEncounter !== "player" && it.templateId === this.boss?.row.signature_weapon_id) {
      this.stolen.push(it.sourceEncounter);
      this.score += 3000;
      this.hint("hint.stolen");
    }
    return null;
  }

  dockStow(): string | null {
    const it = this.dockItem();
    if (!it) return "fit.error.no_item";
    if (this.hold.length >= this.holdCapacity) return "fit.error.hold_full";
    transition(it, "stowed_run", `stow:${it.instanceId}:${this.tick}`, this.tick);
    this.hold.push({ item: it, module: null });
    if (it.sourceEncounter === this.boss?.row.id) this.stolen.push(it.sourceEncounter);
    return null;
  }

  dockScrap(): void {
    const it = this.dockItem();
    if (!it) return;
    transition(it, "damaged_scrap", `scrapdock:${it.instanceId}:${this.tick}`, this.tick);
    this.combatScrap += Math.floor(this.catalog.weapon(it.templateId).mass * 2);
  }

  // Leave the dock once the part is fitted, stowed or scrapped: 1 s danger-free grace.
  endDock(): boolean {
    const it = this.dockItem();
    if (it && it.state === "secured_run") return false;
    this.dock = null;
    this.grace = DOCK_GRACE_SEC;
    this.boss?.endLull();
    return true;
  }

  refreshAssembly(): void {
    this.weapons.sync(this.assembly.modules);
    this.motion.fittedMass = this.assembly.fittedMass();
    this.motion.halfWidth = this.assembly.halfWidth();
    const occupied = this.assembly.occupied();
    // Muzzle clearance: a module directly in front of a fixed gun blocks it.
    for (const m of this.weapons.mounts) {
      const front = m.module.cells.reduce((b, c) => (c[1] > b[1] ? c : b), m.module.cells[0]);
      let blocked = false;
      for (let y = front[1] + 1; y < 7; y++) {
        const owner = occupied.get(`${front[0]},${y}`);
        if (owner && owner !== m.module.instanceId) blocked = true;
      }
      m.blocked = blocked;
    }
  }

  // ---------------------------------------------------------------- hints / finish
  hint(key: string): void {
    if (this.shownHints.has(key)) return;
    this.shownHints.add(key);
    this.hints.push(key);
  }

  private finish(victory: boolean): void {
    if (this.status !== "running") return;
    this.status = victory ? "victory" : "defeat";
    const secured: SecuredItem[] = [];
    const unbanked: SecuredItem[] = [];
    for (const it of this.items) {
      if (it.sourceEncounter === "player") continue;
      const entry: SecuredItem = { instanceId: it.instanceId, templateId: it.templateId, source: it.sourceEncounter,
        intact: isIntact(it) || it.state === "fitted_run" || it.state === "stowed_run",
        scrapValue: this.catalog.weapon(it.templateId).fabrication_scrap };
      const eligible = it.state === "fitted_run" || it.state === "stowed_run" || it.state === "towed" || it.state === "secured_run";
      if (!eligible) continue;
      if (victory) {
        transition(it, "banked", `bank:${it.instanceId}`, this.tick);
        secured.push(entry);
      } else unbanked.push(entry);
    }
    this.result = {
      runId: this.runId, missionId: "SLICE-01", sector: 1, missionIndex: 6, victory, score: this.score,
      combatCredits: this.combatCredits, combatScrap: this.combatScrap, secured, unbanked,
      severed: [...new Set(this.severed)], stolen: [...new Set(this.stolen)],
      encounterIds: victory && this.boss ? [this.boss.row.id] : [],
    };
  }

  // Stable digest of gameplay state for determinism checks.
  stateHash(): string {
    const parts: (number | string)[] = [this.tick, this.phase, this.status, this.kills, this.score,
      +this.motion.pos.x.toFixed(3), +this.motion.pos.y.toFixed(3), +this.hp.toFixed(3), +this.shield.toFixed(3),
      +this.weapons.energy.toFixed(3), this.friendly.active, this.hostile.active, +this.overdriveCharge.toFixed(3), this.rng.state,
      this.pickups.map((p) => p.defId).join(","), this.motes.length, this.combatScrap, +this.drops.value.toFixed(3), [...this.buffs.remaining.keys()].join(",")];
    for (const e of this.allEnemies()) parts.push(e.id, +e.pos.x.toFixed(2), +e.pos.y.toFixed(2), ...e.parts.map((p) => +p.hp.toFixed(2)));
    for (const it of this.items) parts.push(it.instanceId, it.state, +it.integrity.toFixed(2));
    return parts.join("|");
  }
}

export type { Bullet };
