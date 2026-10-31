// Canvas renderer for the combat world. Reads simulation state and interpolates
// positions between ticks; visual-only effects (stars, sparks, shake) use render
// time and never feed back into gameplay. All art is labelled placeholder geometry.
import type { CombatWorld, GameEvent } from "../combat/world";
import { CABLE_MAX, CORE_RADIUS, TRACTOR_DWELL, TRACTOR_RANGE } from "../combat/world";
import { CHARGE_WARN, SWEEP_RANGE, SWEEP_WINDUP, SWEEP_WIDTH } from "../combat/boss";
import { cellToLocal } from "../ships/assembly";
import { coreOf, type Enemy } from "../combat/enemies";
import { partWorldPos, type Part } from "../combat/parts";
import { DEG, lerp, type Vec } from "../core/geometry";
import { PICKUP_WARN_SEC } from "../salvage/salvage";
import { ROLE } from "../combat/powerups";
import { TAIL_LEN, ScorpionBoss } from "../combat/boss";
import { CLAW_LEN, CRAB_TELEGRAPH, CrabBoss } from "../combat/crab";
import { drawAt, preloadSprites, sprite, visCenter, visH, visW } from "./sprites";
import { t } from "../core/i18n";
import explosionUrl from "../../assets/fx/fx_explosion_256.png";
import shieldUrl from "../../assets/fx/fx_shield_256.png";
import plasmaUrl from "../../assets/fx/fx_plasma_256.png";

// Expansion VFX source candidates (static keyframes, status generated_unchecked):
// animated here with code-driven scale/opacity/rotation — not flipbooks.
function tex(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const img = new Image();
  img.src = url;
  return img;
}
const TEX = { explosion: tex(explosionUrl), shield: tex(shieldUrl), plasma: tex(plasmaUrl) };
// Where the core art is centred relative to the boss origin so its tail socket lands on the joint.
const BOSS_ART_OFFSET = { x: 0, y: 6 };
// Drawn size (px) of each weapon's additive muzzle glow.
const MUZZLE_GLOW_SIZE: Record<string, number> = { W001: 34, W008: 42, W022: 54 };
// Per-enemy drawing: sprite id, drawn size (largest side, px) and warning-light spot.
const ENEMY_LOOK: Record<string, { art: string; size: number; warnY: number; warnR: number }> = {
  E01: { art: "enemy_E01", size: 56, warnY: 24, warnR: 9 },
  E02: { art: "enemy_E02", size: 62, warnY: 26, warnR: 9 },
  E03: { art: "enemy_E03", size: 108, warnY: 46, warnR: 14 },
  E04: { art: "enemy_E04", size: 134, warnY: 0, warnR: 0 },
};
const ROLE_COLOR = { offense: "#ff8a1f", survival: "#58e0a0", resource: "#ffd76a" };
const PICKUP_GLYPH: Record<string, string> = { PU01: "3×", PU02: "L", PU03: "M", PU04: "Z", PU05: "S", PU06: "+", PU07: "U", PU08: "❄", PU09: "OD", PU10: "D", PU11: "F", PU12: "$" };

export const C = {
  bg: "#0b1424", teal: "#12333a", star: "#9fb8c8", ivory: "#e9e2d0", charcoal: "#2c2f36", orange: "#f07a1a",
  cyan: "#39e1ff", gold: "#ffd76a", graphite: "#3a3d45", graphiteLight: "#5a5f6b", red: "#ff2d55", magenta: "#ff3bd4",
  violet: "#b06bff", amber: "#ffb020", heat: "#ff8a1f", shield: "#58a6ff", hp: "#7ee081", text: "#e8f3f8", dim: "#8aa4b3",
};
const MODULE_COLOR: Record<string, string> = { W001: "#c9a43a", W008: "#2aa7c0", W022: "#7a45c8" };

interface Spark { p: Vec; v: Vec; life: number; max: number; color: string; size: number }
interface Ring { p: Vec; r: number; grow: number; life: number; max: number; color: string; width: number }
interface Card { img: HTMLImageElement; p: Vec; r0: number; r1: number; life: number; max: number; rot: number; large: boolean; alpha: number }
interface KeyAnim { id: string; keys: number[]; frames: number[]; p: Vec; size: number; life: number; max: number; rot: number }
interface FloatText { p: Vec; text: string; color: string; life: number }

export interface RenderSettings { shake: number; flash: number; photosensitive: boolean }

export class Renderer {
  time = 0;
  private sparks: Spark[] = [];
  private rings: Ring[] = [];
  private cards: Card[] = [];
  private glows: { id: string; p: Vec; life: number; max: number; size: number }[] = [];
  private anims: KeyAnim[] = [];
  private texts: FloatText[] = [];
  private shake = 0;
  private flashA = 0;
  private stars: { x: number; y: number; s: number; layer: number }[] = [];
  private wrecks: { x: number; y: number; w: number; h: number; rot: number; speed: number }[] = [];
  private seed = 7;

  constructor(private ctx: CanvasRenderingContext2D) {
    preloadSprites();
    for (let i = 0; i < 140; i++) this.stars.push({ x: this.rand() * 720, y: this.rand() * 1280, s: 0.6 + this.rand() * 1.6, layer: i % 3 });
    for (let i = 0; i < 6; i++) this.wrecks.push({ x: this.rand() * 720, y: this.rand() * 1280, w: 60 + this.rand() * 120, h: 20 + this.rand() * 40, rot: this.rand() * Math.PI, speed: 12 + this.rand() * 10 });
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  // ------------------------------------------------------------- effects
  spawn(e: GameEvent, s: RenderSettings): void {
    const burst = (n: number, color: string, speed: number, size = 2.5, life = 0.35) => {
      for (let i = 0; i < n; i++) {
        if (this.sparks.length > 260) this.sparks.shift();
        const a = this.rand() * Math.PI * 2, sp = speed * (0.3 + this.rand());
        const l = life * (0.5 + this.rand());
        this.sparks.push({ p: { ...e.pos }, v: { x: Math.cos(a) * sp, y: Math.sin(a) * sp }, life: l, max: l, color, size });
      }
    };
    const ring = (r: number, grow: number, color: string, life = 0.35, width = 3) => this.rings.push({ p: { ...e.pos }, r, grow, life, max: life, color, width });
    // Explosion cards: at most 2 large overlapping cards; extra blasts use particles only.
    const card = (img: HTMLImageElement | null, r1: number, life: number, large: boolean, alpha = 1) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      if (large && this.cards.filter((c) => c.large).length >= 2) return;
      this.cards.push({ img, p: { ...e.pos }, r0: r1 * 0.2, r1, life, max: life, rot: this.rand() * Math.PI * 2, large, alpha });
    };
    // Delivered keyframes (start / middle / end) cross-faded over the effect's life.
    const anim = (id: string, frames: number[], keys: number[], size: number, life: number, cap = 24) => {
      if (!sprite(`${id}_${String(frames[0]).padStart(3, "0")}`)) return false;
      if (this.anims.filter((a) => a.id === id).length >= cap) return true;
      this.anims.push({ id, keys, frames, p: { ...e.pos }, size, life, max: life, rot: this.rand() * Math.PI * 2 });
      return true;
    };
    const K8 = [0, 4 / 7, 1], K12 = [0, 6 / 11, 1];
    const text = (label: string, color: string) => {
      const same = this.texts.find((x) => x.text === label);
      if (same) { same.life = 1.1; return; } // combine duplicates
      if (this.texts.length >= 2) this.texts.shift();
      this.texts.push({ p: { x: e.pos.x, y: e.pos.y - 30 }, text: label, color, life: 1.1 });
    };
    switch (e.type) {
      case "hit":
        if (e.tag === "cargo" || !anim("fx_impact_spark", [0, 4, 7], K8, 44, 0.18, 14)) burst(3, e.tag === "cargo" ? C.amber : C.gold, 160, 2);
        break;
      case "deflect": burst(3, C.dim, 140, 2); break;
      case "kill":
        burst(e.tag === "boss" ? 60 : 18, C.orange, 260, 3); ring(10, 260, C.orange, 0.4);
        if (e.tag === "shield") { card(TEX.explosion, 170 / 2, 0.55, true); anim("fx_explosion_small", [0, 6, 11], K12, 170, 0.5); }
        else if (!anim("fx_explosion_small", [0, 6, 11], K12, 120, 0.45)) card(TEX.explosion, 70 / 2 + 10, 0.3, false);
        this.addShake(e.tag === "shield" ? 4 : 2, s); break;
      case "blast":
        if (e.tag === "fuel") {
          // fuel explosion: big orange ring sized to the real blast radius
          ring(20, (e.value ?? 110) * 2.6, C.orange, 0.45, 6); burst(30, C.amber, 320, 3);
          if (!anim("fx_explosion_small", [0, 6, 11], K12, (e.value ?? 110) * 1.8, 0.5)) card(TEX.explosion, e.value ?? 110, 0.5, true);
          this.addShake(6, s); this.addFlash(0.15, s);
        } else { ring(8, (e.value ?? 45) * 3, C.violet, 0.3, 4); burst(10, C.violet, 200); }
        break;
      case "joint_break": anim("fx_joint_break", [0, 4, 7], K8, 110, 0.32); burst(14, C.gold, 300, 3); ring(6, 180, C.gold, 0.3, 4); this.addShake(3, s); break;
      case "sever": anim("fx_detach_burst", [0, 4, 7], K8, 150, 0.34); burst(20, C.cyan, 320, 3); ring(10, 240, C.cyan, 0.5, 5); this.addShake(6, s); this.addFlash(0.25, s); break;
      case "scrap": burst(16, C.dim, 200, 3); break;
      case "secured": ring(20, 200, C.cyan, 0.6, 5); burst(24, C.cyan, 220); break;
      case "tractor_lock": ring(30, -40, C.cyan, 0.4, 3); break;
      case "snap": burst(12, C.red, 200); break;
      case "player_hit": burst(10, C.red, 200); this.addShake(5, s); this.addFlash(0.15, s); break;
      case "shield_hit": if (!anim("fx_shield_hit", [0, 4, 7], K8, 112, 0.25, 4)) card(TEX.shield, 56, 0.25, false, 0.8); break;
      case "pickup": {
        const role = ROLE[e.tag ?? ""] ?? "resource";
        ring(16, 160, ROLE_COLOR[role], 0.3, 4); burst(12, ROLE_COLOR[role], 180, 2.5, 0.3);
        if (e.tag === "PU05") card(TEX.shield, 60, 0.45, false, 0.9);
        text(t(`powerups.${e.tag}.name`), ROLE_COLOR[role]);
        break;
      }
      case "converted": text(t("hud.converted", { n: e.value ?? 10 }), C.gold); break;
      case "scrap_pick": burst(2, C.gold, 60, 1.5, 0.2); break;
      case "graze": burst(1, C.cyan, 80, 1.5, 0.2); break;
      case "overdrive": ring(30, 400, C.gold, 0.5, 6); break;
      case "dash": ring(20, 60, C.cyan, 0.2, 2); break;
      case "phase": ring(60, 300, C.red, 0.6, 6); this.addShake(6, s); break;
      case "boss_dead": burst(120, C.orange, 420, 4, 0.8); ring(40, 600, C.gold, 0.9, 8); card(TEX.explosion, 220, 0.8, true); this.addShake(8, s); this.addFlash(0.4, s); break;
      case "module_lost": burst(14, C.orange, 200); break;
      case "muzzle": {
        // BATCH_007 additive emitter glow at the real muzzle; particle fallback without art.
        const id = `weapon_${e.tag}_glow`;
        if (e.tag && sprite(id)) {
          if (this.glows.length > 16) this.glows.shift();
          this.glows.push({ id, p: { ...e.pos }, life: 0.07, max: 0.07, size: MUZZLE_GLOW_SIZE[e.tag] ?? 36 });
        } else if (e.family !== "kinetic") burst(1, e.family === "plasma" ? C.violet : C.cyan, 60, 2, 0.12);
        break;
      }
    }
  }

  private addShake(n: number, s: RenderSettings): void { this.shake = Math.min(18, this.shake + n * s.shake); }
  private addFlash(a: number, s: RenderSettings): void { if (!s.photosensitive) this.flashA = Math.min(0.35, this.flashA + a * s.flash); }

  update(dt: number): void {
    this.time += dt;
    for (const p of this.sparks) { p.p.x += p.v.x * dt; p.p.y += p.v.y * dt; p.v.x *= 0.9; p.v.y *= 0.9; p.life -= dt; }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    for (const r of this.rings) { r.r += r.grow * dt; r.life -= dt; }
    this.rings = this.rings.filter((r) => r.life > 0 && r.r > 0);
    for (const a of this.anims) a.life -= dt;
    this.anims = this.anims.filter((a) => a.life > 0);
    for (const c of this.glows) c.life -= dt;
    this.glows = this.glows.filter((c) => c.life > 0);
    for (const c of this.cards) c.life -= dt;
    this.cards = this.cards.filter((c) => c.life > 0);
    for (const x of this.texts) { x.life -= dt; x.p.y -= 40 * dt; }
    this.texts = this.texts.filter((x) => x.life > 0);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flashA = Math.max(0, this.flashA - dt * 1.5);
  }

  // ------------------------------------------------------------- frame
  draw(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    g.save();
    if (this.shake > 0) g.translate((this.rand() - 0.5) * this.shake, (this.rand() - 0.5) * this.shake);
    this.drawBackground();
    this.drawFiringLane(w, alpha);
    for (const e of w.enemies) this.drawEnemy(e, alpha);
    if (w.boss && (w.boss.e.alive || w.status === "running")) this.drawBoss(w, alpha);
    this.drawFriendly(w, alpha);
    this.drawPickups(w, alpha);
    this.drawSalvage(w, alpha);
    this.drawPlayer(w, alpha);
    this.drawLock(w, alpha);
    for (const r of this.rings) {
      g.globalAlpha = Math.max(0, r.life / r.max);
      g.strokeStyle = r.color; g.lineWidth = r.width;
      g.beginPath(); g.arc(r.p.x, r.p.y, r.r, 0, Math.PI * 2); g.stroke();
    }
    for (const a of this.anims) {
      const t = 1 - a.life / a.max;
      const seg = t < a.keys[1] ? 0 : 1;
      const u = (t - a.keys[seg]) / (a.keys[seg + 1] - a.keys[seg]);
      const fade = t > 0.8 ? (1 - t) / 0.2 : 1;
      const scale = 0.9 + 0.2 * t;
      for (const [fi, w8] of [[seg, 1 - u], [seg + 1, u]] as const) {
        const sp = sprite(`${a.id}_${String(a.frames[fi]).padStart(3, "0")}`);
        if (sp && w8 > 0.01) drawAt(g, sp, a.p.x, a.p.y, ...visCenter(sp), (a.size * scale) / Math.max(visW(sp), visH(sp)), a.rot, w8 * fade);
      }
    }
    for (const gl of this.glows) {
      const sp = sprite(gl.id);
      if (!sp) continue;
      const k = gl.life / gl.max;
      g.save(); g.globalCompositeOperation = "lighter";
      drawAt(g, sp, gl.p.x, gl.p.y - 4, ...visCenter(sp), (gl.size * (0.8 + 0.2 * k)) / Math.max(visW(sp), visH(sp)), 0, k);
      g.restore();
    }
    for (const c of this.cards) {
      const k = 1 - c.life / c.max;
      const r = c.r0 + (c.r1 - c.r0) * Math.min(1, k * 1.6);
      g.save(); g.globalAlpha = c.alpha * Math.max(0, 1 - k * k); g.globalCompositeOperation = "lighter";
      g.translate(c.p.x, c.p.y); g.rotate(c.rot + k * 0.4);
      const ar = c.img.naturalHeight / c.img.naturalWidth;
      g.drawImage(c.img, -r, -r * ar, r * 2, r * 2 * ar);
      g.restore();
    }
    for (const p of this.sparks) {
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.p.x, p.p.y, p.size * (p.life / p.max) + 0.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = "center";
    for (const x of this.texts) {
      g.globalAlpha = Math.min(1, x.life * 2);
      g.font = "700 26px RB Thai, sans-serif"; g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,0.75)";
      g.strokeText(x.text, x.p.x, x.p.y); g.fillStyle = x.color; g.fillText(x.text, x.p.x, x.p.y);
    }
    g.globalAlpha = 1;
    this.drawTelegraphs(w, alpha);
    this.drawHostile(w, alpha); // dedicated high-contrast pass, always above effects
    g.restore();
    if (w.overdriveLeft > 0) {
      g.strokeStyle = `rgba(255,215,106,${0.35 + Math.sin(this.time * 10) * 0.1})`;
      g.lineWidth = 10; g.strokeRect(5, 5, 710, 1270);
    }
    if (this.flashA > 0) { g.fillStyle = `rgba(255,255,255,${this.flashA})`; g.fillRect(0, 0, 720, 1280); }
  }

  // BATCH_004 Graveyard Belt layers: far (opaque, tileable copy), mid and foreground
  // (transparent edge wrecks) scroll at different speeds. All stay behind actors.
  private drawBackgroundArt(): boolean {
    const far = sprite("bg_P01_far");
    if (!far) return false;
    const g = this.ctx;
    const layer = (id: string, speed: number, alpha: number) => {
      const sp = sprite(id);
      if (!sp) return;
      const [w, h] = sp.meta.runtime_size;
      const k = 720 / w, th = h * k;
      const off = (this.time * speed) % th;
      for (let y = off - th; y < 1300; y += th) drawAt(g, sp, 0, y, 0, 0, k, 0, alpha);
    };
    g.fillStyle = C.bg; g.fillRect(-20, -20, 760, 1320);
    layer("bg_P01_far", 10, 1);
    layer("bg_P01_mid", 26, 0.9);
    layer("bg_P01_foreground", 52, 0.8);
    return true;
  }

  private drawBackground(): void {
    if (this.drawBackgroundArt()) return;
    const g = this.ctx;
    g.fillStyle = C.bg; g.fillRect(-20, -20, 760, 1320);
    const grd = g.createRadialGradient(540, 300, 20, 540, 300, 520);
    grd.addColorStop(0, "rgba(18,51,58,0.75)"); grd.addColorStop(1, "rgba(18,51,58,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 720, 1280);
    for (const wr of this.wrecks) {
      const y = ((wr.y + this.time * wr.speed) % 1500) - 110;
      g.save(); g.translate(wr.x, y); g.rotate(wr.rot + this.time * 0.02);
      g.fillStyle = "rgba(40,70,80,0.35)"; g.fillRect(-wr.w / 2, -wr.h / 2, wr.w, wr.h);
      g.fillStyle = "rgba(20,40,48,0.5)"; g.fillRect(-wr.w / 2 + 8, -wr.h / 2 + 5, wr.w * 0.3, wr.h - 10);
      g.restore();
    }
    for (const s of this.stars) {
      const y = (s.y + this.time * (14 + s.layer * 26)) % 1280;
      g.fillStyle = `rgba(159,184,200,${0.25 + s.layer * 0.2})`;
      g.fillRect(s.x, y, s.s, s.s);
    }
  }

  private pos(e: Enemy, alpha: number): Vec { return lerp(e.prev, e.pos, alpha); }

  private drawEnemy(e: Enemy, alpha: number): void {
    const g = this.ctx;
    const p = this.pos(e, alpha);
    const core = coreOf(e);
    const flash = core.flash > 0;
    if (e.role === "supply") { this.drawSupply(e, p, flash); return; }
    // BATCH_003 art: sources are nose-up, enemies fly toward the player, so rotate 180°.
    const look = ENEMY_LOOK[e.defId] ?? ENEMY_LOOK.E01;
    const art = sprite(look.art);
    if (e.telegraph > 0) {
      g.fillStyle = `rgba(255,45,85,${0.45 + 0.45 * Math.sin(this.time * 40)})`;
      g.beginPath(); g.arc(p.x, p.y + look.warnY, look.warnR, 0, Math.PI * 2); g.fill();
      // aimed volley: show the locked aim line during the warning
      if (e.role === "interceptor" && e.aim) {
        g.strokeStyle = "rgba(255,45,85,0.45)"; g.lineWidth = 2; g.setLineDash([8, 8]);
        g.beginPath(); g.moveTo(p.x, p.y + 20); g.lineTo(e.aim.x, e.aim.y); g.stroke(); g.setLineDash([]);
      }
    }
    if (art) drawAt(g, art, p.x, p.y, ...visCenter(art), look.size / Math.max(visW(art), visH(art)), Math.PI, 1, flash);
    else {
      g.save(); g.translate(p.x, p.y);
      g.fillStyle = flash ? "#fff" : C.graphite; g.strokeStyle = C.red; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, look.size * 0.4); g.lineTo(look.size * 0.35, -look.size * 0.2); g.lineTo(-look.size * 0.35, -look.size * 0.2); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    if (e.role === "shield") {
      const shield = e.parts.find((x) => x.id === "shield")!;
      const joint = e.parts.find((x) => x.id === "joint")!;
      if (shield.active) {
        g.fillStyle = shield.flash > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,59,212,0.45)";
        g.fillRect(p.x - 40, p.y + 35, 80, 12);
        this.shieldIcon(p.x, p.y + 41, 7);
      }
      if (joint.active) this.jointIcon(p.x + joint.offset.x, p.y + joint.offset.y, 11, joint.flash > 0);
      this.hpBar(p.x - 40, p.y - 58, 80, core.hp / core.hpMax);
    } else if (e.role === "cargo") {
      // Engine block = joint (free the cargo), tanks = fuel (explodes).
      const engine = e.parts.find((x) => x.id === "engine")!;
      if (engine.active) {
        g.strokeStyle = engine.flash > 0 ? "#fff" : "rgba(255,215,106,0.75)"; g.lineWidth = 2; g.setLineDash([5, 5]);
        g.strokeRect(p.x - 15, p.y - 42, 30, 84); g.setLineDash([]);
        this.jointIcon(p.x, p.y - 30, 10, engine.flash > 0);
        this.hpBar(p.x - 18, p.y - 62, 36, engine.hp / engine.hpMax, C.gold);
      }
      this.hpBar(p.x - 64, p.y + 32, 128, core.hp / core.hpMax, C.orange);
    } else if (e.role === "interceptor" && core.hp < core.hpMax) {
      this.hpBar(p.x - 22, p.y - 36, 44, core.hp / core.hpMax);
    }
  }

  // Supply node (no final art yet): a marked container crate drifting down.
  private drawSupply(e: Enemy, p: Vec, flash: boolean): void {
    const g = this.ctx;
    const core = coreOf(e);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    g.save(); g.translate(p.x, p.y);
    g.strokeStyle = `rgba(255,176,32,${0.35 + pulse * 0.4})`; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 44 + pulse * 4, 0, Math.PI * 2); g.stroke();
    g.rotate(Math.sin(this.time * 0.8) * 0.15);
    g.fillStyle = flash ? "#fff" : C.graphite; g.fillRect(-30, -30, 60, 60);
    g.strokeStyle = C.amber; g.lineWidth = 3; g.strokeRect(-30, -30, 60, 60);
    g.fillStyle = C.graphiteLight; g.fillRect(-22, -6, 44, 12);
    g.fillStyle = C.amber; g.fillRect(-4, -22, 8, 44);
    g.restore();
    this.hpBar(p.x - 30, p.y - 44, 60, core.hp / core.hpMax, C.amber);
  }

  // Integrated BATCH_001 art drawn nose-up as delivered: the art's tail socket sits on
  // the gameplay joint; the tail piece rotates about it; ring (open) or armour (closed) on top.
  private drawBossSprites(w: CombatWorld, alpha: number): boolean {
    const b = w.boss as ScorpionBoss;
    const core = sprite("boss_B02_core"), tail = sprite("boss_B02_signature_mount");
    const ring = sprite("boss_B02_joint"), plate = sprite("boss_B02_armor");
    if (!core || !tail || !ring || !plate) return false;
    const g = this.ctx;
    const p = this.pos(b.e, alpha);
    const kCore = 340 / visW(core);
    const [cx, cy] = visCenter(core);
    drawAt(g, core, p.x + BOSS_ART_OFFSET.x, p.y + BOSS_ART_OFFSET.y, cx, cy, kCore, 0, 1, b.core.flash > 0);
    const dmg = sprite("boss_B02_damage_overlay"); // shares the core's crop: same transform
    const worn = Math.max(0, Math.min(1, (0.85 - b.hpFrac) / 0.55));
    if (dmg && worn > 0) drawAt(g, dmg, p.x + BOSS_ART_OFFSET.x, p.y + BOSS_ART_OFFSET.y, cx, cy, kCore, 0, worn);
    for (const side of [-1, 1] as const) {
      const a = b.action;
      const warn = a?.name === "claw_fan" && ((side === -1 && a.t < 0.6) || (side === 1 && a.t > 1.2 && a.t < 1.8));
      if (warn) {
        const c = b.clawWorld(side);
        g.fillStyle = `rgba(255,45,85,${0.35 + 0.25 * Math.sin(this.time * 30)})`; g.beginPath(); g.arc(c.x - b.e.pos.x + p.x, c.y - b.e.pos.y + p.y, 26, 0, Math.PI * 2); g.fill();
      }
    }
    const jx = p.x + b.joint.offset.x, jy = p.y + b.joint.offset.y;
    if (!b.signatureRemoved) {
      const kTail = (TAIL_LEN + 22) / visH(tail);
      const [sx, sy] = tail.meta.attachment_anchors.socket ?? tail.meta.pivot_px;
      drawAt(g, tail, jx, jy, sx, sy, kTail, b.tailAngle() * DEG + Math.PI / 2, 1, b.tail.flash > 0);
      if (b.jointExposed) {
        drawAt(g, ring, jx, jy, ...visCenter(ring), 48 / visW(ring), 0, 1, b.joint.flash > 0);
        this.jointIcon(jx, jy, 20, false, true);
      } else {
        drawAt(g, plate, jx, jy, ...visCenter(plate), 54 / visW(plate));
        this.shieldIcon(jx, jy, 9);
      }
      const pts = (b.tail.shape as { points: Vec[] }).points;
      const st = pts[pts.length - 1];
      const frac = b.tail.integrity / b.tail.integrityMax;
      if (frac < 1) {
        const bx = p.x + st.x, by = p.y + st.y + 26;
        g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(bx - 26, by, 52, 7);
        g.fillStyle = frac >= 0.35 ? C.cyan : C.red; g.fillRect(bx - 26, by, 52 * Math.max(0, frac), 7);
        g.fillStyle = "#fff"; g.fillRect(bx - 26 + 52 * 0.35, by - 2, 2, 11);
      }
    } else {
      g.fillStyle = "#1a1c22"; g.beginPath(); g.arc(jx, jy, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange; g.beginPath(); g.arc(jx, jy, 5 + Math.sin(this.time * 20) * 2, 0, Math.PI * 2); g.fill();
    }
    if (b.inTransition && !b.entering) { g.strokeStyle = `rgba(255,45,85,${0.4 + Math.sin(this.time * 12) * 0.3})`; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y, 100, 0, Math.PI * 2); g.stroke(); }
    return true;
  }

  // B01 Rivet Crab: BATCH_010 art rotated 180° (faces the player), 300 px wide;
  // the grabbing claw (signature) is drawn from its socket along the claw angle.
  private drawCrab(b: CrabBoss, alpha: number): void {
    const g = this.ctx;
    const p = this.pos(b.e, alpha);
    const core = sprite("boss_B01_core"), claw = sprite("boss_B01_signature_mount");
    const ring = sprite("boss_B01_joint"), plate = sprite("boss_B01_armor");
    const jx = p.x + b.joint.offset.x, jy = p.y + b.joint.offset.y;
    const dir = { x: Math.cos(b.clawAngle * DEG), y: Math.sin(b.clawAngle * DEG) };
    // claw first (under the body), arm segment while lunging
    if (!b.signatureRemoved) {
      const base = { x: jx + dir.x * b.clawExtend, y: jy + dir.y * b.clawExtend };
      if (b.clawExtend > 4) {
        g.strokeStyle = C.charcoal; g.lineWidth = 16; g.lineCap = "round";
        g.beginPath(); g.moveTo(jx, jy); g.lineTo(base.x, base.y); g.stroke();
        g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(jx, jy); g.lineTo(base.x, base.y); g.stroke();
      }
      if (claw) {
        const [sx, sy] = claw.meta.attachment_anchors.socket ?? claw.meta.pivot_px;
        drawAt(g, claw, base.x, base.y, sx, sy, (CLAW_LEN + 14) / visH(claw), b.clawAngle * DEG + Math.PI / 2, 1, b.tail.flash > 0);
      } else {
        g.strokeStyle = b.tail.flash > 0 ? "#fff" : C.graphiteLight; g.lineWidth = 26; g.lineCap = "round";
        g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(base.x + dir.x * CLAW_LEN, base.y + dir.y * CLAW_LEN); g.stroke();
      }
    }
    if (core) {
      const k = 300 / visW(core);
      drawAt(g, core, p.x, p.y, ...visCenter(core), k, Math.PI, 1, b.core.flash > 0);
      const dmg = sprite("boss_B01_damage_overlay");
      const worn = Math.max(0, Math.min(1, (0.85 - b.hpFrac) / 0.55));
      if (dmg && worn > 0) drawAt(g, dmg, p.x, p.y, ...visCenter(core), k, Math.PI, worn);
    } else {
      g.fillStyle = b.core.flash > 0 ? "#fff" : C.graphite; g.beginPath(); g.arc(p.x, p.y + 22, 52, 0, Math.PI * 2); g.fill();
    }
    if (!b.signatureRemoved) {
      if (b.jointExposed) {
        if (ring) drawAt(g, ring, jx, jy, ...visCenter(ring), 42 / visW(ring), 0, 1, b.joint.flash > 0);
        this.jointIcon(jx, jy, 18, false, true);
      } else {
        if (plate) drawAt(g, plate, jx, jy, ...visCenter(plate), 40 / visH(plate));
        this.shieldIcon(jx, jy, 8);
      }
      const tip = { x: jx + dir.x * (b.clawExtend + CLAW_LEN), y: jy + dir.y * (b.clawExtend + CLAW_LEN) };
      const frac = b.tail.integrity / b.tail.integrityMax;
      if (frac < 1) {
        const bx = tip.x, by = tip.y + 24;
        g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(bx - 26, by, 52, 7);
        g.fillStyle = frac >= 0.35 ? C.cyan : C.red; g.fillRect(bx - 26, by, 52 * Math.max(0, frac), 7);
        g.fillStyle = "#fff"; g.fillRect(bx - 26 + 52 * 0.35, by - 2, 2, 11);
      }
    } else {
      g.fillStyle = "#1a1c22"; g.beginPath(); g.arc(jx, jy, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange; g.beginPath(); g.arc(jx, jy, 4 + Math.sin(this.time * 20) * 2, 0, Math.PI * 2); g.fill();
    }
    if (b.inTransition && !b.entering) { g.strokeStyle = `rgba(255,45,85,${0.4 + Math.sin(this.time * 12) * 0.3})`; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y + 20, 110, 0, Math.PI * 2); g.stroke(); }
  }

  private drawCrabTelegraphs(b: CrabBoss, alpha: number): void {
    const a = b.action;
    if (!a) return;
    const g = this.ctx;
    const p = this.pos(b.e, alpha);
    const warn = a.t < CRAB_TELEGRAPH;
    const k = Math.min(1, a.t / CRAB_TELEGRAPH);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 24);
    if (a.name === "claw_sweep" && warn) {
      // the sector the claw will sweep, out to its lunge reach
      const s = { x: p.x + b.joint.offset.x, y: p.y + b.joint.offset.y };
      const lo = Math.min(a.a0, a.a1) * DEG, hi = Math.max(a.a0, a.a1) * DEG;
      g.fillStyle = `rgba(255,45,85,${0.12 + 0.18 * k})`;
      g.beginPath(); g.moveTo(s.x, s.y); g.arc(s.x, s.y, a.reach + 24, lo, hi); g.closePath(); g.fill();
      g.strokeStyle = `rgba(255,45,85,${0.5 + 0.4 * k})`; g.lineWidth = 3; g.setLineDash([12, 10]);
      g.beginPath(); g.arc(s.x, s.y, a.reach + 24, lo, hi); g.stroke(); g.setLineDash([]);
    } else if ((a.name === "aimed_rivets" || a.name === "mine_fan") && warn) {
      const m = b.mouthWorld();
      g.fillStyle = `rgba(255,45,85,${0.35 + 0.4 * pulse})`; g.beginPath(); g.arc(m.x - b.e.pos.x + p.x, m.y - b.e.pos.y + p.y, 12 + 8 * k, 0, Math.PI * 2); g.fill();
      if (a.name === "aimed_rivets") {
        const base = Math.atan2(a.target.y - m.y, a.target.x - m.x);
        g.strokeStyle = "rgba(255,45,85,0.45)"; g.lineWidth = 2; g.setLineDash([6, 8]);
        for (const off of [-12, 0, 12]) {
          const an = base + off * DEG;
          g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + Math.cos(an) * 700, m.y + Math.sin(an) * 700); g.stroke();
        }
        g.setLineDash([]);
      }
    } else if (a.name === "side_dash" && warn) {
      g.fillStyle = `rgba(255,45,85,${0.12 + 0.12 * pulse})`;
      const x0 = Math.min(a.start.x, a.target.x) - 150, x1 = Math.max(a.start.x, a.target.x) + 150;
      g.fillRect(x0, a.start.y - 90, x1 - x0, 210);
    } else if (a.name === "aimed_volley" && a.t < 0.5) {
      const m = b.mouthWorld();
      g.strokeStyle = "rgba(255,45,85,0.6)"; g.lineWidth = 2; g.setLineDash([6, 8]);
      g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(a.target.x, a.target.y); g.stroke(); g.setLineDash([]);
    }
  }

  private drawBoss(w: CombatWorld, alpha: number): void {
    if (w.boss instanceof CrabBoss) { this.drawCrab(w.boss, alpha); return; }
    if (this.drawBossSprites(w, alpha)) return;
    const g = this.ctx;
    const b = w.boss as ScorpionBoss;
    const p = this.pos(b.e, alpha);
    g.save(); g.translate(p.x, p.y);
    // legs
    g.strokeStyle = C.graphiteLight; g.lineWidth = 9; g.lineCap = "round";
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const sway = Math.sin(this.time * 4 + i) * 6;
      g.beginPath(); g.moveTo(s * 40, -20 + i * 22); g.lineTo(s * (90 + i * 6), -40 + i * 26 + sway); g.lineTo(s * (110 + i * 4), -8 + i * 30 + sway); g.stroke();
    }
    // claws
    for (const s of [-1, 1] as const) {
      const fanWarn = b.action?.name === "claw_fan" && ((s === -1 && b.action.t < 0.6) || (s === 1 && b.action.t > 1.2 && b.action.t < 1.8));
      g.fillStyle = C.graphite; g.beginPath(); g.ellipse(s * 130, 58, 34, 30, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = fanWarn ? C.red : C.graphiteLight; g.lineWidth = fanWarn ? 5 : 3; g.stroke();
      g.fillStyle = C.charcoal; g.beginPath(); g.moveTo(s * 112, 80); g.lineTo(s * 124, 112); g.lineTo(s * 140, 82); g.fill();
      this.shieldIcon(s * 130, 54, 8);
    }
    // torso
    const coreFlash = b.core.flash > 0;
    g.fillStyle = coreFlash ? "#fff" : C.graphite;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(Math.cos(a) * 66, Math.sin(a) * 60); }
    g.closePath(); g.fill();
    g.strokeStyle = C.red; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.charcoal; g.fillRect(-34, -30, 68, 22);
    for (const x of [-18, 0, 18]) { g.fillStyle = C.red; g.beginPath(); g.arc(x, 22, 6, 0, Math.PI * 2); g.fill(); }
    // tail
    if (!b.signatureRemoved) {
      const pts = (b.tail.shape as { points: Vec[] }).points;
      const chain = [b.joint.offset, ...pts];
      g.strokeStyle = C.charcoal; g.lineWidth = 22;
      g.beginPath(); chain.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
      pts.forEach((q, i) => {
        g.fillStyle = b.tail.flash > 0 ? "#fff" : i === pts.length - 1 ? "#4a2a6a" : C.graphite;
        g.beginPath(); g.arc(q.x, q.y, 17, 0, Math.PI * 2); g.fill();
        g.strokeStyle = C.graphiteLight; g.lineWidth = 2; g.stroke();
      });
      const st = pts[pts.length - 1];
      g.fillStyle = C.violet; g.beginPath(); g.arc(st.x, st.y + 6, 7 + Math.sin(this.time * 8) * 1.5, 0, Math.PI * 2); g.fill();
      const frac = b.tail.integrity / b.tail.integrityMax;
      if (frac < 1) {
        g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(st.x - 26, st.y + 26, 52, 7);
        g.fillStyle = frac >= 0.35 ? C.cyan : C.red; g.fillRect(st.x - 26, st.y + 26, 52 * Math.max(0, frac), 7);
        g.fillStyle = "#fff"; g.fillRect(st.x - 26 + 52 * 0.35, st.y + 24, 2, 11);
      }
      if (b.jointExposed) this.jointIcon(b.joint.offset.x, b.joint.offset.y, 18, b.joint.flash > 0, true);
      else { g.fillStyle = C.graphiteLight; g.fillRect(b.joint.offset.x - 24, b.joint.offset.y - 22, 48, 44); this.shieldIcon(b.joint.offset.x, b.joint.offset.y, 10); }
    } else {
      g.fillStyle = "#1a1c22"; g.beginPath(); g.arc(b.joint.offset.x, b.joint.offset.y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange; g.beginPath(); g.arc(b.joint.offset.x, b.joint.offset.y, 5 + Math.sin(this.time * 20) * 2, 0, Math.PI * 2); g.fill();
    }
    if (b.inTransition && !b.entering) { g.strokeStyle = `rgba(255,45,85,${0.4 + Math.sin(this.time * 12) * 0.3})`; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 90, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }

  // Tutorial focus: dim the screen except a ring around the target and point at it.
  focus: { p: Vec; r: number; label: string } | null = null;

  drawFocus(): void {
    const f = this.focus;
    if (!f) return;
    const g = this.ctx;
    g.save();
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.beginPath(); g.rect(0, 0, 720, 1280); g.arc(f.p.x, f.p.y, f.r, 0, Math.PI * 2, true); g.fill("evenodd");
    const pulse = 1 + Math.sin(this.time * 6) * 0.06;
    g.strokeStyle = C.gold; g.lineWidth = 5; g.beginPath(); g.arc(f.p.x, f.p.y, f.r * pulse, 0, Math.PI * 2); g.stroke();
    // arrow from below
    const ay = f.p.y + f.r + 70 + Math.sin(this.time * 6) * 8;
    g.fillStyle = C.gold;
    g.beginPath(); g.moveTo(f.p.x, f.p.y + f.r + 12); g.lineTo(f.p.x - 22, ay - 20); g.lineTo(f.p.x + 22, ay - 20); g.fill();
    g.fillRect(f.p.x - 7, ay - 22, 14, 40);
    g.font = "700 30px RB Thai, sans-serif"; g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.85)";
    g.strokeText(f.label, f.p.x, ay + 52); g.fillStyle = "#fff"; g.fillText(f.label, f.p.x, ay + 52);
    g.restore();
  }

  // Where to stand: a green lane under the open joint (shots travel mostly straight up).
  private drawFiringLane(w: CombatWorld, alpha: number): void {
    const b = w.boss;
    if (!b || !b.e.alive || b.signatureRemoved) return;
    if (!b.jointExposed && !b.jointSoon()) return;
    const g = this.ctx;
    const p = this.pos(b.e, alpha);
    const jx = p.x + b.joint.offset.x, jy = p.y + b.joint.offset.y;
    const open = b.jointExposed;
    const grd = g.createLinearGradient(0, jy, 0, 1050);
    grd.addColorStop(0, open ? "rgba(126,224,129,0.28)" : "rgba(126,224,129,0.1)");
    grd.addColorStop(1, "rgba(126,224,129,0)");
    g.fillStyle = grd; g.fillRect(jx - 26, jy + 20, 52, 1050 - jy);
    g.setLineDash([10, 12]); g.strokeStyle = open ? "rgba(126,224,129,0.75)" : "rgba(126,224,129,0.35)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(jx - 26, jy + 20); g.lineTo(jx - 26, 1000); g.moveTo(jx + 26, jy + 20); g.lineTo(jx + 26, 1000); g.stroke(); g.setLineDash([]);
    if (open) {
      g.font = "700 22px RB Thai, sans-serif"; g.textAlign = "center"; g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,0.8)";
      const label = t("hud.lane");
      g.strokeText(label, jx, 1000); g.fillStyle = "#9ff0a2"; g.fillText(label, jx, 1000);
    }
  }

  private drawTelegraphs(w: CombatWorld, alpha: number): void {
    if (w.boss instanceof CrabBoss) { if (w.boss.e.alive) this.drawCrabTelegraphs(w.boss, alpha); return; }
    const b = w.boss;
    if (!b || !b.e.alive || !b.action) return;
    const g = this.ctx;
    const a = b.action;
    const p = this.pos(b.e, alpha);
    if (a.name === "tail_sweep") {
      const s = b.stingerWorld();
      if (a.t < SWEEP_WINDUP) {
        const k = a.t / SWEEP_WINDUP;
        g.fillStyle = `rgba(255,45,85,${0.1 + 0.15 * k})`;
        g.beginPath(); g.moveTo(s.x, s.y);
        g.arc(s.x, s.y, SWEEP_RANGE, Math.min(a.a0, a.a1) * DEG, Math.max(a.a0, a.a1) * DEG); g.closePath(); g.fill();
        g.strokeStyle = `rgba(255,45,85,${0.5 + 0.5 * k})`; g.lineWidth = 2;
        g.setLineDash([12, 10]);
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a.a0 * DEG) * SWEEP_RANGE, s.y + Math.sin(a.a0 * DEG) * SWEEP_RANGE); g.stroke();
        g.setLineDash([]);
      } else if (b.beamAngle !== null) {
        const to = { x: s.x + Math.cos(b.beamAngle * DEG) * SWEEP_RANGE, y: s.y + Math.sin(b.beamAngle * DEG) * SWEEP_RANGE };
        g.strokeStyle = "rgba(255,59,212,0.45)"; g.lineWidth = SWEEP_WIDTH + 14; g.lineCap = "round";
        g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(to.x, to.y); g.stroke();
        g.strokeStyle = C.red; g.lineWidth = SWEEP_WIDTH; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(to.x, to.y); g.stroke();
        g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(to.x, to.y); g.stroke();
      }
    } else if (a.name === "claw_ring" && a.t < 0.8) {
      const k = a.t / 0.8;
      g.strokeStyle = `rgba(255,45,85,${0.3 + 0.5 * k})`; g.lineWidth = 4;
      g.beginPath(); g.arc(p.x, p.y, 80 + 40 * (1 - k), (a.a0 + 34) * DEG, (a.a0 - 34 + 360) * DEG); g.stroke();
      g.strokeStyle = "rgba(126,224,129,0.8)"; g.lineWidth = 6;
      g.beginPath(); g.arc(p.x, p.y, 120, (a.a0 - 30) * DEG, (a.a0 + 30) * DEG); g.stroke();
    } else if (a.name === "lateral_charge" && a.t < CHARGE_WARN) {
      g.save();
      g.strokeStyle = `rgba(255,45,85,${0.25 + 0.2 * Math.sin(this.time * 20)})`; g.lineWidth = 130; g.lineCap = "round";
      g.beginPath(); g.moveTo(a.start.x, a.start.y); g.lineTo(a.target.x, a.target.y); g.stroke();
      g.restore();
    } else if ((a.name === "aimed_volley" || a.name === "tail_vent") && a.t < 0.4) {
      const c = b.clawWorld(-1);
      g.strokeStyle = "rgba(255,45,85,0.6)"; g.lineWidth = 2; g.setLineDash([6, 8]);
      g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(a.target.x, a.target.y); g.stroke(); g.setLineDash([]);
    }
  }

  private drawFriendly(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    for (const b of w.friendly.items) {
      if (!b.alive) continue;
      const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
      if (b.model === "plasma") {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        g.strokeStyle = "rgba(176,107,255,0.5)"; g.lineWidth = 8; g.lineCap = "round";
        g.beginPath(); g.moveTo(x - (b.vx / sp) * 24, y - (b.vy / sp) * 24); g.lineTo(x, y); g.stroke();
        const img = TEX.plasma;
        if (img?.complete && img.naturalWidth) {
          // Source art points up; orient along the travel tangent. Collision stays the head only.
          g.save(); g.translate(x, y); g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); g.globalCompositeOperation = "lighter";
          g.drawImage(img, -10, -12, 20, 66); g.restore();
        }
        g.fillStyle = C.violet; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = C.cyan; g.lineWidth = 2; g.stroke(); // friendly rim, distinct from hostile magenta
        g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      } else {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        g.strokeStyle = C.gold; g.lineWidth = 4; g.lineCap = "round";
        g.beginPath(); g.moveTo(x - (b.vx / sp) * 14, y - (b.vy / sp) * 14); g.lineTo(x, y); g.stroke();
      }
    }
    for (const bm of w.beams) {
      g.strokeStyle = "rgba(57,225,255,0.8)"; g.lineWidth = 7;
      g.beginPath(); g.moveTo(bm.from.x, bm.from.y); g.lineTo(bm.to.x, bm.to.y); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    }
  }

  private drawPickups(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    for (const m of w.motes) {
      const p = lerp(m.prev, m.pos, alpha);
      g.fillStyle = C.gold;
      g.beginPath(); g.moveTo(p.x, p.y - 6); g.lineTo(p.x + 5, p.y); g.lineTo(p.x, p.y + 6); g.lineTo(p.x - 5, p.y); g.fill();
    }
    if (w.buffs.has("PU07")) {
      const me = lerp(w.motion.prev, w.motion.pos, alpha);
      g.strokeStyle = "rgba(255,215,106,0.18)"; g.lineWidth = 2; g.setLineDash([6, 10]);
      g.beginPath(); g.arc(me.x, me.y, 220, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
    for (const pk of w.pickups) {
      const p = lerp(pk.prev, pk.pos, alpha);
      const y = p.y + Math.sin(this.time * 4 + pk.pos.x) * 4;
      const col = ROLE_COLOR[ROLE[pk.defId] ?? "resource"];
      // Role-coloured ring + the pickup's own icon (BATCH_002); glyph fallback until art loads.
      g.fillStyle = "rgba(4,10,20,0.8)"; g.beginPath(); g.arc(p.x, y, 31, 0, Math.PI * 2); g.fill();
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, y, 31, 0, Math.PI * 2); g.stroke();
      const icon = sprite(`pickup_${pk.defId.toLowerCase()}`);
      if (icon) drawAt(g, icon, p.x, y, ...visCenter(icon), 52 / Math.max(visW(icon), visH(icon)));
      else {
        g.fillStyle = col; g.font = "700 20px RB Thai, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(PICKUP_GLYPH[pk.defId] ?? "?", p.x, y + 1); g.textBaseline = "alphabetic";
      }
      if (pk.life <= 5) {
        // Last 5 s: steady countdown ring (no blinking, safe for reduced-flash mode).
        g.strokeStyle = "#fff"; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x, y, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pk.life / 5)); g.stroke();
      }
    }
  }

  private drawHostile(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    for (const b of w.hostile.items) {
      if (!b.alive) continue;
      const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, b.r + 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = b.r >= 5 ? C.magenta : C.red; g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.fill();
    }
  }

  private drawSalvage(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    const ship = lerp(w.motion.prev, w.motion.pos, alpha);
    for (const it of w.items) {
      const loose = it.state === "detached_intact" || it.state === "owner_drop" || it.state === "acquiring";
      const towed = it.state === "towed";
      if (!loose && !towed) continue;
      const p = lerp(it.prev, it.pos, alpha);
      if (towed) {
        const len = Math.hypot(p.x - ship.x, p.y - ship.y);
        const col = len > CABLE_MAX ? C.red : len > CABLE_MAX * 0.8 ? C.orange : C.cyan;
        const sag = Math.max(0, 140 - len) * 0.4;
        g.strokeStyle = col; g.lineWidth = 3;
        g.beginPath(); g.moveTo(ship.x, ship.y + 16);
        g.quadraticCurveTo((ship.x + p.x) / 2 + sag * 0.3, (ship.y + p.y) / 2 + sag, p.x, p.y);
        g.stroke();
        const mote = sprite("fx_tractor_mote");
        const dir = Math.atan2(p.y - ship.y - 16, p.x - ship.x);
        for (let k = 0; k < 4; k++) {
          const t = (this.time * 1.6 + k / 4) % 1;
          const mx = ship.x + (p.x - ship.x) * t, my = ship.y + 16 + (p.y - ship.y - 16) * t;
          if (mote) drawAt(g, mote, mx, my, ...visCenter(mote), 20 / visW(mote), dir + Math.PI / 4, 0.9, false, true);
          else { g.fillStyle = "#bff6ff"; g.beginPath(); g.arc(mx, my, 2.5, 0, Math.PI * 2); g.fill(); }
        }
      }
      // part silhouette: boss tail art for the signature, the module's own art for owner drops
      // boss signatures use their boss part art; cargo modules and owner drops their module art
      const signature = it.sourceEncounter !== "player";
      const bossArt = sprite(`boss_${it.sourceEncounter}_signature_mount`);
      const art = bossArt ?? sprite(`weapon_${it.templateId}`);
      const rot = towed ? Math.atan2(ship.y - p.y, ship.x - p.x) + Math.PI / 2 + Math.PI : this.time * 0.8;
      if (art) {
        drawAt(g, art, p.x, p.y, ...visCenter(art), (bossArt ? 88 : 46) / visH(art), rot, 1, it.invuln > 0 && Math.sin(this.time * 20) > 0);
      } else {
        g.save(); g.translate(p.x, p.y); g.rotate(towed ? 0 : this.time * 0.8);
        g.fillStyle = signature ? C.graphite : C.charcoal;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, -14 + k * 14, 11 - k, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = signature ? C.violet : C.orange; g.beginPath(); g.arc(0, 18, 5, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // ownership bracket: cyan for intact signature, amber for neutral/owner drop
      const col = signature ? C.cyan : C.amber;
      const r = 30 + Math.sin(this.time * 6) * 2;
      g.strokeStyle = col; g.lineWidth = 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath(); g.moveTo(p.x + sx * r, p.y + sy * (r - 10)); g.lineTo(p.x + sx * r, p.y + sy * r); g.lineTo(p.x + sx * (r - 10), p.y + sy * r); g.stroke();
      }
      if (loose) {
        if (it.lifetime <= PICKUP_WARN_SEC) {
          g.fillStyle = C.red; g.font = "700 22px RB Thai, sans-serif"; g.textAlign = "center";
          g.fillText(String(Math.ceil(it.lifetime)), p.x, p.y - 40);
        }
        const d = Math.hypot(p.x - ship.x, p.y - ship.y);
        if (d < TRACTOR_RANGE * 1.6) {
          g.strokeStyle = d <= TRACTOR_RANGE ? "rgba(57,225,255,0.6)" : "rgba(57,225,255,0.2)";
          g.setLineDash([4, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(ship.x, ship.y - 30); g.lineTo(p.x, p.y); g.stroke(); g.setLineDash([]);
        }
        if (w.tow && w.tow.itemId === it.instanceId && !w.tow.towing) {
          g.strokeStyle = C.cyan; g.lineWidth = 5;
          g.beginPath(); g.arc(p.x, p.y, 40, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * w.tow.progress) / TRACTOR_DWELL); g.stroke();
          g.fillStyle = "rgba(57,225,255,0.15)"; g.beginPath(); g.moveTo(ship.x - 14, ship.y - 30); g.lineTo(p.x - 34, p.y); g.lineTo(p.x + 34, p.y); g.lineTo(ship.x + 14, ship.y - 30); g.fill();
        }
      }
    }
  }

  private drawPlayer(w: CombatWorld, alpha: number): void {
    const g = this.ctx;
    const m = w.motion;
    const p = lerp(m.prev, m.pos, alpha);
    const hullArt = sprite("hull_H01");
    if (hullArt) {
      this.drawPlayerSprites(w, p, hullArt);
    } else {
    if (m.dashing) for (let k = 1; k <= 3; k++) this.hull(p.x - m.dashDir.x * k * 16, p.y - m.dashDir.y * k * 16, `rgba(57,225,255,${0.25 - k * 0.06})`);
    const flame = 18 + Math.sin(this.time * 40) * 4 + (w.overdriveLeft > 0 ? 8 : 0);
    g.fillStyle = "rgba(57,225,255,0.85)";
    for (const ex of [-10, 10]) { g.beginPath(); g.moveTo(p.x + ex - 5, p.y + 34); g.lineTo(p.x + ex + 5, p.y + 34); g.lineTo(p.x + ex, p.y + 34 + flame); g.fill(); }
    this.hull(p.x, p.y, C.ivory);
    for (const mod of w.assembly.modules) {
      const mount = w.weapons.mounts.find((x) => x.module === mod);
      const heat = (mount?.heat ?? 0) / 100;
      for (const c of mod.cells) {
        const l = cellToLocal(c);
        g.fillStyle = MODULE_COLOR[mod.weapon.id] ?? C.charcoal;
        g.fillRect(p.x + l.x - 8, p.y + l.y - 9, 16, 18);
        if (heat > 0.3) { g.fillStyle = `rgba(255,138,31,${(heat - 0.3) * 0.9})`; g.fillRect(p.x + l.x - 8, p.y + l.y - 9, 16, 18); }
        g.strokeStyle = mount?.locked ? C.red : C.orange; g.lineWidth = 1.5; g.strokeRect(p.x + l.x - 8, p.y + l.y - 9, 16, 18);
      }
      if (mod.weapon.id === "W022") { g.fillStyle = C.cyan; g.beginPath(); g.arc(p.x + cellToLocal(mod.cells[0]).x, p.y + cellToLocal(mod.cells[0]).y + 6, 2.5, 0, Math.PI * 2); g.fill(); }
      if (mount?.blocked) { g.fillStyle = C.red; g.font = "700 14px sans-serif"; g.fillText("✕", p.x + cellToLocal(mod.cells[0]).x - 4, p.y + cellToLocal(mod.cells[0]).y - 14); }
    }
    }
    g.fillStyle = "rgba(57,225,255,0.35)"; g.beginPath(); g.arc(p.x, p.y, CORE_RADIUS, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.cyan; g.beginPath(); g.arc(p.x, p.y, 6, 0, Math.PI * 2); g.fill();
    if (w.playerInvulnerable && !w.opts.invulnerable) { g.strokeStyle = "rgba(57,225,255,0.9)"; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 48, 0, Math.PI * 2); g.stroke(); }
    if (w.overshield > 0) { g.strokeStyle = "rgba(255,215,106,0.7)"; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 60, 0, Math.PI * 2); g.stroke(); }
    if (w.shield > 0) { g.strokeStyle = `rgba(88,166,255,${0.15 + 0.35 * (w.shield / w.shieldMax)})`; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 54, 0, Math.PI * 2); g.stroke(); }
  }

  // Integrated SPARROW hull + engine glow (shared crop, so the glow stays on the nozzles)
  // and weapon module art fitted to each module's grid footprint.
  private drawPlayerSprites(w: CombatWorld, p: Vec, hullArt: NonNullable<ReturnType<typeof sprite>>): void {
    const g = this.ctx;
    const m = w.motion;
    const k = 100 / visW(hullArt);
    const [hx, hy] = visCenter(hullArt);
    const cy = p.y - 2;
    // Banking frames (BATCH_003) share the hull's crop, so they swap in place.
    const bank = m.vel.x < -110 ? sprite("hull_H01_lean_left") : m.vel.x > 110 ? sprite("hull_H01_lean_right") : null;
    const body = bank ?? hullArt;
    const lean = bank ? 0 : Math.max(-0.08, Math.min(0.08, m.vel.x / 3000));
    if (m.dashing) for (let i = 1; i <= 3; i++) drawAt(g, body, p.x - m.dashDir.x * i * 16, cy - m.dashDir.y * i * 16, hx, hy, k, lean, 0.22 - i * 0.05);
    const glow = sprite("hull_H01_engine_glow");
    if (glow) {
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 40) + (w.overdriveLeft > 0 ? 0.35 : 0);
      drawAt(g, glow, p.x, cy, hx, hy, k * (1 + (w.overdriveLeft > 0 ? 0.04 : 0)), lean, Math.min(1, pulse), false, true);
    }
    drawAt(g, body, p.x, cy, hx, hy, k, lean);
    const dmg = sprite("hull_H01_damage_overlay");
    const hurt = Math.max(0, Math.min(1, (0.75 - w.hp / w.hpMax) / 0.45));
    if (dmg && hurt > 0) drawAt(g, dmg, p.x, cy, hx, hy, k, lean, hurt);
    for (const mod of w.assembly.modules) {
      const mount = w.weapons.mounts.find((x) => x.module === mod);
      const art = sprite(`weapon_${mod.weapon.id}`);
      const xs = mod.cells.map((c) => cellToLocal(c).x), ys = mod.cells.map((c) => cellToLocal(c).y);
      const bx = (Math.min(...xs) + Math.max(...xs)) / 2, by = (Math.min(...ys) + Math.max(...ys)) / 2;
      const bw = Math.max(...xs) - Math.min(...xs) + 22, bh = Math.max(...ys) - Math.min(...ys) + 22;
      if (art) {
        const ka = Math.min((bw * 1.2) / visW(art), (bh * 1.15) / visH(art));
        drawAt(g, art, p.x + bx, p.y + by, ...visCenter(art), ka);
      } else {
        g.fillStyle = MODULE_COLOR[mod.weapon.id] ?? C.charcoal; g.fillRect(p.x + bx - bw / 2 + 3, p.y + by - bh / 2 + 2, bw - 6, bh - 4);
      }
      const heat = (mount?.heat ?? 0) / 100;
      if (heat > 0.35) {
        g.save(); g.globalCompositeOperation = "lighter";
        g.fillStyle = `rgba(255,120,30,${(heat - 0.35) * 0.9})`;
        g.beginPath(); g.arc(p.x + bx, p.y + by - bh / 2 + 4, 7, 0, Math.PI * 2); g.fill(); g.restore();
      }
      if (mount?.locked) { g.strokeStyle = C.red; g.lineWidth = 2; g.strokeRect(p.x + bx - bw / 2, p.y + by - bh / 2, bw, bh); }
      if (mount?.blocked) { g.fillStyle = C.red; g.font = "700 14px sans-serif"; g.fillText("✕", p.x + bx - 4, p.y + by - bh / 2 - 4); }
    }
  }

  private hull(x: number, y: number, color: string): void {
    const g = this.ctx;
    const pts = [[0, -62], [10, -30], [14, -6], [40, 14], [40, 24], [14, 22], [12, 36], [-12, 36], [-14, 22], [-40, 24], [-40, 14], [-14, -6], [-10, -30]];
    g.fillStyle = color;
    g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(x + px, y + py) : g.moveTo(x + px, y + py))); g.closePath(); g.fill();
    if (color === C.ivory) {
      g.strokeStyle = C.charcoal; g.lineWidth = 2; g.stroke();
      g.strokeStyle = C.orange; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x - 40, y + 19); g.lineTo(x - 26, y + 17); g.moveTo(x + 40, y + 19); g.lineTo(x + 26, y + 17); g.stroke();
      g.fillStyle = "#1e88a8"; g.beginPath(); g.ellipse(x, y - 30, 5, 12, 0, 0, Math.PI * 2); g.fill();
    }
  }

  private drawLock(w: CombatWorld, alpha: number): void {
    const lp = w.lockedPart();
    if (!lp) return;
    const g = this.ctx;
    const base = this.pos(lp.enemy, alpha);
    const c = partWorldPos(lp.part, base);
    const live = lp.part.selectable;
    const r = (lp.part.kind === "joint" ? 30 : lp.part.kind === "core" ? 46 : 36) + Math.sin(this.time * 6) * 3;
    g.strokeStyle = live ? (lp.part.kind === "joint" ? C.gold : C.cyan) : "rgba(138,164,179,0.6)";
    g.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const a0 = (k * Math.PI) / 2 + this.time; g.beginPath(); g.arc(c.x, c.y, r, a0, a0 + 0.9); g.stroke(); }
    const tracking = w.weapons.mounts.some((m) => w.aimAngle(m).tracking);
    if (live && !tracking) {
      // Target outside the firing arc: arrow from the ship toward it.
      const ship = lerp(w.motion.prev, w.motion.pos, alpha);
      const a = Math.atan2(c.y - ship.y, c.x - ship.x);
      g.fillStyle = C.gold; g.save(); g.translate(ship.x + Math.cos(a) * 80, ship.y + Math.sin(a) * 80); g.rotate(a);
      g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -9); g.lineTo(-8, 9); g.fill(); g.restore();
    }
  }

  // Weak joint: broken-ring target icon (colour is never the only cue).
  private jointIcon(x: number, y: number, r: number, flash: boolean, pulse = false): void {
    const g = this.ctx;
    const k = pulse ? 1 + Math.sin(this.time * 10) * 0.12 : 1;
    g.fillStyle = flash ? "#fff" : "rgba(255,176,32,0.35)"; g.beginPath(); g.arc(x, y, r * k, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.amber; g.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3 + this.time * 2; g.beginPath(); g.arc(x, y, r * k + 4, a, a + 1.4); g.stroke(); }
  }

  // Armour: closed shield icon.
  private shieldIcon(x: number, y: number, s: number): void {
    const g = this.ctx;
    g.fillStyle = "rgba(232,243,248,0.55)";
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y - s * 0.5); g.lineTo(x + s * 0.7, y + s * 0.6); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y + s * 0.6); g.lineTo(x - s, y - s * 0.5); g.closePath(); g.fill();
  }

  private hpBar(x: number, y: number, w: number, frac: number, color: string = C.red): void {
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x, y, w, 5);
    g.fillStyle = color; g.fillRect(x, y, w * Math.max(0, frac), 5);
  }
}

export type { Part };
