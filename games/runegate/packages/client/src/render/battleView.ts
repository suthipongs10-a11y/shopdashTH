/** เชื่อม sim → ภาพ: billboard sprite 8 ทิศ, หลอดเลือด, ตัวเลขดาเมจ, เอฟเฟกต์สกิล */
import * as THREE from 'three';
import { isEnemy, isHero, type Battle, type BattleEvent, type Unit } from '@runegate/sim';
import type { SpriteRecipe } from '@runegate/data';
import { ATLAS_MANIFEST, directionToFrame, getAtlas, spriteHeadFraction, type AnimName, type SpriteAtlas } from './sprites.js';
import type { StageScene } from './scene.js';

const SPRITE_H = 2.0;
const SPRITE_W = (SPRITE_H * ATLAS_MANIFEST.frameW) / ATLAS_MANIFEST.frameH;
const MAX_FLOATERS = 18;

interface UnitView {
  uid: number;
  /** ความสูงของหัวยูนิตในหน่วยโลก (ใช้วางหลอดเลือด) */
  headY: number;
  sprite: THREE.Sprite;
  tex: THREE.Texture;
  atlas: SpriteAtlas;
  anim: AnimName;
  frameIndex: number;
  frameTime: number;
  angle: number;
  attackUntil: number;
  lastX: number;
  lastY: number;
  dying: boolean;
  bar: HTMLDivElement;
  barFill: HTMLDivElement;
  /** ป้ายชื่อ — มีเฉพาะมินิบอสและ MVP */
  plate: HTMLDivElement | null;
  flash: number;
}

/** สีและขนาดของกระสุนแต่ละแบบ */
const SHOT_STYLE: Record<string, { color: number; size: number }> = {
  rock: { color: 0xa89478, size: 0.19 },
  bullet: { color: 0xbdf0ff, size: 0.11 },
  shell: { color: 0xffb066, size: 0.15 },
  beam: { color: 0xe8fbff, size: 0.13 },
  flame: { color: 0xff8a3c, size: 0.18 },
  bomb: { color: 0x6b5f7d, size: 0.2 },
  shard: { color: 0xffd98a, size: 0.13 },
};

const VFX_COLOR: Record<string, number> = {
  none: 0xffffff,
  slash: 0xfff0c0,
  arrow: 0xa8e6ff,
  nova: 0xff9c4a,
  heal: 0x8bffb0,
  buff: 0xffd766,
  coin: 0xffd23f,
  shadow: 0xc07bff,
};

export class BattleView {
  private views = new Map<number, UnitView>();
  private vfx: { mesh: THREE.Mesh; t: number; life: number; radius: number }[] = [];
  /** กระสุนที่กำลังลอย — sync จาก battle.projectiles ทุกเฟรม */
  private shots = new Map<number, THREE.Mesh>();
  private shotGeo = new THREE.SphereGeometry(1, 8, 6);
  private shotMats = new Map<string, THREE.MeshBasicMaterial>();
  private floaters: { el: HTMLDivElement; t: number; x: number; y: number; z: number }[] = [];
  private tmp = new THREE.Vector3();
  private clock = 0;

  constructor(
    private readonly scene: StageScene,
    private readonly battle: Battle,
    private readonly overlay: HTMLElement,
  ) {}

  private recipeOf(u: Unit): SpriteRecipe {
    return u.def.sprite;
  }

  private ensureView(u: Unit): UnitView {
    const hit = this.views.get(u.uid);
    if (hit) return hit;

    const atlas = getAtlas(this.recipeOf(u), isEnemy(u) ? u.enemyId : u.heroId);
    const tex = atlas.texture.clone();
    tex.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, alphaTest: 0.04 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(SPRITE_W, SPRITE_H, 1);
    sprite.center.set(0.5, 0.06);
    this.scene.root.add(sprite);

    const tier = isEnemy(u) ? u.def.tier : 'normal';
    const bar = document.createElement('div');
    bar.className = `hpbar ${u.faction}${tier === 'normal' ? '' : ` ${tier}`}`;
    const barFill = document.createElement('div');
    bar.appendChild(barFill);
    this.overlay.appendChild(bar);

    let plate: HTMLDivElement | null = null;
    if (tier !== 'normal') {
      plate = document.createElement('div');
      plate.className = `nameplate ${tier}`;
      plate.textContent = tier === 'mvp' ? `☠ ${u.name}` : u.name;
      this.overlay.appendChild(plate);
    }

    const view: UnitView = {
      uid: u.uid,
      headY: SPRITE_H * spriteHeadFraction(this.recipeOf(u)),
      sprite,
      tex,
      atlas,
      anim: 'idle',
      frameIndex: 0,
      frameTime: 0,
      angle: isHero(u) ? u.facing : Math.PI,
      attackUntil: 0,
      lastX: u.x,
      lastY: u.y,
      dying: false,
      bar,
      barFill,
      plate,
      flash: 0,
    };
    this.views.set(u.uid, view);
    return view;
  }

  handleEvents(events: BattleEvent[]): void {
    for (const e of events) {
      switch (e.t) {
        case 'hit': {
          const from = this.views.get(e.from);
          if (from) from.attackUntil = this.clock + 0.32;
          const target = this.battle.unit(e.to);
          const tv = this.views.get(e.to);
          if (tv) tv.flash = 0.16;
          if (target) {
            this.spawnFloater(
              `${e.amount}${e.crit ? '!' : ''}`,
              target.x,
              this.spriteY(target) + (this.views.get(e.to)?.headY ?? 1.2) + 0.2,
              target.y,
              e.crit ? 'crit' : target.faction === 'hero' ? 'dmg-hero' : e.matchup === 'advantage' ? 'dmg-adv' : 'dmg',
            );
          }
          break;
        }
        case 'heal': {
          const t = this.battle.unit(e.to);
          if (t) this.spawnFloater(`+${e.amount}`, t.x, this.spriteY(t) + (this.views.get(e.to)?.headY ?? 1.2) + 0.2, t.y, 'heal');
          break;
        }
        case 'skill':
          this.spawnVfx(e.x, e.y, Math.max(e.radius, 0.8), VFX_COLOR[e.vfx] ?? 0xffffff);
          break;
        case 'boom':
          this.spawnVfx(e.x, e.y, e.radius, SHOT_STYLE[e.vfx]?.color ?? 0xffb066);
          break;
        case 'leak':
          document.body.classList.add('flash-danger');
          setTimeout(() => document.body.classList.remove('flash-danger'), 260);
          break;
        default:
          break;
      }
    }
  }

  private spriteY(u: Unit): number {
    return this.scene.tileHeight(Math.floor(u.x), Math.floor(u.y));
  }

  private spawnFloater(text: string, x: number, y: number, z: number, cls: string): void {
    if (this.floaters.length >= MAX_FLOATERS) {
      const old = this.floaters.shift();
      old?.el.remove();
    }
    const el = document.createElement('div');
    el.className = `floater ${cls}`;
    el.textContent = text;
    this.overlay.appendChild(el);
    this.floaters.push({ el, t: 0, x, y, z });
  }

  private spawnVfx(x: number, y: number, radius: number, color: number): void {
    const geo = new THREE.RingGeometry(0.2, 0.32, 28);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, this.scene.tileHeight(Math.floor(x), Math.floor(y)) + 0.12, y);
    this.scene.root.add(mesh);
    this.vfx.push({ mesh, t: 0, life: 0.45, radius });
  }

  update(dt: number): void {
    this.clock += dt;
    const seen = new Set<number>();

    for (const u of this.battle.units) {
      seen.add(u.uid);
      const v = this.ensureView(u);
      const height = this.spriteY(u);
      v.sprite.position.set(u.x, height, u.y);

      // ทิศทาง
      if (isEnemy(u)) {
        const track = this.battle.paths.get(u.pathId);
        if (track) {
          const hd = track.headingAt(u.dist);
          v.angle = Math.atan2(-hd.y, hd.x);
        }
      } else {
        const target = u.targetUid !== null ? this.battle.unit(u.targetUid) : null;
        if (target) v.angle = Math.atan2(-(target.y - u.y), target.x - u.x);
        else v.angle = u.facing;
      }

      // แอนิเมชั่น
      const moving = isEnemy(u) && Math.hypot(u.x - v.lastX, u.y - v.lastY) > 0.0015;
      const nextAnim: AnimName = this.clock < v.attackUntil ? 'attack' : moving ? 'walk' : 'idle';
      if (nextAnim !== v.anim) {
        v.anim = nextAnim;
        v.frameIndex = 0;
        v.frameTime = 0;
      }
      v.lastX = u.x;
      v.lastY = u.y;

      this.advanceFrame(v, dt);
      this.applyFrame(v);

      // สี: กระพริบเมื่อโดนตี / ซีดเมื่อโดนสตันหรือช้า
      const mat = v.sprite.material;
      if (v.flash > 0) {
        v.flash -= dt;
        mat.color.setRGB(1.6, 0.75, 0.75);
      } else if (u.statuses.some((s) => s.kind === 'stun')) {
        mat.color.setRGB(1.2, 1.2, 0.6);
      } else if (u.statuses.some((s) => s.kind === 'slow')) {
        mat.color.setRGB(0.75, 0.9, 1.3);
      } else {
        mat.color.setRGB(1, 1, 1);
      }
      mat.opacity = isEnemy(u) && u.traits.includes('stealth') && !this.battle.isRevealed(u) ? 0.42 : 1;

      // หลอดเลือด
      const ratio = Math.max(0, u.hp / u.maxHp);
      this.tmp.copy(this.scene.project(u.x, height + v.headY + 0.14, u.y));
      const visible = this.tmp.z < 1 && (ratio < 1 || u.faction === 'enemy');
      v.bar.style.display = visible ? 'block' : 'none';
      if (v.plate) v.plate.style.display = visible ? 'block' : 'none';
      if (visible) {
        v.bar.style.transform = `translate(${this.tmp.x}px, ${this.tmp.y}px)`;
        if (v.plate) v.plate.style.transform = `translate(${this.tmp.x}px, ${this.tmp.y}px)`;
        v.barFill.style.width = `${ratio * 100}%`;
        const shield = u.statuses.find((s) => s.kind === 'shield');
        v.bar.classList.toggle('shielded', !!shield && shield.value > 0);
      }
    }

    // ยูนิตที่หายไปจากสนาม → เล่นท่าตายแล้วเก็บทิ้ง
    for (const [uid, v] of [...this.views]) {
      if (seen.has(uid)) continue;
      if (!v.dying) {
        v.dying = true;
        v.anim = 'death';
        v.frameIndex = 0;
        v.frameTime = 0;
        v.bar.style.display = 'none';
        if (v.plate) v.plate.style.display = 'none';
      }
      v.frameTime += dt;
      const clip = v.atlas.anims.death;
      v.frameIndex = Math.min(clip.frames - 1, Math.floor(v.frameTime * clip.fps));
      this.applyFrame(v);
      v.sprite.material.opacity = Math.max(0, 1 - v.frameTime * 2.2);
      if (v.frameTime > 0.55) {
        this.scene.root.remove(v.sprite);
        v.sprite.material.dispose();
        v.tex.dispose();
        v.bar.remove();
        v.plate?.remove();
        this.views.delete(uid);
      }
    }

    this.updateShots();
    this.updateVfx(dt);
    this.updateFloaters(dt);
  }

  /** ซิงก์กระสุนจาก sim → mesh (สร้าง/ย้าย/เก็บทิ้ง) */
  private updateShots(): void {
    const live = new Set<number>();
    for (const p of this.battle.projectiles) {
      live.add(p.id);
      let mesh = this.shots.get(p.id);
      const style = SHOT_STYLE[p.vfx] ?? SHOT_STYLE.bullet!;
      if (!mesh) {
        let mat = this.shotMats.get(p.vfx);
        if (!mat) {
          mat = new THREE.MeshBasicMaterial({ color: style.color });
          this.shotMats.set(p.vfx, mat);
        }
        mesh = new THREE.Mesh(this.shotGeo, mat);
        this.scene.root.add(mesh);
        this.shots.set(p.id, mesh);
      }
      const ground = this.scene.tileHeight(Math.floor(p.x), Math.floor(p.y));
      // วิถีโค้งยกสูงกลางทาง ให้เห็นว่าเป็นการเหวี่ยงข้ามหัว
      let arc = 0;
      if (p.lob) {
        const total = Math.hypot(p.targetX - p.x, p.targetY - p.y) + 0.001;
        arc = Math.min(1.4, total * 0.45);
      }
      mesh.position.set(p.x, ground + 0.75 + arc, p.y);
      const scale = p.vfx === 'beam' ? style.size : style.size;
      mesh.scale.set(scale, scale, scale);
      if (p.vfx === 'beam') {
        const len = 0.5;
        mesh.scale.set(len, style.size * 0.8, style.size * 0.8);
        mesh.rotation.set(0, -Math.atan2(p.vy, p.vx), 0);
      }
    }
    for (const [id, mesh] of [...this.shots]) {
      if (live.has(id)) continue;
      this.scene.root.remove(mesh);
      this.shots.delete(id);
    }
  }

  private advanceFrame(v: UnitView, dt: number): void {
    const clip = v.atlas.anims[v.anim];
    v.frameTime += dt;
    const step = 1 / clip.fps;
    while (v.frameTime >= step) {
      v.frameTime -= step;
      v.frameIndex = clip.loop ? (v.frameIndex + 1) % clip.frames : Math.min(clip.frames - 1, v.frameIndex + 1);
    }
  }

  private applyFrame(v: UnitView): void {
    const clip = v.atlas.anims[v.anim];
    const { row, mirror } = directionToFrame(v.angle);
    const col = clip.start + v.frameIndex;
    const w = 1 / v.atlas.cols;
    const h = 1 / v.atlas.rows;
    v.tex.repeat.set(mirror ? -w : w, h);
    v.tex.offset.set(mirror ? (col + 1) * w : col * w, 1 - (row + 1) * h);
  }

  private updateVfx(dt: number): void {
    for (let i = this.vfx.length - 1; i >= 0; i--) {
      const fx = this.vfx[i]!;
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.life);
      const s = 0.4 + k * fx.radius * 2.2;
      fx.mesh.scale.set(s, s, s);
      (fx.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (k >= 1) {
        this.scene.root.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        (fx.mesh.material as THREE.Material).dispose();
        this.vfx.splice(i, 1);
      }
    }
  }

  private updateFloaters(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.t += dt;
      if (f.t > 0.85) {
        f.el.remove();
        this.floaters.splice(i, 1);
        continue;
      }
      this.tmp.copy(this.scene.project(f.x, f.y + f.t * 1.1, f.z));
      f.el.style.transform = `translate(${this.tmp.x}px, ${this.tmp.y}px)`;
      f.el.style.opacity = String(1 - f.t / 0.85);
    }
  }

  dispose(): void {
    for (const v of this.views.values()) {
      this.scene.root.remove(v.sprite);
      v.sprite.material.dispose();
      v.tex.dispose();
      v.bar.remove();
      v.plate?.remove();
    }
    this.views.clear();
    for (const f of this.floaters) f.el.remove();
    this.floaters = [];
    for (const fx of this.vfx) this.scene.root.remove(fx.mesh);
    this.vfx = [];
    for (const mesh of this.shots.values()) this.scene.root.remove(mesh);
    this.shots.clear();
    this.shotGeo.dispose();
    for (const m of this.shotMats.values()) m.dispose();
    this.shotMats.clear();
  }
}
