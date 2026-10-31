// Player weapon attack models beyond the starter guns (catalog W002–W020, ATTACK_LIBRARY).
// Each model reads its catalog special_params. Effects that last (sweep beam, flame cone,
// gravity field, drones, statuses) are advanced once per tick by updateArsenal().
import { DEG, clamp, dist, type Vec } from "../core/geometry";
import { DT } from "../core/frameDriver";
import type { WeaponRow } from "../core/types";
import type { Bullet } from "./bullets";
import type { Enemy } from "./enemies";
import { coreOf } from "./enemies";
import { partWorldPos, type Part } from "./parts";
import type { Mount } from "./weapons";
import type { CombatWorld } from "./world";

export interface Channel { mountId: string; weapon: WeaponRow; kind: "sweep" | "flame" | "rail"; t: number; dur: number; angle: number; from: Vec }
export interface GravityField { pos: Vec; t: number; dur: number; r: number; dps: number; force: number }
export interface Arc { pts: Vec[]; ttl: number; color: string }

export const BURN_DPS = 4;
export const STATUS_SEC = 2.5;

const IMPLEMENTED = new Set(["fan", "charge_rail", "ricochet", "spool_gatling", "straight_burst", "timed_flak", "split_beam",
  "sweep_beam", "bounded_homing", "cluster", "armor_piercer", "slow_orb", "chain_arc", "status_bolt", "flame_cone",
  "gravity_field", "orbit_drone"]);

export function arsenalHandles(w: WeaponRow): boolean {
  return IMPLEMENTED.has(w.attack_model) && !(w.attack_model === "straight_burst" && w.projectiles_per_trigger === 1);
}

// Nearest live enemy part ahead of `from` (joints preferred), within range.
export function nearestTarget(world: CombatWorld, from: Vec, range = 700, ahead = true): { enemy: Enemy; part: Part } | null {
  const lp = world.lockedPart();
  if (lp && lp.part.selectable && dist(partWorldPos(lp.part, lp.enemy.pos), from) <= range) return lp;
  let best: { enemy: Enemy; part: Part } | null = null;
  let bestScore = Infinity;
  for (const e of world.allEnemies()) {
    if (!e.alive) continue;
    for (const p of e.parts) {
      if (!p.active || !p.selectable) continue;
      if (p.kind === "module") continue; // never auto-target salvage (boss signature parts) — only a manual lock does
      const q = partWorldPos(p, e.pos);
      if (ahead && q.y > from.y + 40) continue;
      const d = dist(q, from);
      if (d > range) continue;
      const score = d - (p.kind === "joint" ? 120 : 0);
      if (score < bestScore) { bestScore = score; best = { enemy: e, part: p }; }
    }
  }
  return best;
}

function applyStatus(e: Enemy, status: string): void {
  if (!status) return;
  e.status ??= { chill: 0, ion: 0, burn: 0 };
  if (status === "chill") e.status.chill = STATUS_SEC;
  else if (status === "ion") e.status.ion = STATUS_SEC;
  else if (status === "burn") e.status.burn = STATUS_SEC;
}

// Hit callback used by the world's projectile resolution for arsenal bullets.
export function onArsenalHit(_world: CombatWorld, b: Bullet, enemy: Enemy): void {
  applyStatus(enemy, b.status);
}

function vel(angleDeg: number, speed: number): Vec { return { x: Math.cos(angleDeg * DEG) * speed, y: Math.sin(angleDeg * DEG) * speed }; }

// Fires one trigger of an arsenal weapon. Returns false if the model isn't handled here.
export function fireArsenal(world: CombatWorld, m: Mount, from: Vec, angle: number): boolean {
  const w = m.module.weapon;
  if (!arsenalHandles(w)) return false;
  const sp = w.special_params;
  const fp = world.friendly;
  switch (w.attack_model) {
    case "fan": { // W002 Scatter Fan
      const n = w.projectiles_per_trigger, spread = sp.spread_deg ?? 30;
      for (let k = 0; k < n; k++) {
        const v = vel(angle - spread / 2 + (spread * k) / Math.max(1, n - 1), sp.speed ?? 780);
        fp.spawn("kinetic", from.x, from.y, v.x, v.y, 3, w.damage, 1.2);
      }
      break;
    }
    case "straight_burst": { // W006 Burst Repeater: a tight 3-round string
      const speed = sp.speed ?? 850, gap = (sp.burst_interval ?? 0.07) * speed;
      for (let k = 0; k < w.projectiles_per_trigger; k++) {
        const v = vel(angle, speed);
        const back = { x: from.x - Math.cos(angle * DEG) * gap * k, y: from.y - Math.sin(angle * DEG) * gap * k };
        fp.spawn("kinetic", back.x, back.y, v.x, v.y, 3, w.damage, 2);
      }
      break;
    }
    case "spool_gatling": { // W005 Gatling Rotor: rate spools up in the scheduler; small spread
      const v = vel(angle + (world.rng.next() - 0.5) * (sp.spread_deg ?? 8), 900);
      fp.spawn("kinetic", from.x, from.y, v.x, v.y, 2.5, w.damage, 1.6);
      break;
    }
    case "ricochet": { // W004 Ricochet Disc: bounces off the side walls
      const v = vel(angle, sp.speed ?? 650);
      const b = fp.spawn("disc", from.x, from.y, v.x, v.y, 7, w.damage, 3);
      if (b) { b.bounces = sp.bounces ?? 2; b.pierce = 1; b.src = w.id; }
      break;
    }
    case "timed_flak": { // W007 Flak Bloom: bursts after its fuse (or on contact)
      const v = vel(angle, 620);
      const b = fp.spawn("flak", from.x, from.y, v.x, v.y, 5, w.damage, 2);
      if (b) { b.fuse = sp.fuse_sec ?? 0.5; b.blast = sp.blast_radius ?? 65; b.src = w.id; }
      break;
    }
    case "charge_rail": // W003 Rail Lance: charge line, then a piercing slug
      world.channels.push({ mountId: m.module.instanceId, weapon: w, kind: "rail", t: 0, dur: sp.charge_sec ?? 0.5, angle, from });
      break;
    case "split_beam": { // W009 Prism Splitter: three pulse beams
      const n = w.projectiles_per_trigger, spread = sp.spread_deg ?? 20;
      for (let k = 0; k < n; k++) world.beamShot(from, angle - spread / 2 + (spread * k) / Math.max(1, n - 1), sp.range ?? 550, w.damage, "#b9f6ff");
      break;
    }
    case "sweep_beam": // W010 Sweep Cutter: a beam that sweeps across 45°
      world.channels.push({ mountId: m.module.instanceId, weapon: w, kind: "sweep", t: 0, dur: sp.duration ?? 0.7, angle, from });
      break;
    case "flame_cone": // W017 Flame Ribbon: short cone that burns
      world.channels.push({ mountId: m.module.instanceId, weapon: w, kind: "flame", t: 0, dur: sp.duration ?? 0.8, angle, from });
      break;
    case "bounded_homing": { // W011 Seeker Pod
      const side = m.shotIndex % 2 ? 1 : -1;
      const v = vel(angle + 35 * side, sp.speed ?? 480);
      const b = fp.spawn("missile", from.x, from.y, v.x, v.y, 6, w.damage, 3.5);
      if (b) { b.blast = sp.blast_radius ?? 45; b.turnRate = sp.turn_deg_sec ?? 100; b.homing = 1; b.src = w.id; }
      break;
    }
    case "cluster": { // W012 Cluster Rack: one rocket splits into seekers
      const v = vel(angle, sp.speed ?? 450);
      const b = fp.spawn("missile", from.x, from.y, v.x, v.y, 7, w.damage, 3);
      if (b) { b.fuse = sp.split_after_sec ?? 0.5; b.split = w.projectiles_per_trigger; b.blast = sp.blast_radius ?? 32; b.src = w.id; }
      break;
    }
    case "armor_piercer": { // W013 Torpedo Drill: slow, pierces, ignores some armour
      const v = vel(angle, sp.speed ?? 500);
      const b = fp.spawn("missile", from.x, from.y, v.x, v.y, 8, w.damage, 3);
      if (b) { b.pierce = sp.pierce ?? 2; b.armorIgnore = sp.armor_ignore_fraction ?? 0.35; b.src = w.id; }
      break;
    }
    case "slow_orb": { // W014 Plasma Globe
      const v = vel(angle, sp.speed ?? 350);
      const b = fp.spawn("orb", from.x, from.y, v.x, v.y, 12, w.damage, 4);
      if (b) { b.blast = sp.blast_radius ?? 55; b.src = w.id; }
      break;
    }
    case "status_bolt": { // W016 Ion Needle / W018 Frost Shard
      const n = w.projectiles_per_trigger, spread = sp.spread_deg ?? 0;
      for (let k = 0; k < n; k++) {
        const v = vel(n > 1 ? angle - spread / 2 + (spread * k) / (n - 1) : angle, sp.speed ?? 750);
        const b = fp.spawn("bolt", from.x, from.y, v.x, v.y, 4, w.damage, 2);
        if (b) { b.status = String(w.special_params.status ?? (w.family === "cryo" ? "chill" : "ion")); b.src = w.id; }
      }
      break;
    }
    case "chain_arc": { // W015 Arc Fork: instant lightning that hops
      const first = nearestTarget(world, from, 420);
      const pts: Vec[] = [from];
      if (!first) { pts.push({ x: from.x + Math.cos(angle * DEG) * 260, y: from.y + Math.sin(angle * DEG) * 260 }); world.arcs.push({ pts, ttl: 0.12, color: "#9fd8ff" }); break; }
      let dmg = w.damage;
      const hit = new Set<string>();
      let cur: { enemy: Enemy; part: Part } | null = first;
      for (let hop = 0; cur && hop <= (sp.hops ?? 3); hop++) {
        const at = partWorldPos(cur.part, cur.enemy.pos);
        pts.push(at);
        world.damagePart(cur.enemy, cur.part, dmg, at);
        hit.add(cur.enemy.id);
        dmg *= sp.hop_multiplier ?? 0.75;
        let next: { enemy: Enemy; part: Part } | null = null;
        let bd = sp.hop_range ?? 100;
        for (const e of world.allEnemies()) {
          if (!e.alive || hit.has(e.id)) continue;
          const c = coreOf(e);
          const d = dist(partWorldPos(c, e.pos), at);
          if (d <= bd + 30) { bd = d; next = { enemy: e, part: c }; }
        }
        cur = next;
      }
      world.arcs.push({ pts, ttl: 0.16, color: "#9fd8ff" });
      break;
    }
    case "gravity_field": { // W019 Gravity Seed: becomes a pulling field
      const v = vel(angle, 420);
      const b = fp.spawn("seed", from.x, from.y, v.x, v.y, 7, 0, 2);
      if (b) { b.fuse = 0.6; b.src = w.id; }
      break;
    }
    case "orbit_drone": { // W020 Wasp Bay: drones fire at the nearest enemy
      const n = sp.drone_count ?? 2;
      for (let k = 0; k < n; k++) {
        const d = world.dronePos(k, n);
        const t = nearestTarget(world, d, 650, false);
        const to = t ? partWorldPos(t.part, t.enemy.pos) : { x: d.x, y: d.y - 400 };
        const a = Math.atan2(to.y - d.y, to.x - d.x) / DEG;
        const v = vel(a, 700);
        fp.spawn("kinetic", d.x, d.y, v.x, v.y, 3, w.damage, 1.5);
      }
      break;
    }
    default:
      return false;
  }
  return true;
}

// Per-tick effects: homing, fuses, wall bounces, channels, gravity fields, statuses.
export function updateArsenal(world: CombatWorld): void {
  // projectiles
  for (const b of world.friendly.items) {
    if (!b.alive) continue;
    if (b.model === "missile" && b.homing) {
      const t = nearestTarget(world, { x: b.x, y: b.y }, 900, false);
      if (t) {
        const to = partWorldPos(t.part, t.enemy.pos);
        const cur = Math.atan2(b.vy, b.vx);
        let want = Math.atan2(to.y - b.y, to.x - b.x) - cur;
        want = Math.atan2(Math.sin(want), Math.cos(want));
        const turn = clamp(want, -b.turnRate * DEG * DT, b.turnRate * DEG * DT);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(cur + turn) * sp; b.vy = Math.sin(cur + turn) * sp;
      }
    }
    if (b.model === "disc" && b.bounces > 0 && (b.x < 12 || b.x > 708)) {
      b.vx = -b.vx; b.x = clamp(b.x, 12, 708); b.bounces--; b.lastHit = "";
    }
    if (b.fuse > 0) {
      b.fuse -= DT;
      if (b.fuse <= 0) fuseOut(world, b);
    }
  }
  // channels
  for (const c of world.channels) {
    c.t += DT;
    const mount = world.weapons.mounts.find((m) => m.module.instanceId === c.mountId);
    if (!mount) { c.t = c.dur; continue; }
    const from = world.muzzleWorld(mount);
    c.from = from;
    const sp = c.weapon.special_params;
    if (c.kind === "sweep") {
      const half = (sp.sweep_deg ?? 45) / 2;
      const a = c.angle - half + (2 * half * Math.min(1, c.t / c.dur));
      world.beamShot(from, a, 620, c.weapon.damage * DT, "#ff9ff0", true);
    } else if (c.kind === "flame") {
      const range = sp.range ?? 220;
      const tickDmg = c.weapon.damage * DT;
      for (const e of world.allEnemies()) {
        if (!e.alive) continue;
        for (const p of e.parts) {
          if (!p.active || p.invulnerable || p.kind === "module") continue; // flame spares salvage parts
          const q = partWorldPos(p, e.pos);
          const d = dist(q, from);
          const ang = Math.abs(Math.atan2(q.y - from.y, q.x - from.x) / DEG - c.angle);
          if (d <= range && (ang <= 22 || d < 40)) { world.damagePart(e, p, tickDmg, q); applyStatus(e, "burn"); break; }
        }
      }
    } else if (c.kind === "rail" && c.t >= c.dur) {
      world.railShot(from, c.angle, c.weapon.damage, (sp.pierce ?? 3) + 1);
    }
  }
  world.channels = world.channels.filter((c) => c.t < c.dur);
  // gravity fields
  for (const f of world.fields) {
    f.t += DT;
    for (const e of world.allEnemies()) {
      if (!e.alive) continue;
      const core = coreOf(e);
      const q = partWorldPos(core, e.pos);
      const d = dist(q, f.pos);
      if (d > f.r) continue;
      world.damagePart(e, core, f.dps * DT, q);
      if (e.role === "boss" || d < 4) continue;
      const k = (f.force * DT) / d;
      const pull = { x: (f.pos.x - q.x) * k, y: (f.pos.y - q.y) * k };
      e.pos = { x: e.pos.x + pull.x, y: e.pos.y + pull.y };
      if (e.path) e.track = { x: e.track.x + pull.x, y: e.track.y + pull.y };
    }
  }
  world.fields = world.fields.filter((f) => f.t < f.dur);
  // statuses
  for (const e of world.enemies) {
    const s = e.status;
    if (!s) continue;
    if (s.burn > 0 && e.alive) world.damagePart(e, coreOf(e), BURN_DPS * DT, { ...e.pos });
    s.chill = Math.max(0, s.chill - DT); s.ion = Math.max(0, s.ion - DT); s.burn = Math.max(0, s.burn - DT);
  }
  for (const a of world.arcs) a.ttl -= DT;
  world.arcs = world.arcs.filter((a) => a.ttl > 0);
}

function fuseOut(world: CombatWorld, b: Bullet): void {
  const at = { x: b.x, y: b.y };
  if (b.model === "flak") {
    world.blast(at, b.blast, b.dmg, "");
    world.friendly.kill(b);
  } else if (b.model === "missile" && b.split > 0) { // cluster: split into seekers
    for (let k = 0; k < b.split; k++) {
      const a = -90 - 45 + (90 * k) / Math.max(1, b.split - 1);
      const m = world.friendly.spawn("missile", at.x, at.y, Math.cos(a * DEG) * 420, Math.sin(a * DEG) * 420, 4, b.dmg, 2.5);
      if (m) { m.homing = 1; m.turnRate = 160; m.blast = b.blast; m.src = b.src; }
    }
    world.friendly.kill(b);
  } else if (b.model === "seed") { // gravity field
    const w = world.catalog.weapon(b.src);
    const sp = w.special_params;
    world.fields.length = Math.min(world.fields.length, Math.max(0, (sp.max_fields ?? 1) - 1));
    world.fields.push({ pos: at, t: 0, dur: sp.duration ?? 2, r: sp.radius ?? 100, dps: w.damage, force: sp.force ?? 90 });
    world.friendly.kill(b);
  }
}
