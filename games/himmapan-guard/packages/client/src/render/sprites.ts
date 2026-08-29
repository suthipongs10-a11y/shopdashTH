/**
 * Sprite Factory (Phase 2 — placeholder) §12
 * วาด sprite แบบ procedural ลง canvas แล้วแพ็คเป็น texture atlas เดียวต่อยูนิต
 * รูปแบบ manifest ตรงกับที่ Phase 3 (โรงงาน sprite จริง) จะ export ออกมา
 * จึงสลับไปใช้ atlas PNG จริงได้โดยไม่ต้องแก้โค้ดฝั่ง render
 */
import * as THREE from 'three';
import type { SpriteRecipe } from '@himmapan/data';

export type AnimName = 'idle' | 'walk' | 'attack' | 'death';

export interface AnimClip {
  /** คอลัมน์เริ่มต้นใน atlas */
  start: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface AtlasManifest {
  frameW: number;
  frameH: number;
  cols: number;
  /** จำนวนทิศที่วาดจริง (ที่เหลือใช้วิธี mirror — สูตรเดียวกับ RO §12.2) */
  rows: number;
  anims: Record<AnimName, AnimClip>;
}

export interface SpriteAtlas extends AtlasManifest {
  texture: THREE.Texture;
}

export const ATLAS_MANIFEST: AtlasManifest = {
  frameW: 96,
  frameH: 128,
  cols: 12,
  rows: 5,
  anims: {
    idle: { start: 0, frames: 2, fps: 3, loop: true },
    walk: { start: 2, frames: 4, fps: 8, loop: true },
    attack: { start: 6, frames: 3, fps: 11, loop: false },
    death: { start: 9, frames: 3, fps: 7, loop: false },
  },
};

/** ทิศที่วาดจริง 5 ทิศ: 0=หน้า 1=หน้าเฉียง 2=ข้าง 3=หลังเฉียง 4=หลัง */
export const DRAWN_DIRECTIONS = 5;

/** แปลงมุม (เรเดียน, 0 = +X) เป็น { row, mirror } สำหรับ 8 ทิศ */
export function directionToFrame(angle: number): { row: number; mirror: boolean } {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  // 8 ทิศ: 0=E 45=NE 90=N 135=NW 180=W 225=SW 270=S 315=SE
  const oct = Math.round(deg / 45) % 8;
  switch (oct) {
    case 0:
      return { row: 2, mirror: false }; // E
    case 1:
      return { row: 3, mirror: false }; // NE
    case 2:
      return { row: 4, mirror: false }; // N
    case 3:
      return { row: 3, mirror: true }; // NW
    case 4:
      return { row: 2, mirror: true }; // W
    case 5:
      return { row: 1, mirror: true }; // SW
    case 6:
      return { row: 0, mirror: false }; // S
    default:
      return { row: 1, mirror: false }; // SE
  }
}

const OUTLINE = '#181222';

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  fillStroke(ctx, fill);
}

interface Pose {
  legSwing: number;
  armSwing: number;
  bob: number;
  lean: number;
  dying: number; // 0..1
}

function poseFor(anim: AnimName, frame: number): Pose {
  switch (anim) {
    case 'idle':
      return { legSwing: 0, armSwing: 0, bob: frame === 0 ? 0 : -2, lean: 0, dying: 0 };
    case 'walk': {
      const s = [0, 1, 0, -1][frame] ?? 0;
      return { legSwing: s * 6, armSwing: -s * 5, bob: frame % 2 === 0 ? 0 : -2, lean: 0, dying: 0 };
    }
    case 'attack': {
      const a = [-8, 16, 6][frame] ?? 0;
      return { legSwing: 2, armSwing: a, bob: 0, lean: a * 0.15, dying: 0 };
    }
    case 'death':
      return { legSwing: 0, armSwing: 0, bob: 2 * frame, lean: 0, dying: (frame + 1) / 3 };
  }
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: SpriteRecipe['weapon'],
  accent: string,
  hx: number,
  hy: number,
  swing: number,
): void {
  if (weapon === 'none') return;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate((swing * Math.PI) / 90);
  switch (weapon) {
    case 'sword':
      roundRect(ctx, -2.5, -30, 5, 32, 2);
      fillStroke(ctx, '#dfe6ee');
      roundRect(ctx, -7, -2, 14, 4, 2);
      fillStroke(ctx, accent);
      break;
    case 'dagger':
      roundRect(ctx, -2, -17, 4, 19, 2);
      fillStroke(ctx, '#cfd8e3');
      break;
    case 'spear':
      roundRect(ctx, -2, -38, 4, 44, 2);
      fillStroke(ctx, '#8a6a45');
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(5, -34);
      ctx.lineTo(-5, -34);
      ctx.closePath();
      fillStroke(ctx, '#dfe6ee');
      break;
    case 'hammer':
      roundRect(ctx, -2.5, -30, 5, 34, 2);
      fillStroke(ctx, '#8a6a45');
      roundRect(ctx, -11, -38, 22, 14, 3);
      fillStroke(ctx, accent);
      break;
    case 'staff':
      roundRect(ctx, -2.5, -34, 5, 40, 2);
      fillStroke(ctx, '#8a6a45');
      ellipse(ctx, 0, -38, 7, 7, accent);
      break;
    case 'bow':
      ctx.beginPath();
      ctx.arc(0, -12, 17, -Math.PI * 0.62, Math.PI * 0.62);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -29);
      ctx.lineTo(0, 5);
      ctx.strokeStyle = '#efeadd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'claw':
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, 0);
        ctx.lineTo(i * 7, -14);
        ctx.strokeStyle = '#e6e9ef';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, dir: number, cx: number, cy: number, r: number): void {
  if (dir >= 3) return; // หันหลัง — ไม่มีหน้า
  const shift = dir === 2 ? r * 0.42 : dir === 1 ? r * 0.22 : 0;
  ctx.fillStyle = OUTLINE;
  if (dir < 2) {
    ctx.fillRect(cx - r * 0.42 + shift, cy - 1, 2.5, 3);
  }
  ctx.fillRect(cx + r * 0.2 + shift, cy - 1, 2.5, 3);
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  recipe: SpriteRecipe,
  dir: number,
  anim: AnimName,
  frame: number,
  w: number,
  h: number,
): void {
  const pose = poseFor(anim, frame);
  const { main, accent, skin } = recipe.palette;
  const cx = w / 2;
  const groundY = h - 8;
  const s = recipe.scale;

  ctx.save();
  if (pose.dying > 0) {
    ctx.globalAlpha = 1 - pose.dying * 0.75;
    ctx.translate(cx, groundY);
    ctx.rotate((pose.dying * Math.PI) / 2.6);
    ctx.translate(-cx, -groundY);
  }
  ctx.translate(0, pose.bob);

  // เงาใต้ตัว
  ctx.globalAlpha *= 0.35;
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 2, 15 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalAlpha /= 0.35;

  const body = recipe.body;
  const handX = cx + (dir === 4 ? -1 : 1) * 15 * s;

  if (body === 'beast' || body === 'insect') {
    const bodyY = groundY - 20 * s;
    // ขา
    for (let i = 0; i < (body === 'insect' ? 3 : 2); i++) {
      const off = (i - 1) * 9 * s;
      ctx.beginPath();
      ctx.moveTo(cx + off, bodyY + 6 * s);
      ctx.lineTo(cx + off + pose.legSwing * 0.4, groundY);
      ctx.strokeStyle = shade(main, -50);
      ctx.lineWidth = 3.5 * s;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - off, bodyY + 6 * s);
      ctx.lineTo(cx - off - pose.legSwing * 0.4, groundY);
      ctx.stroke();
    }
    ellipse(ctx, cx, bodyY, 20 * s, 13 * s, main);
    const headX = cx + (dir === 4 ? -14 : 14) * s * (dir === 0 ? 0 : 1);
    const headY = bodyY - (dir === 0 ? 16 : 8) * s;
    ellipse(ctx, headX, headY, 11 * s, 10 * s, skin);
    // หู / หนวด
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(headX + sx * 5 * s, headY - 8 * s);
      ctx.lineTo(headX + sx * (body === 'insect' ? 11 : 8) * s, headY - (body === 'insect' ? 20 : 15) * s);
      ctx.stroke();
    }
    drawFace(ctx, dir, headX, headY, 10 * s);
    // หาง
    ctx.beginPath();
    ctx.moveTo(cx - 19 * s, bodyY - 2 * s);
    ctx.quadraticCurveTo(cx - 30 * s, bodyY - 12 * s, cx - 26 * s, bodyY - 20 * s);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4 * s;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (body === 'floating' || body === 'spirit') {
    const bodyY = groundY - 30 * s;
    if (body === 'spirit') ctx.globalAlpha *= 0.9;
    // หางวิญญาณ
    ctx.beginPath();
    ctx.moveTo(cx - 12 * s, bodyY + 6 * s);
    ctx.quadraticCurveTo(cx, groundY + 4, cx + 12 * s, bodyY + 6 * s);
    fillStroke(ctx, shade(main, -25));
    ellipse(ctx, cx, bodyY, 15 * s, 17 * s, main);
    ellipse(ctx, cx, bodyY - 20 * s, 11 * s, 10 * s, skin);
    drawFace(ctx, dir, cx, bodyY - 20 * s, 10 * s);
    // ปีก/รัศมี
    ctx.beginPath();
    ctx.ellipse(cx, bodyY - 4 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha *= 0.75;
    ctx.stroke();
    ctx.globalAlpha /= 0.75;
    drawWeapon(ctx, recipe.weapon, accent, handX, bodyY + 2 * s, pose.armSwing);
    ctx.restore();
    return;
  }

  // humanoid / hulk
  const hulk = body === 'hulk';
  const bodyW = (hulk ? 34 : 26) * s;
  const bodyH = (hulk ? 30 : 26) * s;
  const legH = (hulk ? 14 : 18) * s;
  const bodyTop = groundY - legH - bodyH;

  // ขา
  for (const sx of [-1, 1]) {
    const off = sx * (bodyW * 0.26) + sx * pose.legSwing * 0.5;
    roundRect(ctx, cx + off - 4 * s, groundY - legH, 8 * s, legH, 2);
    fillStroke(ctx, shade(accent, -20));
  }
  // ลำตัว
  roundRect(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, 5);
  fillStroke(ctx, main);
  // ผ้าคาดเอว
  ctx.fillStyle = accent;
  ctx.fillRect(cx - bodyW / 2 + 1, bodyTop + bodyH - 7 * s, bodyW - 2, 4 * s);
  // แขน
  for (const sx of [-1, 1]) {
    const swing = sx > 0 ? pose.armSwing : -pose.armSwing * 0.4;
    ctx.save();
    ctx.translate(cx + sx * (bodyW / 2 + 1), bodyTop + 6 * s);
    ctx.rotate((swing * Math.PI) / 180);
    roundRect(ctx, -3.5 * s, 0, 7 * s, (hulk ? 22 : 19) * s, 3);
    fillStroke(ctx, skin);
    ctx.restore();
  }
  // หัว
  const headR = (hulk ? 10 : 11) * s;
  const headY = bodyTop - headR - 1;
  ellipse(ctx, cx + pose.lean, headY, headR, headR, skin);
  // ผม/หมวก
  ctx.beginPath();
  ctx.arc(cx + pose.lean, headY, headR + 1, Math.PI * 1.05, Math.PI * 1.95);
  ctx.lineTo(cx + pose.lean + headR, headY - 2);
  ctx.closePath();
  fillStroke(ctx, accent);
  drawFace(ctx, dir, cx + pose.lean, headY, headR);
  drawWeapon(ctx, recipe.weapon, accent, handX, bodyTop + 20 * s, pose.armSwing);
  ctx.restore();
}

/**
 * ความสูงของตัวละครที่วาดจริงในเฟรม (สัดส่วน 0..1 ของ frameH)
 * ใช้วางหลอดเลือด/ตัวเลขดาเมจให้อยู่เหนือหัวพอดีทุกชนิดร่าง
 */
const BODY_HEIGHT_PX: Record<SpriteRecipe['body'], number> = {
  humanoid: 67,
  hulk: 65,
  beast: 46,
  insect: 46,
  floating: 60,
  spirit: 60,
};

export function spriteHeadFraction(recipe: SpriteRecipe): number {
  return (BODY_HEIGHT_PX[recipe.body] * recipe.scale) / ATLAS_MANIFEST.frameH;
}

const atlasCache = new Map<string, SpriteAtlas>();

function recipeKey(r: SpriteRecipe): string {
  return `${r.body}|${r.weapon}|${r.palette.main}|${r.palette.accent}|${r.palette.skin}|${r.scale}`;
}

/** สร้าง texture atlas ของยูนิตหนึ่งตัว (แคชตามสูตร) */
export function getAtlas(recipe: SpriteRecipe): SpriteAtlas {
  const key = recipeKey(recipe);
  const hit = atlasCache.get(key);
  if (hit) return hit;

  const { frameW, frameH, cols, rows, anims } = ATLAS_MANIFEST;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * cols;
  canvas.height = frameH * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let dir = 0; dir < rows; dir++) {
    for (const [name, clip] of Object.entries(anims) as [AnimName, AnimClip][]) {
      for (let f = 0; f < clip.frames; f++) {
        ctx.save();
        ctx.translate((clip.start + f) * frameW, dir * frameH);
        ctx.beginPath();
        ctx.rect(0, 0, frameW, frameH);
        ctx.clip();
        drawUnit(ctx, recipe, dir, name, f, frameW, frameH);
        ctx.restore();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  const atlas: SpriteAtlas = { texture, frameW, frameH, cols, rows, anims };
  atlasCache.set(key, atlas);
  return atlas;
}

/**
 * โหลด atlas จริงจากไฟล์ PNG + manifest JSON (Phase 3 จะใช้เส้นทางนี้)
 * รูปแบบไฟล์: { frameW, frameH, cols, rows, anims } เหมือน ATLAS_MANIFEST
 */
export async function loadAtlas(pngUrl: string, manifestUrl: string): Promise<SpriteAtlas> {
  const [manifest, texture] = await Promise.all([
    fetch(manifestUrl).then((r) => r.json() as Promise<AtlasManifest>),
    new THREE.TextureLoader().loadAsync(pngUrl),
  ]);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { ...manifest, texture };
}

/** รูปเล็กสำหรับการ์ดฮีโร่ใน UI */
export function portraitDataUrl(recipe: SpriteRecipe, size = 96): string {
  const { frameW, frameH } = ATLAS_MANIFEST;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const scale = size / frameH;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate((frameH - frameW) / 2, 0);
  drawUnit(ctx, recipe, 0, 'idle', 0, frameW, frameH);
  ctx.restore();
  return c.toDataURL();
}
