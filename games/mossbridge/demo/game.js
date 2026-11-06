/* Mossbridge demo — one hero, one town map, sproutling slimes and the Mossback Boar.
 *
 * Rendering: PixiJS 7. The hero is a cutout rig (rig.js + rigs/kaelrin.json): pieces cut from
 * the painted headless body, each a mesh skinned to bones, legs on 2-bone IK with feet planted
 * in the world, a head mesh on the neck (headgear will sit on it) and the weapon in the right
 * fist. Monsters are still ONE painted image per view, animated by deforming a mesh
 * (SimplePlane) every frame. Both keep the AI-painted art perfectly consistent.
 *
 * Coordinates: world = pixels of the map painting (1672 x 941). Actors use a fake
 * perspective scale (smaller near the top of the painting) to match the art.
 */
(async () => {
"use strict";

const A = "assets/";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = t => 1 - (1 - t) ** 3;
const easeIn = t => t * t * t;
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = n => Math.max(0, Math.round(n)).toLocaleString("en-US");

/* ------------------------------------------------------------------ app */
PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;
PIXI.BaseTexture.defaultOptions.anisotropicLevel = 4;
const stageEl = document.getElementById("stage");
const app = new PIXI.Application({
  resizeTo: stageEl, backgroundColor: 0x1b2a1c, antialias: true,
  autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2),
});
stageEl.appendChild(app.view);

// fonts first, so in-canvas text (names, damage numbers) uses Mitr instead of a fallback
await Promise.race([Promise.all([document.fonts.load('500 15px Mitr'), document.fonts.load('600 24px Mitr')]).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
PIXI.Assets.setPreferences({ preferWorkers: false });
const man = await (await fetch(A + "manifest.json")).json();
const RIG = await (await fetch("rigs/kaelrin.json")).json();   // hero skeleton + cut pieces (rig.js)
const urls = [A + man.map.file];
for (const v of Object.values(RIG.views)) urls.push(A + v.atlas, A + v.head.file, A + v.weapon.file);
for (const m of Object.values(man.mobs)) urls.push(A + m.file);
for (const f of Object.values(man.fx || {})) urls.push(A + f.file);
const T = await PIXI.Assets.load([...new Set(urls)]);
const tex = f => T[A + f];
/* effect frames from the ChatGPT sheets (tools/build_fx_assets.py); black = transparent with ADD */
const FXF = {};
for (const [k, f] of Object.entries(man.fx || {})) {
  const base = tex(f.file).baseTexture, n = f.frames || 1, w = f.size[0], h = f.size[1];
  FXF[k] = { ...f, tex: Array.from({ length: n }, (_, i) => new PIXI.Texture(base, new PIXI.Rectangle(i * w, 0, w, h))) };
}

const MAP_W = man.map.size[0], MAP_H = man.map.size[1];
const world = new PIXI.Container();
app.stage.addChild(world);
const ground = new PIXI.Sprite(tex(man.map.file));
const groundFx = new PIXI.Container();          // telegraphs, rings (under actors)
const actorLayer = new PIXI.Container(); actorLayer.sortableChildren = true;
const fxLayer = new PIXI.Container();            // additive effects (above actors)
const ambLayer = new PIXI.Container();
const textLayer = new PIXI.Container();
world.addChild(ground, groundFx, actorLayer, fxLayer, ambLayer, textLayer);

/* fake perspective: the painting shrinks things toward the top */
const depthScale = y => clamp(0.58 * (0.45 + 0.55 * y / 700), 0.33, 0.72);

/* ------------------------------------------------------------------ walkable areas (map pixels) */
const WALK = [
  // town plaza
  [[395,640],[470,600],[560,585],[650,560],[745,530],[800,512],[860,532],[930,560],[995,615],[1045,670],[1060,760],[960,790],[870,800],[848,941],[470,941],[445,860],[420,760],[400,690]],
  // ramp + bridge deck
  [[782,528],[800,490],[858,455],[905,420],[980,394],[1080,376],[1200,372],[1300,368],[1348,384],[1342,412],[1230,404],[1100,406],[1000,422],[928,452],[884,500],[852,542]],
  // meadow + north path to the castle gate
  [[600,152],[700,142],[780,176],[860,226],[960,242],[1060,214],[1150,150],[1230,106],[1290,96],[1340,140],[1450,190],[1540,214],[1610,240],[1665,282],[1665,430],[1580,440],[1500,452],[1440,442],[1380,426],[1346,392],[1300,366],[1200,350],[1100,332],[1000,322],[930,316],[870,332],[830,322],[760,322],[700,300],[660,252],[610,216]],
];
function pip(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const walkable = (x, y) => WALK.some(p => pip(p, x, y));

/* nav grid + A* */
const CELL = 10, GC = Math.ceil(MAP_W / CELL), GR = Math.ceil(MAP_H / CELL);
const grid = new Uint8Array(GC * GR);
for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) grid[r * GC + c] = walkable(c * CELL + CELL / 2, r * CELL + CELL / 2) ? 1 : 0;
const cellOf = (x, y) => [clamp(Math.floor(x / CELL), 0, GC - 1), clamp(Math.floor(y / CELL), 0, GR - 1)];
function nearestWalkable(x, y) {
  if (walkable(x, y)) return [x, y];
  const [c0, r0] = cellOf(x, y);
  for (let rad = 1; rad < 80; rad++) {
    let best = null, bd = 1e9;
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
      const c = c0 + dc, r = r0 + dr;
      if (c < 0 || r < 0 || c >= GC || r >= GR || !grid[r * GC + c]) continue;
      const d = dc * dc + dr * dr; if (d < bd) { bd = d; best = [c * CELL + CELL / 2, r * CELL + CELL / 2]; }
    }
    if (best) return best;
  }
  return [x, y];
}
function lineWalkable(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(lerp(x0, x1, t), lerp(y0, y1, t))) return false; }
  return true;
}
function findPath(x0, y0, x1, y1) {
  if (lineWalkable(x0, y0, x1, y1)) return [[x1, y1]];
  const [sc, sr] = cellOf(x0, y0), [ec, er] = cellOf(x1, y1);
  const start = sr * GC + sc, goal = er * GC + ec;
  const g = new Float32Array(GC * GR).fill(Infinity), came = new Int32Array(GC * GR).fill(-1), closed = new Uint8Array(GC * GR);
  const heap = []; // [f, idx]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = i => { const dc = Math.abs(i % GC - ec), dr = Math.abs(((i / GC) | 0) - er); return Math.max(dc, dr) + 0.414 * Math.min(dc, dr); };
  g[start] = 0; push(h(start), start);
  let found = false, iter = 0;
  while (heap.length && iter++ < 60000) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) { found = true; break; }
    const cc = cur % GC, cr = (cur / GC) | 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nc = cc + dc, nr = cr + dr; if (nc < 0 || nr < 0 || nc >= GC || nr >= GR) continue;
      const ni = nr * GC + nc; if (!grid[ni] || closed[ni]) continue;
      if (dr && dc && (!grid[cr * GC + nc] || !grid[nr * GC + cc])) continue;
      const ng = g[cur] + (dr && dc ? 1.414 : 1);
      if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ng + h(ni), ni); }
    }
  }
  if (!found) return [[x1, y1]];
  const cells = []; for (let i = goal; i !== -1; i = came[i]) cells.push([(i % GC) * CELL + CELL / 2, ((i / GC) | 0) * CELL + CELL / 2]);
  cells.reverse(); cells[cells.length - 1] = [x1, y1];
  // string pulling
  const out = []; let ax = x0, ay = y0, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !lineWalkable(ax, ay, cells[j][0], cells[j][1])) j--;
    out.push(cells[j]); [ax, ay] = cells[j]; i = j + 1;
  }
  return out;
}

/* ------------------------------------------------------------------ procedural effect textures */
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return PIXI.Texture.from(c); }
const FX = {
  glow: canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.35, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  ring: canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * .30, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.6, "rgba(255,255,255,.9)"); gr.addColorStop(.75, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  disc: canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,.0)"); gr.addColorStop(.75, "rgba(255,255,255,.35)"); gr.addColorStop(.94, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  spark: canvasTex(64, 64, (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = "#fff"; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4 * (i ? 2 : 1)); g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(3, 0, 0, 30); g.quadraticCurveTo(-3, 0, 0, -30); g.fill(); } const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-14, -14, 28, 28); }),
  leaf: canvasTex(48, 48, g => { g.translate(24, 24); g.rotate(-.6); const gr = g.createLinearGradient(-16, 0, 16, 0); gr.addColorStop(0, "#9cf06a"); gr.addColorStop(1, "#3f9a35"); g.fillStyle = gr; g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(0, -14, 18, 0); g.quadraticCurveTo(0, 14, -18, 0); g.fill(); g.strokeStyle = "rgba(30,80,20,.6)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-16, 0); g.lineTo(16, 0); g.stroke(); }),
  rock: canvasTex(48, 48, g => { g.translate(24, 24); g.fillStyle = "#8e877b"; g.beginPath(); g.moveTo(-14, 6); g.lineTo(-9, -11); g.lineTo(6, -14); g.lineTo(15, -2); g.lineTo(10, 12); g.lineTo(-6, 14); g.closePath(); g.fill(); g.fillStyle = "#b5ae9f"; g.beginPath(); g.moveTo(-9, -11); g.lineTo(6, -14); g.lineTo(2, -3); g.lineTo(-8, -2); g.fill(); g.fillStyle = "#6aa84f"; g.beginPath(); g.arc(4, -10, 5, 0, TAU); g.fill(); }),
  dust: canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(220,190,150,.85)"); gr.addColorStop(1, "rgba(220,190,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  drop: canvasTex(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, "rgba(180,255,170,1)"); gr.addColorStop(1, "rgba(80,200,90,0)"); g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 15, 0, TAU); g.fill(); }),
  crescent: canvasTex(256, 256, (g, w) => { g.translate(w / 2, w / 2); for (let i = 0; i < 18; i++) { const a = i / 18; g.strokeStyle = `rgba(255,255,255,${(1 - a) * .9})`; g.lineWidth = 22 * (1 - a) + 2; g.beginPath(); g.arc(0, 0, 100 - i * 1.6, -Math.PI * .55 + a * .7, Math.PI * .55 - a * .1); g.stroke(); } }),
};

/* ------------------------------------------------------------------ effects + game-time timers */
const effects = [];
const timers = [];
const later = (sec, fn) => timers.push({ t: sec, fn });
function particle(o) {
  const s = new PIXI.Sprite(o.tex || FX.glow);
  s.anchor.set(.5); s.x = o.x; s.y = o.y; s.tint = o.tint ?? 0xffffff; s.alpha = o.alpha ?? 1;
  s.blendMode = o.add === false ? PIXI.BLEND_MODES.NORMAL : PIXI.BLEND_MODES.ADD;
  s.rotation = o.rot ?? Math.random() * TAU;
  (o.layer || fxLayer).addChild(s);
  const p = { s, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag ?? 0.9, life: o.life || .6, t: 0, s0: o.s0 ?? .4, s1: o.s1 ?? 0, a0: s.alpha, vr: o.vr || 0, sy: o.sy || 1, z: o.z || 0, vz: o.vz || 0, gz: o.gz || 0, fadeIn: o.fadeIn || 0 };
  p.update = dt => {
    p.t += dt; const k = p.t / p.life; if (k >= 1) { s.destroy(); return false; }
    p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); p.vy += p.g * dt;
    p.vz -= p.gz * dt; p.z = Math.max(0, p.z + p.vz * dt);
    s.x += p.vx * dt; s.y += p.vy * dt; s.rotation += p.vr * dt;
    const sc = lerp(p.s0, p.s1, easeOut(k)); s.scale.set(sc, sc * p.sy);
    s.pivot.y = p.z / Math.max(sc, .01);
    s.alpha = p.a0 * (p.fadeIn && k < p.fadeIn ? k / p.fadeIn : 1) * (1 - easeIn(k));
    return true;
  };
  effects.push(p); return p;
}
function ring(x, y, o = {}) {
  return particle({ tex: o.tex || FX.ring, x, y, tint: o.tint ?? 0x7ff0e0, s0: o.s0 ?? .1, s1: o.s1 ?? 1.2, life: o.life ?? .5, sy: o.sy ?? .45, rot: 0, layer: o.layer || groundFx, alpha: o.alpha ?? 1, drag: 1 });
}
function burst(x, y, n, o) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(o.v0 ?? 60, o.v1 ?? 220); particle({ ...o, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * (o.flat ?? .55), rot: a }); } }

/* damage numbers */
function dmgText(x, y, amount, kind) {
  const crit = kind === "crit", hurt = kind === "hurt", heal = kind === "heal";
  const t = new PIXI.Text((heal ? "+" : "") + fmt(amount), {
    fontFamily: "Mitr, sans-serif", fontWeight: "600", fontSize: crit ? 34 : 24,
    fill: heal ? ["#d6ffb0", "#5fd36b"] : hurt ? ["#ffb3a3", "#e2533f"] : crit ? ["#fff3b0", "#ffb52e"] : ["#ffffff", "#ffe0b8"],
    stroke: "#2a1206", strokeThickness: crit ? 6 : 5, lineJoin: "round",
  });
  t.anchor.set(.5); t.x = x + rand(-10, 10); t.y = y; t.scale.set(.2); textLayer.addChild(t);
  const p = { t: 0, life: crit ? 1.1 : .85, vx: rand(-30, 30) };
  p.update = dt => {
    p.t += dt; const k = p.t / p.life; if (k >= 1) { t.destroy(); return false; }
    const pop = k < .15 ? easeOut(k / .15) * (crit ? 1.25 : 1.05) : lerp(crit ? 1.25 : 1.05, crit ? .95 : .8, (k - .15) / .85);
    t.scale.set(pop * .9); t.x += p.vx * dt; t.y -= (70 - k * 60) * dt; t.alpha = k > .7 ? 1 - (k - .7) / .3 : 1;
    return true;
  };
  effects.push(p);
}

/* weapon trail: a mesh strip swept by the blade (tip -> mid-blade). The texture fades along
   the strip (old -> new) and across it (bright edge at the tip), so the trail reads as light. */
const TRAIL_TEX = canvasTex(128, 32, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / (w - 1), v = y / (h - 1), i = (y * w + x) * 4;
    const along = Math.pow(u, 1.6), edge = Math.pow(1 - v, 2.2), core = Math.pow(1 - v, 7);
    img.data[i] = 120 + 135 * core; img.data[i + 1] = 235 + 20 * core; img.data[i + 2] = 225 + 30 * core;
    img.data[i + 3] = 255 * along * (0.15 + 0.85 * edge);
  }
  g.putImageData(img, 0, 0);
});
class Trail {
  constructor() {
    this.N = 48; this.pts = []; this.on = false;
    this.verts = new Float32Array(this.N * 4); this.uvs = new Float32Array(this.N * 4);
    const idx = []; for (let i = 0; i < this.N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geom = new PIXI.MeshGeometry(this.verts, this.uvs, new Uint16Array(idx));
    this.mesh = new PIXI.Mesh(this.geom, new PIXI.MeshMaterial(TRAIL_TEX));
    this.mesh.blendMode = PIXI.BLEND_MODES.ADD; fxLayer.addChild(this.mesh);
  }
  push(ax, ay, bx, by) {
    if (!this.on) return;
    const last = this.pts[this.pts.length - 1];
    // fill gaps on fast swings so the arc stays round
    if (last) { const d = Math.hypot(ax - last.ax, ay - last.ay), n = Math.min(4, Math.floor(d / 14)); for (let k = 1; k <= n; k++) { const t = k / (n + 1); this.pts.push({ ax: lerp(last.ax, ax, t), ay: lerp(last.ay, ay, t), bx: lerp(last.bx, bx, t), by: lerp(last.by, by, t), t: last.t }); } }
    this.pts.push({ ax, ay, bx, by, t: 0 });
  }
  update(dt) {
    const LIFE = .16;
    for (const p of this.pts) p.t += dt;
    this.pts = this.pts.filter(p => p.t < LIFE).slice(-this.N);
    const n = this.pts.length, V = this.verts, U = this.uvs;
    for (let i = 0; i < this.N; i++) {
      const p = this.pts[Math.min(i, n - 1)] || { ax: 0, ay: 0, bx: 0, by: 0, t: LIFE };
      const age = 1 - p.t / LIFE, u = n > 1 ? Math.min(i, n - 1) / (n - 1) : 0, w = 0.25 + 0.75 * age;
      V[i * 4] = p.ax; V[i * 4 + 1] = p.ay; V[i * 4 + 2] = lerp(p.ax, p.bx, w); V[i * 4 + 3] = lerp(p.ay, p.by, w);
      U[i * 4] = u * age; U[i * 4 + 1] = 0; U[i * 4 + 2] = u * age; U[i * 4 + 3] = 1;
    }
    this.geom.getBuffer("aVertexPosition").update(); this.geom.getBuffer("aTextureCoord").update();
    this.mesh.visible = n > 2;
  }
}

/* ------------------------------------------------------------------ camera & feel */
const cam = { x: 640, y: 700, zoom: 1, shake: 0 };
const CAM_WIDE = 0.72;   // fraction of the old fit-to-screen zoom: lower = see more of the map
let hitstop = 0;
function shake(a) { cam.shake = Math.max(cam.shake, reduceMotion ? a * .25 : a); }

/* ------------------------------------------------------------------ mesh actor base */
class MeshActor {
  constructor(texture, cols, rows, feet) {
    this.root = new PIXI.Container();
    this.shadow = new PIXI.Graphics(); this.shadow.beginFill(0x0d1406, .35); this.shadow.drawEllipse(0, 0, 50, 15); this.shadow.endFill();
    this.root.addChild(this.shadow);
    this.plane = new PIXI.SimplePlane(texture, cols, rows);
    this.root.addChild(this.plane);
    this.cols = cols; this.rows = rows; this.feet = feet;
    this.setRest(texture);
    actorLayer.addChild(this.root);
    this.flash = new PIXI.ColorMatrixFilter(); this.flashAmt = 0; this.plane.filters = null;
    this.x = 0; this.y = 0; this.flip = false; this.hp = 1; this.maxHp = 1; this.dead = false;
  }
  setRest(texture) {
    const w = texture.width, h = texture.height; this.w = w; this.h = h;
    this.rest = new Float32Array(this.cols * this.rows * 2);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const i = (r * this.cols + c) * 2; this.rest[i] = c * w / (this.cols - 1); this.rest[i + 1] = r * h / (this.rows - 1);
    }
    this.plane.x = -this.feet[0]; this.plane.y = -this.feet[1];
  }
  writeVerts(fn) {
    const buf = this.plane.geometry.getBuffer("aVertexPosition"), d = buf.data, rest = this.rest;
    if (d.length !== rest.length) return;
    for (let i = 0; i < rest.length; i += 2) { const p = fn(rest[i], rest[i + 1]); d[i] = p[0]; d[i + 1] = p[1]; }
    buf.update();
  }
  setFlash(a, col = [.9, .9, .9]) {
    this.flashAmt = a;
    if (a <= 0.01) { if (this.plane.filters) this.plane.filters = null; return; }
    const k = 1 - a * .2;
    this.flash.matrix = [k, 0, 0, 0, a * col[0], 0, k, 0, 0, a * col[1], 0, 0, k, 0, a * col[2], 0, 0, 0, 1, 0];
    if (!this.plane.filters) this.plane.filters = [this.flash];
  }
  place(scaleMul = 1) {
    const s = depthScale(this.y) * scaleMul; this.scale = s;
    this.root.x = this.x; this.root.y = this.y; this.root.zIndex = this.y;
    this.root.scale.set(this.flip ? -s : s, s);
  }
}

/* ------------------------------------------------------------------ hero */
// Attacks, skills and the hurt flinch are rig clips in rigs/kaelrin.json (motion.actions), edited in the Rig Editor.
// facing -> [painted view, mirrored]. E and NW are the W and NE paintings flipped.
const FACING = { sw: ["sw", false], se: ["se", false], w: ["w", false], e: ["w", true], ne: ["ne", false], nw: ["ne", true] };
const WALK_SPEED = 130, RUN_SPEED = 300;            // view px / s (world speed = this x depthScale)
const AlphaFilter = PIXI.AlphaFilter || PIXI.filters.AlphaFilter;

/* Kaelrin: a cutout rig (rig.js + rigs/kaelrin.json). Locomotion (idle, walk, run, start, stop,
   turn) comes from MossRig.Locomotion with feet planted in the world. Attacks / skills / hurt are
   clips in motion.actions: absolute channel values blended over locomotion, plus
     step     how far the body travels forward (view px); foot F tracks are measured from where the
              action started, so a foot whose track stays still is planted while the body lunges
     spin     radians the facing turns (Tidecleave): the body turns through the painted views
     hits / smear / kick   damage times, slash-arc effects, hair+scarf impulses */
class Hero {
  constructor() {
    this.root = new PIXI.Container();
    this.shadow = new PIXI.Graphics(); this.shadow.beginFill(0x0d1406, .35); this.shadow.drawEllipse(0, 0, 50, 15); this.shadow.endFill();
    this.body = new PIXI.Container();
    this.root.addChild(this.shadow, this.body);
    actorLayer.addChild(this.root);
    this.flash = new PIXI.ColorMatrixFilter(); this.flashAmt = 0; this.flashTint = false;
    this.views = {}; this.cur = null; this.fade = null; this.key = null;
    this.loco = new MossRig.Locomotion(RIG);
    this.springs = { hair: new MossRig.Spring(110, 7, .8, 12), scarf: new MossRig.Spring(170, 12, .45, 5) };
    this.x = 640; this.y = 720; this.flip = false; this.lastSide = -1; this.scale = depthScale(this.y);
    this.setFacing("sw");
    this.trail = new Trail();
    this.maxHp = 9842; this.hp = 9842; this.maxMp = 1620; this.mp = 1620; this.dead = false;
    this.time = 0; this.path = []; this.speedCur = 0; this.runMode = true;
    this.action = null; this.target = null; this.combo = 0; this.comboTimer = 0; this.prevStep = 0; this.invuln = 0; this.repathT = 0;
    this.name = "Kaelrin";
  }
  rigView(key) {
    if (!this.views[key]) {
      const [v, flip] = FACING[key], V = RIG.views[v];
      const rv = new MossRig.RigView(RIG, v, { atlas: tex(V.atlas), head: tex(V.head.file), weapon: tex(V.weapon.file) }, flip);
      rv.container.visible = false; this.body.addChild(rv.container); this.views[key] = rv;
    }
    return this.views[key];
  }
  setFacing(key) {
    if (key === this.key) return;
    const prev = this.cur;
    this.key = key; [this.view, this.flip] = FACING[key];
    if (this.fade) this.endFade();
    this.cur = this.rigView(key); this.cur.container.visible = true;
    const V = RIG.views[this.view]; this.rig = { s: Math.sign(V.fwd[0]) || 1, fwd: V.fwd };
    if (prev && prev !== this.cur && this.noFade) prev.container.visible = false;   // spinning: swap at once
    else if (prev && prev !== this.cur) {            // turn: 70 ms cross-fade + a small squash (motion.turn)
      prev.af = prev.af || new AlphaFilter(1); this.cur.af = this.cur.af || new AlphaFilter(0);
      prev.af.alpha = 1; this.cur.af.alpha = 0;
      prev.container.filters = [prev.af]; this.cur.container.filters = [this.cur.af];
      this.fade = { from: prev, t: 0, dur: .07 };
      this.loco.trigger("turn");
    }
  }
  endFade() { const f = this.fade; if (!f) return; f.from.container.visible = false; f.from.container.filters = null; this.cur.container.filters = null; this.fade = null; }
  face(dx, dy) {
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
    const a = Math.atan2(dy, dx) * 180 / Math.PI; // screen angle
    if (Math.abs(dx) > .2 * Math.hypot(dx, dy)) this.lastSide = Math.sign(dx);
    let key;
    if (a > -22.5 && a <= 22.5) key = "e";
    else if (a > 22.5 && a <= 67.5) key = "se";
    else if (a > 67.5 && a <= 112.5) key = this.lastSide > 0 ? "se" : "sw";
    else if (a > 112.5 && a <= 157.5) key = "sw";
    else if (a > 157.5 || a <= -157.5) key = "w";
    else if (a > -157.5 && a <= -112.5) key = "nw";
    else if (a > -112.5 && a <= -67.5) key = this.lastSide < 0 ? "nw" : "ne";
    else key = "ne";
    this.setFacing(key);
  }
  /* world-space facing unit vector (used for lunges and dash) */
  facingVec() { const f = this.rig.fwd; const sx = this.flip ? -1 : 1; const l = Math.hypot(f[0], f[1]); return [f[0] * sx / l, f[1] / l]; }
  play(name, opts = {}) {
    const [fx, fy] = this.facingVec();
    this.action = { name, clip: RIG.motion.actions[name], t: 0, fired: 0, ev: 0, lunge: 0, a0: Math.atan2(fy, fx), ...opts };
    this.prevStep = 0;
  }
  busy() { return this.action && this.action.t < this.action.clip.dur; }
  setFlash(a) {
    this.flashAmt = a;
    if (a <= .01) { this.body.filters = null; this.flashTint = false; return; }
    this.flash.matrix = this.flashTint
      ? [1, 0, 0, 0, a * .6, 0, 1 - a * .5, 0, 0, 0, 0, 0, 1 - a * .5, 0, 0, 0, 0, 0, 1, 0]     // hurt: red
      : [1 - a * .2, 0, 0, 0, a * .9, 0, 1 - a * .2, 0, 0, a * .9, 0, 0, 1 - a * .2, 0, a * .9, 0, 0, 0, 1, 0];
    if (!this.body.filters) this.body.filters = [this.flash];
  }
  place() { const s = depthScale(this.y); this.scale = s; this.root.x = this.x; this.root.y = this.y; this.root.zIndex = this.y; this.root.scale.set(s, s); }

  /* action clip values -> rig pose over the locomotion pose (channels the clip has replace it) */
  actionPose(vals, loco, lunge) {
    const P = { ...loco };
    for (const k in vals) if (k in MossRig.POSE) P[k] = vals[k];
    for (const f of ["L", "R"]) {
      P["foot" + f + "X"] = 0; P["foot" + f + "Y"] = 0;                     // feet relative to the body...
      if ("foot" + f + "F" in vals) P["foot" + f + "F"] = vals["foot" + f + "F"] - lunge;   // ...minus the lunge
      if (!("foot" + f + "Pitch" in vals)) P["foot" + f + "Pitch"] = 0;
      if (!("foot" + f + "Lift" in vals)) P["foot" + f + "Lift"] = 0;
    }
    return P;
  }

  update(dt) {
    this.time += dt; this.invuln -= dt; this.comboTimer -= dt;
    if (this.comboTimer < 0) this.combo = 0;
    const busy = this.busy(), sc = depthScale(this.y);
    // movement: speed up over ~0.12 s, slow down before the end of the path (run start / stop)
    const px = this.x, py = this.y, vmax = (this.runMode ? RUN_SPEED : WALK_SPEED) * sc;
    let want = 0;
    if (!busy && !this.dead && this.path.length) {
      let rem = 0, ax = this.x, ay = this.y; for (const [tx, ty] of this.path) { rem += Math.hypot(tx - ax, ty - ay); ax = tx; ay = ty; }
      want = Math.min(vmax, Math.sqrt(2 * (vmax / .14) * rem) + vmax * .15);
    }
    this.speedCur = want > this.speedCur ? Math.min(want, this.speedCur + vmax / .12 * dt) : want;
    let mv = this.speedCur * dt;
    while (mv > 1e-6 && this.path.length && !busy && !this.dead) {
      const [tx, ty] = this.path[0], dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d <= mv) { this.x = tx; this.y = ty; this.path.shift(); mv -= d; if (d > .5) this.face(dx, dy); }
      else { this.x += dx / d * mv; this.y += dy / d * mv; this.face(dx, dy); mv = 0; }
    }
    const idt = 1 / Math.max(dt, 1e-4), mvx = (this.x - px) * idt, mvy = (this.y - py) * idt;
    // combat: chase + auto attack
    if (this.target && !this.dead) {
      const m = this.target;
      if (m.dead) { this.target = null; }
      else {
        const dx = m.x - this.x, dy = (m.y - this.y) * 1.25, d = Math.hypot(dx, dy), range = (m.reach || 0) + 62 * depthScale(this.y) / .45;
        if (d > range) { if (!busy && (!this.path.length || this.repathT-- <= 0)) { this.path = findPath(this.x, this.y, ...nearestWalkable(m.x - dx / d * range * .7, m.y - dy / d * range * .5)); this.repathT = 12; } }
        else if (!busy) {
          this.path = []; this.face(dx, dy / 1.25);
          const name = ["slash1", "slash2", "slash3"][this.combo % 3];
          this.play(name, { target: m, kind: "basic" }); this.combo++; this.comboTimer = 1.1;
        }
      }
    }
    // action clip (attacks / skills / hurt)
    let ap = null, w = 0, act = null;
    if (this.action) {
      const a = act = this.action, C = a.clip; a.t += dt;
      const clipT = Math.min(a.t, C.dur);
      ap = MossRig.sampleClip(C, clipT);
      while (a.fired < C.hits.length && clipT >= C.hits[a.fired]) { onHit(this, a, a.fired); a.fired++; }
      const evs = a.evs || (a.evs = [...(C.smear || []).map(e => ({ ...e, type: "smear" })), ...(C.kick || []).map(e => ({ ...e, type: "kick" }))].sort((x, y) => x.t - y.t));
      while (a.ev < evs.length && clipT >= evs[a.ev].t) actionEvent(this, evs[a.ev++]);
      if (a.onUpdate) a.onUpdate(clipT, dt);
      const st = ap.step || 0, dStep = st - this.prevStep; this.prevStep = st;   // lunge along facing (view px)
      if (dStep) { const [fx, fy] = this.facingVec(), s2 = depthScale(this.y), nx = this.x + fx * dStep * s2, ny = this.y + fy * dStep * s2; if (walkable(nx, ny)) { this.x = nx; this.y = ny; a.lunge += dStep; } }
      if (ap.spin !== undefined) {                                              // Tidecleave: turn through the views
        const ang = a.a0 + ap.spin * (Math.cos(a.a0) < 0 ? -1 : 1);
        this.noFade = Math.abs(ap.spin) > .2; this.face(Math.cos(ang), Math.sin(ang)); this.noFade = false;
      }
      w = clamp(a.t / .06, 0, 1);
      if (a.t > C.dur) { w = 1 - clamp((a.t - C.dur) / .12, 0, 1); if (w <= 0) { this.action = null; if (a.onEnd) a.onEnd(); } }
    }
    // pose = locomotion (feet planted in the world) blended with the action
    const loco = this.loco.update({ dt, x: this.x, y: this.y, vx: mvx, vy: mvy, s: depthScale(this.y), flip: this.flip, skel: this.cur.skel, lock: w });
    const P = ap && w > 0 ? MossRig.blendPose(loco, this.actionPose(ap, loco, act.lunge), w) : loco;
    this.pose = P;
    // draw the rig (+ the previous facing while cross-fading); hair / scarf springs lag behind the neck
    const sxs = this.flip ? -1 : 1, hd = this.springs.hair.d, sd = this.springs.scarf.d;
    const spr = { hair: [hd[0] * sxs, hd[1]], scarf: [sd[0] * sxs, sd[1]] };
    const res = this.cur.update(P, spr);
    if (this.fade) {
      const f = this.fade; f.t += dt; const k = clamp(f.t / f.dur, 0, 1);
      f.from.update(P, spr); f.from.af.alpha = 1 - k; this.cur.af.alpha = k;
      if (k >= 1) this.endFade();
    }
    const O = this.cur.skel.origin, anchor = [this.x / .45 + (res.J.neck[0] - O[0]) * sxs, this.y / .45 + res.J.neck[1] - O[1]];
    this.springs.hair.update(dt, anchor); this.springs.scarf.update(dt, anchor);
    // shadow shrinks while airborne
    const air = clamp(P.air / 90, 0, 1); this.shadow.scale.set(1 - air * .45, 1 - air * .45); this.shadow.alpha = 1 - air * .5;
    this.place();
    if (this.flashAmt > 0) this.setFlash(Math.max(0, this.flashAmt - dt * 5));
    // trail from the blade tip (world coords)
    const toWorld = p => [this.x + (p[0] - O[0]) * sxs * this.scale, this.y + (p[1] - O[1]) * this.scale];
    const tip = toWorld(this.cur.weaponTip(1)), mid = toWorld(this.cur.weaponTip(.5));
    this.tipWorld = tip;
    this.trail.on = !!(this.action && this.action.t < this.action.clip.dur && this.action.kind !== "cast" && !this.action.clip.smear);   // clips with a painted arc skip the code trail
    this.trail.push(tip[0], tip[1], mid[0], mid[1]);
    this.trail.update(dt);
  }
}

/* ------------------------------------------------------------------ monsters */
class Sproutling extends MeshActor {
  constructor(x, y) {
    const m = man.mobs.sproutling; super(tex(m.file), 10, 10, m.feet);
    this.x = this.homeX = x; this.y = this.homeY = y; this.maxHp = this.hp = 6200; this.name = "Sproutling"; this.lv = 30;
    this.state = "idle"; this.timer = rand(.5, 2); this.hop = 0; this.squash = 1; this.knock = [0, 0]; this.wob = 0; this.t = rand(0, 9);
    this.reach = 6; this.sizeMul = 1.05; this.radius = 26; this.atkCd = rand(.3, 1.2); this.shadow.scale.set(.75, .8); this.ang = rand(0, TAU);
  }
  update(dt) {
    this.t += dt; this.atkCd -= dt;
    if (this.dead) { this.deadT += dt; this.root.alpha = Math.max(0, 1 - this.deadT / .5); this.squash = lerp(this.squash, .2, dt * 6); this.render(); return; }
    const p = hero, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy * 1.25);
    if (this.aggro && (p.dead || Math.hypot(this.x - this.homeX, this.y - this.homeY) > 380)) { this.aggro = false; this.state = "home"; }
    if (!this.aggro && !p.dead && d < 150) this.aggro = true;
    // hop movement
    this.timer -= dt;
    if (this.hopT > 0) {
      this.hopT -= dt; const k = 1 - this.hopT / this.hopDur;
      this.hop = Math.sin(k * Math.PI) * this.hopH;
      const nx = this.x + this.hv[0] * dt, ny = this.y + this.hv[1] * dt;
      if (walkable(nx, ny)) { this.x = nx; this.y = ny; }
      if (this.hopT <= 0) { this.hop = 0; this.squash = .72; if (this.lunge) { this.lunge = false; if (Math.hypot(hero.x - this.x, (hero.y - this.y) * 1.25) < 60) hurtHero(rand(130, 190), this); } }
    } else if (this.timer <= 0) {
      let tx, ty, lunge = false;
      if (this.aggro) {
        if (d < 70 && this.atkCd <= 0) { tx = p.x; ty = p.y; lunge = true; this.atkCd = 1.6; }
        else { tx = p.x + Math.cos(this.ang) * 52; ty = p.y + Math.sin(this.ang) * 30; }
      } else if (this.state === "home") { tx = this.homeX; ty = this.homeY; if (Math.hypot(tx - this.x, ty - this.y) < 30) this.state = "idle"; }
      else { tx = this.homeX + rand(-90, 90); ty = this.homeY + rand(-50, 50); }
      const ddx = tx - this.x, ddy = ty - this.y, dd = Math.hypot(ddx, ddy) || 1, len = Math.min(dd, lunge ? 80 : 60);
      this.hopDur = lunge ? .42 : .5; this.hopT = this.hopDur; this.hopH = lunge ? 38 : 22; this.lunge = lunge;
      this.hv = [ddx / dd * len / this.hopDur, ddy / dd * len / this.hopDur]; this.squash = .78;
      if (Math.abs(ddx) > 4) this.flip = ddx > 0;
      this.timer = this.aggro ? rand(.15, .35) : rand(.8, 2.6);
    }
    // knockback
    this.x += this.knock[0] * dt; this.y += this.knock[1] * dt; this.knock[0] *= Math.pow(.02, dt); this.knock[1] *= Math.pow(.02, dt);
    if (!walkable(this.x, this.y)) [this.x, this.y] = nearestWalkable(this.x, this.y);
    this.squash = lerp(this.squash, this.hopT > 0 ? 1.12 : 1, 1 - Math.pow(.0005, dt));
    this.wob = lerp(this.wob, 0, 1 - Math.pow(.05, dt));
    this.render();
  }
  render() {
    const F = this.feet, H = this.h, sq = this.squash + Math.sin(this.t * 3) * .02, sx = 1 + (1 - sq) * .8, t = this.t, wob = this.wob;
    this.writeVerts((x, y) => {
      const k = (F[1] - y) / H; // 0 at feet, 1 at top
      let ox = Math.sin(t * 9 + k * 4) * wob * 10 * k;
      if (k > .62) ox += Math.sin(t * 2.4) * 5 * (k - .62) * 3; // leaves sway
      return [F[0] + (x - F[0]) * sx + ox, F[1] + (y - F[1]) * sq - this.hop];
    });
    const air = clamp(this.hop / 40, 0, 1); this.shadow.scale.set(.75 * (1 - air * .4), .8 * (1 - air * .4));
    this.place(this.sizeMul); this.setFlash(Math.max(0, this.flashAmt - 1 / 60 * 5));
  }
  hit(dir) { this.wob = 1; this.squash = .7; this.knock = [dir[0] * 260, dir[1] * 180]; this.aggro = true; this.hopT = 0; this.hop = 0; this.timer = .35; }
}

class Mossback extends MeshActor {
  constructor(x, y) {
    const m = man.mobs.mossback; super(tex(m.file), 16, 16, m.feet);
    this.x = this.homeX = x; this.y = this.homeY = y; this.maxHp = this.hp = 90000; this.name = "Mossback Boar"; this.lv = 34; this.boss = true;
    this.sizeMul = 1.95; this.reach = 64; this.radius = 70; this.t = 0; this.phase = 0; this.state = "idle"; this.stateT = 0; this.knock = [0, 0];
    this.pose = { bob: 0, lean: 0, squash: 1, head: 0, step: 0 }; this.atkN = 0; this.shadow.scale.set(1.5, 1.3);
    this.tele = new PIXI.Graphics(); groundFx.addChild(this.tele);
  }
  update(dt) {
    this.t += dt; this.stateT += dt;
    const P = this.pose, p = hero;
    if (this.dead) { this.deadT += dt; this.root.alpha = Math.max(0, 1 - this.deadT / 1.2); P.squash = lerp(P.squash, .6, dt * 3); this.tele.clear(); this.render(dt, 0); return; }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy * 1.25);
    if (!this.aggro && !p.dead && d < 230) this.aggro = true;
    if (this.aggro && (p.dead || Math.hypot(this.x - this.homeX, this.y - this.homeY) > 520)) { this.aggro = false; this.setState("home"); }
    let moving = 0; this.tele.clear();
    const S = this.state;
    if (S === "idle") { if (this.aggro) this.setState("chase"); }
    else if (S === "home") { moving = this.moveTo(this.homeX, this.homeY, 90, dt); if (!moving) this.setState("idle"); }
    else if (S === "chase") {
      if (Math.abs(dx) > 8) this.flip = dx > 0;
      if (this.stateT > .6) {
        const n = this.atkN % 3;
        if (d < 120 && n !== 2) { this.setState("swipeWind"); this.atkN++; }
        else if (n === 2 && d < 260) { this.setState("stompWind"); this.atkN++; }
        else if (d > 170 && d < 420) { this.setState("chargeWind"); this.atkN++; this.chargeDir = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)]; }
      }
      if (this.state === "chase" && d > 95) moving = this.moveTo(p.x, p.y, 70, dt);
    }
    else if (S === "swipeWind") { P.head = lerp(P.head, -.25, dt * 8); P.squash = lerp(P.squash, .92, dt * 8); this.setFlash(.22 + .14 * Math.sin(this.t * 26), [.75, .08, 0]); if (this.stateT > .55) { this.setState("swipe"); } }
    else if (S === "swipe") {
      const k = this.stateT / .3; P.head = lerp(-.25, .35, easeOut(clamp(k, 0, 1))); P.step = Math.sin(clamp(k, 0, 1) * Math.PI) * 26;
      if (!this.swung && k > .4) { this.swung = true; shake(5); if (Math.hypot(p.x - this.x, (p.y - this.y) * 1.25) < 135) hurtHero(rand(900, 1300), this); burst(this.x + (this.flip ? 60 : -60), this.y, 8, { tex: FX.dust, add: false, s0: .5, s1: 1.2, life: .6, tint: 0xd8c4a0 }); }
      if (k > 1.6) { this.swung = false; this.setState("chase"); }
    }
    else if (S === "chargeWind") {
      const k = this.stateT / .9, len = 360, [cx, cy] = this.chargeDir;
      P.squash = lerp(P.squash, .88, dt * 6); P.head = -.2 + Math.sin(this.t * 40) * .04;
      if (Math.abs(cx) > .05) this.flip = cx > 0;
      this.drawLine(cx, cy, len, k);
      if (this.stateT > .9) this.setState("charge");
    }
    else if (S === "charge") {
      const [cx, cy] = this.chargeDir, v = 560 * depthScale(this.y) / .45;
      const nx = this.x + cx * v * dt, ny = this.y + cy * v * dt * .8;
      P.head = .2; P.bob = Math.abs(Math.sin(this.t * 22)) * 10; moving = 2.2;
      if (walkable(nx, ny) && this.stateT < .62) { this.x = nx; this.y = ny; if (this.stateT % .05 < dt) particle({ tex: FX.dust, x: this.x + rand(-20, 20), y: this.y, add: false, s0: .5, s1: 1.3, life: .7, tint: 0xd8c4a0, alpha: .8, vy: -10 }); }
      else { shake(8); this.setState("recover"); }
      if (!this.chargeHit && Math.hypot(p.x - this.x, (p.y - this.y) * 1.25) < 80) { this.chargeHit = true; hurtHero(rand(1300, 1700), this, [cx, cy]); }
    }
    else if (S === "stompWind") {
      const k = this.stateT / 1.0; P.bob = easeOut(clamp(k, 0, 1)) * 26; P.squash = 1.06; P.head = -.15;
      this.drawCircle(150, k);
      if (this.stateT > 1) this.setState("stomp");
    }
    else if (S === "stomp") {
      if (!this.stomped) {
        this.stomped = true; P.bob = 0; P.squash = .78; shake(14); hitstop = .07;
        ring(this.x, this.y, { tint: 0xffb36b, s0: .2, s1: 1.5, life: .55, sy: .42 });
        ring(this.x, this.y, { tint: 0xfff0c0, s0: .1, s1: 1.0, life: .35, sy: .42 });
        for (let i = 0; i < 14; i++) { const a = rand(0, TAU), v = rand(120, 260); particle({ tex: FX.rock, add: false, x: this.x, y: this.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5, z: 5, vz: rand(160, 320), gz: 900, s0: rand(.4, .7), s1: .4, life: .9, drag: .97, vr: rand(-8, 8) }); }
        burst(this.x, this.y, 12, { tex: FX.dust, add: false, s0: .4, s1: 1.1, life: .8, tint: 0xf0e2c4, alpha: .5, v0: 90, v1: 220 });
        if (Math.hypot(p.x - this.x, (p.y - this.y) * 1.25) < 150 * depthScale(this.y) / .45) hurtHero(rand(1100, 1500), this);
      }
      if (this.stateT > .7) { this.stomped = false; this.setState("chase"); }
    }
    else if (S === "recover") { P.head = lerp(P.head, 0, dt * 4); if (this.stateT > .8) { this.chargeHit = false; this.setState("chase"); } }
    // relax pose
    if (S === "chase" || S === "idle" || S === "home" || S === "recover") { P.head = lerp(P.head, 0, dt * 5); P.squash = lerp(P.squash, 1, dt * 6); P.bob = lerp(P.bob, 0, dt * 8); P.step = lerp(P.step, 0, dt * 6); }
    if (S !== "swipeWind" && this.flashAmt > 0) this.setFlash(Math.max(0, this.flashAmt - dt * 5));
    this.x += this.knock[0] * dt; this.y += this.knock[1] * dt; this.knock[0] *= Math.pow(.01, dt); this.knock[1] *= Math.pow(.01, dt);
    if (!walkable(this.x, this.y)) [this.x, this.y] = nearestWalkable(this.x, this.y);
    this.render(dt, moving);
  }
  setState(s) { this.state = s; this.stateT = 0; }
  moveTo(tx, ty, sp, dt) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy); if (d < 6) return 0;
    const v = sp * depthScale(this.y) / .45 * dt, nx = this.x + dx / d * v, ny = this.y + dy / d * v;
    if (walkable(nx, ny)) { this.x = nx; this.y = ny; } else if (walkable(nx, this.y)) this.x = nx; else if (walkable(this.x, ny)) this.y = ny;
    if (Math.abs(dx) > 6) this.flip = dx > 0; return 1;
  }
  drawLine(cx, cy, len, k) {
    const g = this.tele, ex = this.x + cx * len, ey = this.y + cy * len * .8, nx = -cy, ny = cx, w = 46;
    g.beginFill(0xff3b2f, .16); g.drawPolygon([this.x + nx * w, this.y + ny * w * .6, ex + nx * w, ey + ny * w * .6, ex - nx * w, ey - ny * w * .6, this.x - nx * w, this.y - ny * w * .6]); g.endFill();
    const fx = lerp(this.x, ex, clamp(k, 0, 1)), fy = lerp(this.y, ey, clamp(k, 0, 1));
    g.beginFill(0xff5a3c, .3); g.drawPolygon([this.x + nx * w, this.y + ny * w * .6, fx + nx * w, fy + ny * w * .6, fx - nx * w, fy - ny * w * .6, this.x - nx * w, this.y - ny * w * .6]); g.endFill();
  }
  drawCircle(r, k) {
    const g = this.tele, rr = r * depthScale(this.y) / .45;
    g.lineStyle(3, 0xff4a35, .7); g.beginFill(0xff3b2f, .14); g.drawEllipse(this.x, this.y, rr, rr * .45); g.endFill();
    g.lineStyle(0); g.beginFill(0xff5a3c, .28); g.drawEllipse(this.x, this.y, rr * clamp(k, 0, 1), rr * .45 * clamp(k, 0, 1)); g.endFill();
  }
  render(dt, moving) {
    this.phase += dt * (moving ? 9 * moving : 0) + 0; const P = this.pose, F = this.feet, H = this.h, W = this.w, ph = this.phase, t = this.t;
    const breathe = Math.sin(t * 1.8) * .015, walk = moving ? 1 : 0, sq = P.squash + breathe;
    const fwd = [-.85, .45]; // image faces down-left
    this.writeVerts((x, y) => {
      const k = (F[1] - y) / H, fx = x / W;
      // legs: bottom 28%, four legs alternate by x position
      if (k < .3) { const legPh = ph + (fx < .5 ? 0 : Math.PI) + (fx < .3 || (fx > .5 && fx < .75) ? Math.PI / 2 : 0); const a = (1 - k / .3); x += fwd[0] * Math.sin(legPh) * 9 * a * walk; y -= Math.max(0, Math.cos(legPh)) * 6 * a * walk; }
      // head region (front-left): swipes/charges tilt it
      const hw = smooth(.55, .25, fx) * smooth(.15, .35, k) * smooth(.9, .6, k);
      if (hw > 0) { const px = W * .4, py = F[1] - H * .5, a = P.head * hw, dx = x - px, dy = y - py; x = px + dx * Math.cos(a) - dy * Math.sin(a); y = py + dx * Math.sin(a) + dy * Math.cos(a); x += fwd[0] * P.step * hw; y += fwd[1] * P.step * hw; }
      // body bob with walk
      const bodyBob = (Math.abs(Math.sin(ph)) * 4 * walk + P.bob) * smooth(.15, .4, k);
      y -= bodyBob;
      return [F[0] + (x - F[0]) * (1 + (1 - sq) * .6), F[1] + (y - F[1]) * sq];
    });
    const air = clamp(P.bob / 30, 0, 1); this.shadow.scale.set(1.5 * (1 - air * .3), 1.3 * (1 - air * .3));
    this.place(this.sizeMul);
  }
  hit(dir) { this.aggro = true; if (this.state === "idle") this.setState("chase"); this.knock = [dir[0] * 30, dir[1] * 20]; }
}

/* ------------------------------------------------------------------ actors */
const hero = new Hero();
const mobs = [];
const SLIME_SPOTS = [[1110, 270], [1210, 300], [1300, 230], [1380, 330], [1500, 360], [1560, 300], [1040, 290]];
for (const [x, y] of SLIME_SPOTS) mobs.push(new Sproutling(x, y));
const boss = new Mossback(1470, 300); mobs.push(boss);

/* keep monsters from stacking on each other / on the hero */
function separate(dt) {
  const list = mobs.filter(m => !m.dead);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dy = (b.y - a.y) * 1.6, d = Math.hypot(dx, dy) || .01;
    const min = (a.radius * depthScale(a.y) * (a.sizeMul || 1) + b.radius * depthScale(b.y) * (b.sizeMul || 1)) * .9;
    if (d < min) { const push = (min - d) * .5 * Math.min(1, dt * 12), ux = dx / d, uy = dy / d / 1.6, wa = a.boss ? .1 : 1, wb = b.boss ? .1 : 1;
      const ax = a.x - ux * push * wa, ay = a.y - uy * push * wa, bx = b.x + ux * push * wb, by = b.y + uy * push * wb;
      if (walkable(ax, ay)) { a.x = ax; a.y = ay; } if (walkable(bx, by)) { b.x = bx; b.y = by; } }
  }
  for (const m of list) {
    if (m.boss || m.hopT > 0) continue;
    const dx = m.x - hero.x, dy = (m.y - hero.y) * 1.6, d = Math.hypot(dx, dy) || .01, min = 30;
    if (d < min) { const k = (min - d) * Math.min(1, dt * 10), nx = m.x + dx / d * k, ny = m.y + dy / d * k / 1.6; if (walkable(nx, ny)) { m.x = nx; m.y = ny; } }
  }
}

/* nameplates */
function nameplate(a, color) {
  const c = new PIXI.Container();
  const t = new PIXI.Text(a.name, { fontFamily: "Mitr, sans-serif", fontWeight: "500", fontSize: 15, fill: color, stroke: "#1a0f08", strokeThickness: 4, lineJoin: "round" });
  t.anchor.set(.5, 1); c.addChild(t);
  const lv = new PIXI.Text("Lv." + (a.lv || 32), { fontFamily: "Mitr, sans-serif", fontSize: 11, fill: "#bfe9df", stroke: "#1a0f08", strokeThickness: 3 });
  lv.anchor.set(.5, 0); lv.y = 1; c.addChild(lv);
  const bar = new PIXI.Graphics(); bar.y = 16; c.addChild(bar);
  textLayer.addChild(c); a.plate = c; a.plateBar = bar;
}
nameplate(hero, "#ffe7a8");
for (const m of mobs) nameplate(m, m.boss ? "#ffb39a" : "#f6ead6");
function updatePlate(a, topPx) {
  const c = a.plate; c.x = a.x; c.y = a.y - topPx * a.scale * (a.sizeMul || 1) - 6;
  const show = a === hero || a.boss || hero.target === a, hurt = a.hp < a.maxHp;
  c.children[0].visible = c.children[1].visible = show;
  c.alpha = a.dead ? 0 : show || hurt ? 1 : 0;
  const g = a.plateBar; g.clear(); const w = 54, k = clamp(a.hp / a.maxHp, 0, 1);
  g.beginFill(0x120a05, .85); g.drawRoundedRect(-w / 2 - 1, -1, w + 2, 7, 3); g.endFill();
  g.beginFill(a === hero ? 0x58c94f : k > .3 ? 0xd6493a : 0xff2d1f); g.drawRoundedRect(-w / 2, 0, w * k, 5, 2.5); g.endFill();
  const s = clamp(depthScale(a.y) / .5, .8, 1.2); c.scale.set(s);
}

/* ------------------------------------------------------------------ combat */
const SKILLS = [
  { id: "tidecleave", name: "Tidecleave", th: "ฟันวังวนกระแสน้ำ", cost: 180, cd: 4, icon: "tide" },
  { id: "mossquake", name: "Mossquake", th: "กระโดดทุบแผ่นดินมอส", cost: 260, cd: 7, icon: "quake" },
  { id: "galedash", name: "Gale Dash", th: "พุ่งฟันสายลม", cost: 120, cd: 3, icon: "dash" },
  { id: "mend", name: "Verdant Mend", th: "ฟื้นฟูใบไม้เขียว", cost: 300, cd: 12, icon: "mend" },
  { id: "potion", name: "Potion", th: "ยาฟื้นฟู", cost: 0, cd: 8, icon: "potion" },
];
const cds = {};
function hitDir(from, to) { const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
function mobsInRadius(x, y, r) { return mobs.filter(m => !m.dead && Math.hypot(m.x - x, (m.y - y) * 1.25) < r + (m.radius || 0) * depthScale(m.y) / .45); }

function damageMob(m, base, opts = {}) {
  if (m.dead) return;
  const crit = Math.random() < (opts.critRate ?? .18);
  const dmg = Math.round(base * rand(.88, 1.12) * (crit ? 1.8 : 1));
  m.hp -= dmg; m.setFlash(1);
  const top = (m.h - (m.h - m.feet[1])) * m.scale * (m.sizeMul || 1);
  dmgText(m.x, m.y - top * (m.boss ? .55 : .8), dmg, crit ? "crit" : "dmg");
  const dir = hitDir(hero, m); m.hit(dir);
  const hx = m.x - dir[0] * 10, hy = m.y - top * .45;
  particle({ tex: FX.spark, x: hx, y: hy, tint: 0xfff2c4, s0: crit ? 1.1 : .75, s1: .2, life: .22, rot: rand(0, TAU) });
  burst(hx, hy, crit ? 12 : 7, { tex: FX.glow, tint: opts.tint ?? 0x8ff5e4, s0: .35, s1: 0, life: .45, v0: 120, v1: 360, flat: .8 });
  if (m instanceof Sproutling) burst(hx, hy, 5, { tex: FX.drop, s0: .5, s1: .1, life: .6, g: 600, v0: 80, v1: 220, flat: 1, add: false });
  hitstop = Math.max(hitstop, opts.stop ?? (crit ? .085 : .055)); shake(opts.shake ?? (crit ? 6 : 3.5));
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  m.dead = true; m.deadT = 0; m.hp = 0;
  const top = m.h * m.scale * (m.sizeMul || 1) * .5;
  if (m.boss) {
    shake(18); hitstop = .25;
    for (let i = 0; i < 4; i++) later(i * .16, () => { ring(m.x, m.y, { tint: 0xffd36b, s0: .2, s1: 2.2, life: .8, sy: .45 }); burst(m.x, m.y - top, 26, { tex: FX.glow, tint: [0xffd36b, 0x8ff5e4, 0xb6ff8a][i % 3], s0: .6, s1: 0, life: 1.1, v0: 100, v1: 420 }); });
    for (let i = 0; i < 18; i++) { const a = rand(0, TAU), v = rand(80, 240); particle({ tex: FX.rock, add: false, x: m.x, y: m.y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5, z: 10, vz: rand(200, 420), gz: 900, s0: rand(.5, .9), s1: .4, life: 1.2, drag: .98, vr: rand(-8, 8) }); }
    banner("ปราบ Mossback Boar สำเร็จ!", "Defend Mossbridge 2/3 · +48,000 EXP");
    quest.boar = 1; log(`<span class="s">[ระบบ] ปราบ Mossback Boar แล้ว! ได้รับ [งามอสเรืองแสง] x1</span>`);
    later(25, () => respawn(m));
  } else {
    burst(m.x, m.y - top, 18, { tex: FX.drop, s0: .7, s1: .1, life: .8, g: 500, v0: 90, v1: 260, flat: 1, add: false });
    burst(m.x, m.y - top, 10, { tex: FX.leaf, add: false, s0: .6, s1: .3, life: 1, g: 260, v0: 60, v1: 200, vr: 6, flat: 1 });
    ring(m.x, m.y, { tint: 0xb6ff8a, s0: .1, s1: .7, life: .4 });
    quest.slime = Math.min(5, quest.slime + 1);
    log(`<span class="g">[ระบบ] กำจัด Sproutling (+1,850 EXP)</span>`);
    later(9, () => respawn(m));
  }
  if (hero.target === m) hero.target = null;
}
function respawn(m) {
  m.dead = false; m.hp = m.maxHp; m.root.alpha = 0; m.x = m.homeX; m.y = m.homeY; m.aggro = false; m.state = "idle";
  if (m.pose) m.pose = { bob: 0, lean: 0, squash: 1, head: 0, step: 0 };
  m.squash = 1; const fade = { t: 0, update(dt) { this.t += dt; m.root.alpha = Math.min(1, this.t / .6); return this.t < .6; } }; effects.push(fade);
  burst(m.x, m.y - 20, 10, { tex: FX.glow, tint: 0xb6ff8a, s0: .4, s1: 0, life: .8, v0: 20, v1: 90, g: -120 });
}
function hurtHero(amount, src, dir) {
  if (hero.dead || hero.invuln > 0) return;
  const dmg = Math.round(amount); hero.hp -= dmg; hero.flashTint = true; hero.setFlash(.6);
  dmgText(hero.x, hero.y - 150 * hero.scale, dmg, "hurt");
  if (!hero.busy()) hero.play("hurt", { kind: "cast" });
  shake(src.boss ? 9 : 4);
  if (dir) { const nx = hero.x + dir[0] * 40, ny = hero.y + dir[1] * 30; if (walkable(nx, ny)) { hero.x = nx; hero.y = ny; } }
  log(`<span class="d">[ต่อสู้] ${src.name} โจมตีคุณ ${fmt(dmg)}</span>`);
  if (hero.hp <= 0) {
    hero.hp = 0; hero.dead = true; hero.target = null; hero.path = [];
    banner("คุณหมดสติ", "กำลังกลับไปที่จัตุรัส Mossbridge…");
    later(3, () => { hero.dead = false; hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.x = 640; hero.y = 720; hero.loco.reset(); hero.invuln = 2; hero.root.alpha = 1; ring(hero.x, hero.y, { tint: 0x8ff5e4, s1: 1.4, life: .8 }); });
  }
}

/* clip events: slash arc (ChatGPT P09A frames, additive) and hair/scarf impulses */
function actionEvent(h, e) {
  const [fx, fy] = h.facingVec();
  if (e.type === "kick") {
    const sx = Math.sign(fx) || 1;
    for (const sp of Object.values(h.springs)) { sp.v[0] += e.x * .05 * sx; sp.v[1] += e.y * .05; }
    return;
  }
  if (e.type === "smear" && FXF.slash) slashArc(h, e, fx, fy);
}
function slashArc(h, e, fx, fy) {
  const F = FXF.slash, outer = new PIXI.Container(), sp = new PIXI.Sprite(F.tex[0]);
  sp.anchor.set(F.anchor[0] / F.size[0], F.anchor[1] / F.size[1]); sp.blendMode = PIXI.BLEND_MODES.ADD;
  const k = 120 * h.scale / F.reach * (e.scale || 1);
  outer.addChild(sp); fxLayer.addChild(outer);
  if (e.flat) {             // horizontal sweep: lies on the ground plane in front of the hero
    outer.x = h.x + fx * 20 * h.scale; outer.y = h.y - 50 * h.scale; outer.scale.set(k, k * .5);
    sp.rotation = Math.atan2(fy * 2, fx);
  } else {                  // chop in the forward-up plane: convex side toward the facing
    outer.x = h.x + fx * 62 * h.scale; outer.y = h.y - 100 * h.scale + fy * 30 * h.scale;
    outer.scale.set(fx < 0 ? -k : k, e.flipY ? -k : k);
    sp.rotation = Math.atan2(fy * .35, Math.abs(fx)) * (fx < 0 ? -1 : 1) * (e.flipY ? -1 : 1);
  }
  const fxp = { t: 0, life: e.dur || .2 };
  fxp.update = dt => {
    fxp.t += dt; const q = fxp.t / fxp.life; if (q >= 1) { outer.destroy({ children: true }); return false; }
    sp.texture = F.tex[Math.min(F.tex.length - 1, Math.floor(q * F.tex.length))]; outer.alpha = .8 * (q > .75 ? (1 - q) / .25 : 1);
    return true;
  };
  effects.push(fxp);
}
/* ground shockwave (P09C frames) centred on x, y, r = radius in world px */
function quakeFx(x, y, r, life = .6) {
  if (!FXF.quake) return;
  const F = FXF.quake, sp = new PIXI.Sprite(F.tex[0]);
  sp.anchor.set(F.anchor[0] / F.size[0], F.anchor[1] / F.size[1]); sp.blendMode = PIXI.BLEND_MODES.ADD;
  sp.x = x; sp.y = y; sp.alpha = .7; sp.scale.set(2 * r / F.size[0]); groundFx.addChild(sp);
  const p = { t: 0 }; p.update = dt => { p.t += dt; const q = p.t / life; if (q >= 1) { sp.destroy(); return false; } sp.texture = F.tex[Math.min(F.tex.length - 1, Math.floor(q * F.tex.length))]; return true; };
  effects.push(p);
}

/* hit events from hero clips */
function onHit(h, a, i) {
  const sc = depthScale(h.y) / .45;
  if (a.kind === "basic") {
    const m = a.target; const heavy = a.name === "slash3";
    if (m && !m.dead && Math.hypot(m.x - h.x, (m.y - h.y) * 1.25) < (m.reach || 0) + 95 * sc) {
      damageMob(m, heavy ? rand(4200, 4800) : rand(2100, 2600), { critRate: heavy ? .3 : .16, shake: heavy ? 8 : 3.5, stop: heavy ? .1 : .055 });
      if (heavy) { ring(m.x, m.y, { tint: 0x9ff7e8, s0: .1, s1: .9, life: .35 }); burst(m.x, m.y, 8, { tex: FX.dust, add: false, s0: .5, s1: 1.2, life: .6, tint: 0xd8c4a0, alpha: .8 }); }
    }
    if (heavy) { const [fx, fy] = h.facingVec(); quakeFx(h.x + fx * 30 * sc, h.y + fy * 14 * sc, 55 * sc, .45); }
  } else if (a.name === "tidecleave") {
    const r = 120 * sc;
    for (const m of mobsInRadius(h.x, h.y, r)) damageMob(m, rand(3600, 4200), { critRate: .2, tint: 0x6fe8ff });
    ring(h.x, h.y, { tint: 0x5fd8ff, s0: .3, s1: 1.1 * sc, life: .4, tex: FX.disc });
    burst(h.x, h.y - 40 * h.scale, 14, { tex: FX.glow, tint: 0x8ff5ff, s0: .45, s1: 0, life: .6, v0: 160, v1: 380 });
  } else if (a.name === "mossquake") {
    const r = 175 * sc;
    for (const m of mobsInRadius(h.x, h.y, r)) damageMob(m, rand(7200, 8400), { critRate: .25, shake: 0, stop: .12, tint: 0xb6ff8a });
    shake(16); hitstop = Math.max(hitstop, .11);
    quakeFx(h.x, h.y, r, .75);
    ring(h.x, h.y, { tint: 0xfff2c4, s0: .1, s1: 1.2 * sc, life: .35, sy: .42 });
    ring(h.x, h.y, { tint: 0x6aa84f, s0: .3, s1: 2.3 * sc, life: .9, sy: .42, tex: FX.disc, alpha: .6 });
    for (let k = 0; k < 14; k++) { const ang = rand(0, TAU), v = rand(140, 320) * sc; particle({ tex: FX.rock, add: false, x: h.x + Math.cos(ang) * 30 * sc, y: h.y + Math.sin(ang) * 14 * sc, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v * .5, z: 4, vz: rand(180, 380), gz: 950, s0: rand(.45, .8) * sc, s1: .3, life: 1, drag: .97, vr: rand(-9, 9) }); }
    burst(h.x, h.y, 12, { tex: FX.dust, add: false, s0: .35, s1: 1.0, life: .7, tint: 0xf0e2c4, alpha: .45, v0: 120, v1: 260 });
    burst(h.x, h.y, 14, { tex: FX.leaf, add: false, s0: .6, s1: .3, life: 1.2, g: 200, v0: 100, v1: 300, vr: 7, flat: .9 });
  } else if (a.name === "mend") {
    const amt = Math.round(hero.maxHp * .32); hero.hp = Math.min(hero.maxHp, hero.hp + amt);
    dmgText(h.x, h.y - 170 * h.scale, amt, "heal");
    ring(h.x, h.y, { tint: 0x9dff7a, s0: .2, s1: 1.2 * sc, life: .7, tex: FX.disc });
    for (let k = 0; k < 22; k++) particle({ tex: FX.leaf, add: false, x: h.x + rand(-50, 50) * sc, y: h.y + rand(-10, 10), vy: rand(-140, -60), vx: rand(-20, 20), g: -30, s0: rand(.4, .7), s1: .2, life: rand(.9, 1.5), vr: rand(-4, 4), drag: .99, fadeIn: .2 });
    for (let k = 0; k < 18; k++) particle({ tex: FX.glow, x: h.x + rand(-45, 45) * sc, y: h.y - rand(0, 120) * h.scale, vy: rand(-90, -30), tint: 0xc8ff9a, s0: .35, s1: 0, life: rand(.8, 1.3), drag: .99 });
  }
}

function useSkill(i) {
  const S = SKILLS[i]; if (!S || hero.dead) return;
  if ((cds[S.id] || 0) > 0) return;
  if (hero.mp < S.cost) { log(`<span class="w">[ระบบ] MP ไม่พอสำหรับ ${S.name}</span>`); return; }
  if (S.id !== "potion" && hero.busy()) { hero.queued = i; return; }
  hero.mp -= S.cost; cds[S.id] = S.cd; flashSlot(i);
  const sc = depthScale(hero.y) / .45;
  const tgt = hero.target && !hero.target.dead ? hero.target : nearestMob(320 * sc);
  if (tgt) hero.face(tgt.x - hero.x, tgt.y - hero.y);
  hero.path = [];
  if (S.id === "potion") {
    const amt = 2500; hero.hp = Math.min(hero.maxHp, hero.hp + amt); dmgText(hero.x, hero.y - 170 * hero.scale, amt, "heal");
    burst(hero.x, hero.y - 60 * hero.scale, 12, { tex: FX.glow, tint: 0xff7a8a, s0: .35, s1: 0, life: .7, v0: 30, v1: 100, g: -160 });
    return;
  }
  log(`<span class="w">[สกิล] ${S.name} — ${S.th}</span>`);
  if (S.id === "galedash") {
    let [fx, fy] = tgt ? hitDir(hero, tgt) : hero.facingVec();
    const dist = 230 * sc, x0 = hero.x, y0 = hero.y, hitSet = new Set();
    hero.play("galedash", { kind: "skill", onUpdate: (t) => {
      if (t > .1 && t < .26) {
        const k = (t - .1) / .16, nx = x0 + fx * dist * easeOut(k), ny = y0 + fy * dist * easeOut(k) * .8;
        if (walkable(nx, ny)) { hero.x = nx; hero.y = ny; }
        ghost(hero);
        for (const m of mobsInRadius(hero.x, hero.y, 60 * sc)) if (!hitSet.has(m)) { hitSet.add(m); damageMob(m, rand(3000, 3600), { critRate: .35, tint: 0xd8fff6 }); }
        particle({ tex: FX.dust, add: false, x: hero.x, y: hero.y, s0: .4, s1: 1, life: .5, tint: 0xd8c4a0, alpha: .7 });
      }
    } });
    hero.invuln = .35;
  } else {
    hero.play(S.id, { kind: S.id === "mend" ? "cast" : "skill", target: tgt });
    if (S.id === "tidecleave") {
      const sw = { t: 0, rings: [] };
      const V = FXF.vortex, vt = V ? tex(V.file) : FX.crescent;
      for (let k = 0; k < 2; k++) {
        const outer = new PIXI.Container(), sp = new PIXI.Sprite(vt); sp.anchor.set(.5); sp.blendMode = PIXI.BLEND_MODES.ADD;
        outer.addChild(sp); (k ? fxLayer : groundFx).addChild(outer); sw.rings.push({ outer, sp });
      }
      sw.update = dt => {
        sw.t += dt; const k = sw.t / .9; if (k >= 1) { sw.rings.forEach(r => r.outer.destroy({ children: true })); return false; }
        const sc2 = depthScale(hero.y) / .45, dir = hero.rig.s * (hero.flip ? -1 : 1);
        sw.rings.forEach((r, j) => {
          const R = (150 + j * 22) * sc2 * (.7 + .3 * Math.min(1, k * 4)), circ = V ? V.size[1] / V.size[0] : 1;
          r.outer.x = hero.x; r.outer.y = hero.y - (j ? 46 : 8) * hero.scale;
          r.sp.scale.set(R / (V ? V.size[0] : 256), R / (V ? V.size[0] : 256) / circ);   // make the painted ellipse round...
          r.outer.scale.set(1, .42 * circ * (j ? 1.15 : 1));                          // ...spin it, then lay it on the ground
          r.sp.rotation = -sw.t * 13 * dir + j * 1.3;
          r.outer.alpha = Math.sin(k * Math.PI) * (j ? .35 : .6);
        });
        if (Math.random() < .5) particle({ tex: FX.drop, add: false, x: hero.x + rand(-70, 70) * sc, y: hero.y - rand(10, 50) * hero.scale, tint: 0x9fe8ff, s0: .45, s1: .1, life: .5, vy: -60, g: 260 });
        return true;
      };
      effects.push(sw);
    } else if (S.id === "mossquake") {
      // gathering moss before the leap
      for (let k = 0; k < 12; k++) particle({ tex: FX.glow, x: hero.x + rand(-80, 80) * sc, y: hero.y + rand(-20, 20), tint: 0x6fd04a, alpha: .6, s0: .05, s1: .22, life: .4, vx: 0, vy: -40 });
    } else if (S.id === "mend") {
      ring(hero.x, hero.y, { tint: 0x9dff7a, s0: 1.2 * sc, s1: .2, life: .45, tex: FX.ring });
    }
  }
}
function nearestMob(r) { let best = null, bd = r; for (const m of mobs) { if (m.dead) continue; const d = Math.hypot(m.x - hero.x, (m.y - hero.y) * 1.25); if (d < bd) { bd = d; best = m; } } return best; }
function ghost(h) {
  const s = new PIXI.Container(), snap = h.cur.snapshot();
  for (const m of snap.children) { m.tint = 0x6ff0e0; m.blendMode = PIXI.BLEND_MODES.ADD; }
  s.addChild(snap); s.x = h.x; s.y = h.y; s.scale.set(h.scale); s.alpha = .5;
  actorLayer.addChild(s); s.zIndex = h.y - 1;
  effects.push({ t: 0, update(dt) { this.t += dt; s.alpha = .5 * (1 - this.t / .3); if (this.t > .3) { s.destroy({ children: true }); return false; } return true; } });
}

/* ------------------------------------------------------------------ ambience: pollen, fireflies, water glints */
const AMB = [];
for (let i = 0; i < 46; i++) {
  const s = new PIXI.Sprite(FX.glow); s.anchor.set(.5); s.blendMode = PIXI.BLEND_MODES.ADD; s.tint = Math.random() < .5 ? 0xfff0b0 : 0xd8ffb0;
  s.x = rand(0, MAP_W); s.y = rand(0, MAP_H); const b = rand(.08, .18); s.scale.set(b); ambLayer.addChild(s);
  AMB.push({ s, b, ph: rand(0, TAU), vx: rand(-6, 6), vy: rand(-8, -2) });
}
const WATER = [[620, 440], [700, 470], [1110, 520], [1240, 560], [1350, 620], [1480, 700], [1560, 760], [1450, 820], [580, 330]];

/* ------------------------------------------------------------------ input */
app.stage.eventMode = "static"; app.stage.hitArea = app.screen;
let pressed = false, pressT = 0, lastPointer = null;
function pickMob(wx, wy) {
  let best = null, bd = 1e9;
  for (const m of mobs) {
    if (m.dead) continue;
    const hgt = m.h * m.scale * (m.sizeMul || 1), cx = m.x, cy = m.y - hgt * .45, rx = Math.max(30, m.w * m.scale * (m.sizeMul || 1) * .5), ry = hgt * .55;
    const d = ((wx - cx) / rx) ** 2 + ((wy - cy) / ry) ** 2; if (d < 1 && d < bd) { bd = d; best = m; }
  }
  return best;
}
function groundClick(wx, wy, quiet) {
  if (hero.dead) return;
  const [tx, ty] = nearestWalkable(clamp(wx, 0, MAP_W), clamp(wy, 0, MAP_H));
  hero.target = null; hero.path = findPath(hero.x, hero.y, tx, ty);
  if (!quiet) { ring(tx, ty, { tint: 0xffe7a8, s0: .25, s1: .05, life: .35, sy: .45, tex: FX.disc }); }
}
app.stage.on("pointerdown", e => {
  const p = world.toLocal(e.global); pressed = true; pressT = 0; lastPointer = p;
  const m = pickMob(p.x, p.y);
  if (m) { hero.target = m; hero.path = []; ring(m.x, m.y, { tint: 0xff7a5f, s0: .5, s1: .35, life: .3, sy: .45, tex: FX.disc }); pressed = false; }
  else groundClick(p.x, p.y);
});
app.stage.on("pointermove", e => { if (pressed) lastPointer = world.toLocal(e.global); });
app.stage.on("pointerup", () => { pressed = false; });
app.stage.on("pointerupoutside", () => { pressed = false; });
const keysDown = new Set();
addEventListener("keydown", e => {
  if (e.repeat && !/^(Arrow|Key[WASD])/.test(e.code)) return;
  keysDown.add(e.code);
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4 }[e.code];
  if (n !== undefined) useSkill(n);
  if (e.code === "Space") { e.preventDefault(); const m = nearestMob(420); if (m) hero.target = m; }
  if (e.code === "KeyG") debugWalk.visible = !debugWalk.visible;
  if (e.code === "KeyR" && !e.repeat) { hero.runMode = !hero.runMode; log(`<span class="w">[ระบบ] ${hero.runMode ? "วิ่ง" : "เดิน"}</span>`); }
  if (/^Arrow/.test(e.code)) e.preventDefault();
});
addEventListener("keyup", e => keysDown.delete(e.code));
addEventListener("blur", () => keysDown.clear());

/* debug overlay of walkable polygons (press G) */
const debugWalk = new PIXI.Graphics(); debugWalk.visible = false; groundFx.addChild(debugWalk);
for (const poly of WALK) { debugWalk.lineStyle(2, 0x00ffcc, .9); debugWalk.beginFill(0x00ffcc, .15); debugWalk.drawPolygon(poly.flat()); debugWalk.endFill(); }

/* ------------------------------------------------------------------ HUD */
const $ = id => document.getElementById(id);
const quest = { slime: 0, boar: 0 };
function log(html) { const el = $("log"); const d = document.createElement("div"); d.innerHTML = html; el.appendChild(d); while (el.children.length > 7) el.firstChild.remove(); }
let bannerTimer;
function banner(t, sub) { const b = $("banner"); b.innerHTML = `${t}<small>${sub || ""}</small>`; b.classList.add("show"); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove("show"), 2800); }

function iconCanvas(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 120; const g = c.getContext("2d");
  const bgs = { tide: ["#0c3a5a", "#2fa7d8"], quake: ["#2d3f16", "#8bbf45"], dash: ["#16403c", "#5fe0c8"], mend: ["#1f4a18", "#a9f27a"], potion: ["#4a1420", "#ff7a8a"] }[kind];
  const gr = g.createRadialGradient(60, 70, 10, 60, 60, 80); gr.addColorStop(0, bgs[1]); gr.addColorStop(1, bgs[0]); g.fillStyle = gr; g.fillRect(0, 0, 120, 120);
  g.translate(60, 60); g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "tide") { for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(255,255,255,${.95 - i * .25})`; g.lineWidth = 9 - i * 2; g.beginPath(); g.arc(0, 0, 38 - i * 11, -2.6 + i, .6 + i); g.stroke(); } }
  if (kind === "quake") { g.fillStyle = "#f6e7b0"; g.beginPath(); g.moveTo(-6, -44); g.lineTo(14, -6); g.lineTo(2, -4); g.lineTo(12, 30); g.lineTo(-12, -10); g.lineTo(0, -12); g.closePath(); g.fill(); g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 34, 40, 10, 0, 0, Math.PI * 2); g.stroke(); }
  if (kind === "dash") { g.strokeStyle = "#fff"; g.lineWidth = 7; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-40 + i * 6, -18 + i * 18); g.lineTo(30 + i * 6, -18 + i * 18); g.stroke(); } g.fillStyle = "#fff"; g.beginPath(); g.moveTo(26, -34); g.lineTo(46, 0); g.lineTo(26, 34); g.closePath(); g.fill(); }
  if (kind === "mend") { g.fillStyle = "#eaffc8"; g.beginPath(); g.moveTo(0, -42); g.bezierCurveTo(40, -20, 30, 30, 0, 40); g.bezierCurveTo(-30, 30, -40, -20, 0, -42); g.fill(); g.strokeStyle = "#3f8a2c"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 34); g.stroke(); g.fillStyle = "#fff"; g.fillRect(24, -40, 8, 26); g.fillRect(15, -31, 26, 8); }
  if (kind === "potion") { g.fillStyle = "#ffd1d8"; g.fillRect(-8, -40, 16, 14); g.fillStyle = "#ff4d6a"; g.beginPath(); g.arc(0, 8, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(-10, -2, 7, 12, -.5, 0, Math.PI * 2); g.fill(); }
  return c.toDataURL();
}
const hotbar = $("hotbar");
SKILLS.forEach((S, i) => {
  const b = document.createElement("button"); b.className = "slot"; b.id = "slot-" + S.id;
  b.style.backgroundImage = `url(${man.icons && man.icons[S.icon] ? A + man.icons[S.icon] : iconCanvas(S.icon)})`;
  b.title = `${S.name} — ${S.th}${S.cost ? ` (MP ${S.cost})` : ""}`; b.setAttribute("aria-label", b.title);
  b.innerHTML = `<span class="cd"></span>${S.cost ? `<span class="cost">${S.cost}</span>` : ""}<span class="key">${i + 1}</span>`;
  b.addEventListener("pointerdown", e => { e.stopPropagation(); useSkill(i); });
  hotbar.appendChild(b);
});
function flashSlot(i) { const b = hotbar.children[i]; b.classList.add("flash"); setTimeout(() => b.classList.remove("flash"), 120); }
$("helpBtn").addEventListener("click", () => { const h = $("help"); h.hidden = !h.hidden; $("helpBtn").setAttribute("aria-expanded", String(!h.hidden)); });

const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const [faceImg, mapImg] = await Promise.all([loadImg(A + man.hero.se.head), loadImg(A + man.map.file)]);
// portrait: the hero's SE head (256x256 head canvas, the head sits around y 135-231)
if (faceImg) { const g = $("portrait").getContext("2d"); g.fillStyle = "#30483a"; g.fillRect(0, 0, 116, 116); g.drawImage(faceImg, 66, 128, 112, 112, 2, 6, 112, 112); }

// minimap
const mm = $("minimap"), mg = mm.getContext("2d");
function drawMinimap() {
  const S = 300, view = 760, k = S / view, ox = hero.x - view / 2, oy = hero.y - view / 2;
  mg.save(); mg.clearRect(0, 0, S, S); mg.beginPath(); mg.arc(S / 2, S / 2, S / 2, 0, TAU); mg.clip();
  mg.fillStyle = "#20301f"; mg.fillRect(0, 0, S, S);
  if (mapImg) mg.drawImage(mapImg, ox, oy, view, view, 0, 0, S, S);
  mg.fillStyle = "rgba(20,30,10,.25)"; mg.fillRect(0, 0, S, S);
  for (const m of mobs) { if (m.dead) continue; mg.fillStyle = m.boss ? "#ff4a35" : "#9dff7a"; mg.beginPath(); mg.arc((m.x - ox) * k, (m.y - oy) * k, m.boss ? 9 : 5, 0, TAU); mg.fill(); }
  mg.translate(S / 2, S / 2); mg.fillStyle = "#fff"; mg.strokeStyle = "#0b6b5f"; mg.lineWidth = 3;
  const [fx, fy] = hero.facingVec(); mg.rotate(Math.atan2(fy, fx) + Math.PI / 2);
  mg.beginPath(); mg.moveTo(0, -13); mg.lineTo(9, 9); mg.lineTo(0, 4); mg.lineTo(-9, 9); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
}

let bossLag = 1, hudT = 0;
function updateHud(dt) {
  hudT += dt; if (hudT < 1 / 20) return; hudT = 0;
  $("hpFill").style.transform = `scaleX(${clamp(hero.hp / hero.maxHp, 0, 1)})`; $("hpText").textContent = `${fmt(hero.hp)} / ${fmt(hero.maxHp)}`;
  $("mpFill").style.transform = `scaleX(${clamp(hero.mp / hero.maxMp, 0, 1)})`; $("mpText").textContent = `${fmt(hero.mp)} / ${fmt(hero.maxMp)}`;
  SKILLS.forEach((S, i) => { const b = hotbar.children[i], left = Math.max(0, cds[S.id] || 0); b.querySelector(".cd").style.setProperty("--p", `${(left / S.cd) * 100}%`); b.classList.toggle("nomp", hero.mp < S.cost); });
  const engaged = !boss.dead && (boss.aggro || hero.target === boss);
  $("boss").style.opacity = engaged ? 1 : 0;
  const k = clamp(boss.hp / boss.maxHp, 0, 1); bossLag = Math.max(k, bossLag - .02); if (bossLag < k) bossLag = k;
  $("bossFill").style.transform = `scaleX(${k})`; $("bossLag").style.transform = `scaleX(${bossLag})`; $("bossText").textContent = `${fmt(boss.hp)} / ${fmt(boss.maxHp)}`;
  $("q1").textContent = `กำจัดสไลม์ต้นอ่อน ${quest.slime}/5`; $("q1").classList.toggle("done", quest.slime >= 5);
  $("q2").textContent = `ปราบหมูป่ามอส ${quest.boar}/1`; $("q2").classList.toggle("done", quest.boar >= 1);
  drawMinimap();
}

/* ------------------------------------------------------------------ main loop */
function updateCamera(dt) {
  const sw = app.screen.width, sh = app.screen.height;
  cam.zoom = clamp(Math.max(sw / 1000, sh / 560) * CAM_WIDE, .5, 1.6);   // owner: wider view (v0.3: x0.72)
  const vw = sw / cam.zoom, vh = sh / cam.zoom;
  const tx = clamp(hero.x, vw / 2, Math.max(vw / 2, MAP_W - vw / 2)), ty = clamp(hero.y - 40, vh / 2, Math.max(vh / 2, MAP_H - vh / 2));
  const k = 1 - Math.pow(.02, dt); cam.x = lerp(cam.x, vw >= MAP_W ? MAP_W / 2 : tx, k); cam.y = lerp(cam.y, vh >= MAP_H ? MAP_H / 2 : ty, k);
  cam.shake *= Math.pow(.004, dt);
  const sx = (Math.random() * 2 - 1) * cam.shake, sy = (Math.random() * 2 - 1) * cam.shake;
  world.scale.set(cam.zoom); world.x = sw / 2 - (cam.x + sx) * cam.zoom; world.y = sh / 2 - (cam.y + sy) * cam.zoom;
}

let regenT = 0;
function frame(rdtIn) {
  const rdt = Math.min(rdtIn, 1 / 20);
  let dt = rdt;
  if (hitstop > 0) { hitstop -= rdt; dt = rdt * .04; }
  // keyboard movement
  let kx = 0, ky = 0;
  if (keysDown.has("KeyA") || keysDown.has("ArrowLeft")) kx -= 1;
  if (keysDown.has("KeyD") || keysDown.has("ArrowRight")) kx += 1;
  if (keysDown.has("KeyW") || keysDown.has("ArrowUp")) ky -= 1;
  if (keysDown.has("KeyS") || keysDown.has("ArrowDown")) ky += 1;
  if ((kx || ky) && !hero.dead) { const l = Math.hypot(kx, ky); const tx = hero.x + kx / l * 40, ty = hero.y + ky / l * 28; hero.target = null; if (walkable(tx, ty)) hero.path = [[tx, ty]]; else hero.path = []; }
  if (pressed && lastPointer) { pressT += rdt; if (pressT > .18) { pressT = .05; groundClick(lastPointer.x, lastPointer.y, true); } }
  for (const k in cds) cds[k] = Math.max(0, cds[k] - dt);
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  regenT += dt; if (regenT > .25) { regenT = 0; if (!hero.dead) { hero.mp = Math.min(hero.maxMp, hero.mp + 12); if (!mobs.some(m => m.aggro && !m.dead)) hero.hp = Math.min(hero.maxHp, hero.hp + 40); } }
  if (hero.queued !== undefined && !hero.busy()) { const q = hero.queued; hero.queued = undefined; useSkill(q); }
  hero.update(dt);
  if (hero.dead) hero.root.alpha = Math.max(.25, hero.root.alpha - rdt);
  for (const m of mobs) m.update(dt);
  separate(dt);
  for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].update(hitstop > 0 ? rdt * .25 : rdt)) effects.splice(i, 1);
  for (const a of AMB) { a.ph += rdt; a.s.x += (a.vx + Math.sin(a.ph * .7) * 8) * rdt; a.s.y += a.vy * rdt; a.s.alpha = .35 + .35 * Math.sin(a.ph * 1.7); if (a.s.y < -10) { a.s.y = MAP_H + 10; a.s.x = rand(0, MAP_W); } }
  if (Math.random() < .25) { const w = WATER[(Math.random() * WATER.length) | 0]; particle({ tex: FX.spark, x: w[0] + rand(-40, 40), y: w[1] + rand(-20, 20), s0: .05, s1: .22, life: .5, tint: 0xe8ffff, alpha: .8, layer: groundFx, drag: 1 }); }
  updatePlate(hero, 292); for (const m of mobs) updatePlate(m, m.h - (m.h - m.feet[1]) + 6);
  updateCamera(rdt); updateHud(rdt);
}
app.ticker.add(() => frame(app.ticker.deltaMS / 1000));

log(`<span class="w">[World] Minae: LFM Mossback (2/4), any role!</span>`);
log(`<span class="g">[Guild] Riven: Bridge looks clear on west side.</span>`);
log(`[General] ยินดีต้อนรับสู่ Mossbridge — ข้ามสะพานไปทุ่งหญ้าทางขวาเพื่อตามล่าสไลม์และหมูป่ามอส`);
$("loading").classList.add("gone");
// test hook: deterministic stepping (used by the screenshot scripts; harmless in play)
window.__mossbridge = { hero, mobs, boss, useSkill, findPath, walkable, cam, app,
  step(sec, fps = 60) { app.ticker.stop(); for (let i = 0; i < Math.round(sec * fps); i++) frame(1 / fps); app.render(); },
  resume() { app.ticker.start(); } };
setTimeout(() => { const h = $("help"); if (!h.hidden) { h.hidden = true; $("helpBtn").setAttribute("aria-expanded", "false"); } }, 9000);
})();
