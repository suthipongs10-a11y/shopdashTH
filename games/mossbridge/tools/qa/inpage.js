// In-page QA helper (no Playwright). Load in the running demo served by tools/qa/serve.js:
//   await import('/__qa/inpage.js')  ->  window.__qa
// Every capture steps the game deterministically (window.__mossbridge.step), zooms the camera on
// the hero, copies the canvas, and `save(name)` posts a labelled contact sheet to qa-out/<name>.png.
const g = window.__mossbridge;
const DIR = { sw: [-1, 1], se: [1, 1], w: [-1, 0], e: [1, 0], ne: [1, -1], nw: [-1, -1] };
let frames = [];
const hud = on => document.querySelectorAll(".hud,.vignette,#loading").forEach(e => { e.style.display = on ? "" : "none"; });

function setup(view, x = 650, y = 700) {
  const h = g.hero; g.step(0.01);
  h.path = []; h.target = null; h.action = null; h.x = x; h.y = y; h.speedCur = 0; h.dead = false; h.loco.reset();
  const d = DIR[view]; h.face(d[0], d[1]); g.step(0.6);
}
/* copy the hero region of the canvas. z = camera zoom, cell size in CSS px */
function shot(label, { z = 1.9, cw = 230, ch = 300 } = {}) {
  const h = g.hero, w = g.app.stage.children[0], W = g.app.screen.width, H = g.app.screen.height;
  w.scale.set(z); w.x = W / 2 - h.x * z; w.y = H * 0.82 - h.y * z; g.app.render();
  const r = g.app.renderer.resolution, c = document.createElement("canvas"); c.width = cw; c.height = ch;
  c.getContext("2d").drawImage(g.app.view, (W / 2 - cw / 2) * r, (H * 0.82 - ch + 30) * r, cw * r, ch * r, 0, 0, cw, ch);
  frames.push([c, label]); return c;
}
async function save(name, cols = 6, scale = 1) {
  const cw = frames[0][0].width, ch = frames[0][0].height, rows = Math.ceil(frames.length / cols);
  const s = document.createElement("canvas"); s.width = cols * cw * scale; s.height = rows * ch * scale;
  const x = s.getContext("2d"); x.fillStyle = "#222"; x.fillRect(0, 0, s.width, s.height);
  frames.forEach(([c, label], i) => {
    const px = (i % cols) * cw * scale, py = Math.floor(i / cols) * ch * scale;
    x.drawImage(c, px, py, cw * scale, ch * scale);
    x.fillStyle = "#ff0"; x.font = "13px sans-serif"; x.fillText(label, px + 4, py + 14); x.strokeStyle = "#555"; x.strokeRect(px, py, cw * scale, ch * scale);
  });
  frames = [];
  const r = await fetch("/__qa/save/" + name + ".png", { method: "POST", body: s.toDataURL("image/png") });
  return r.text();
}
/* walk or run toward a view: warm-up, then n frames dt apart */
function walk(view, n, dt, { run = true, warm = 0.8, opt } = {}) {
  setup(view); const h = g.hero; h.runMode = run; const f = h.facingVec();
  h.path = [[h.x + f[0] * 3000, h.y + f[1] * 3000]]; g.step(warm);
  for (let i = 0; i < n; i++) { g.step(dt); shot(`${view} ${run ? "run" : "walk"} +${(i * dt).toFixed(2)}`, opt); }
}
/* start from idle, run `go` seconds toward a point `dist` away, keep capturing until settled */
function startStop(view, { run = true, dist = 120, n = 16, dt = 0.05, opt } = {}) {
  setup(view); const h = g.hero; h.runMode = run; const f = h.facingVec();
  h.path = [[h.x + f[0] * dist, h.y + f[1] * dist]];
  for (let i = 0; i < n; i++) { g.step(dt); shot(`${view} ${run ? "run" : "walk"} ${i * dt + dt >= 0 ? "t" : ""}${((i + 1) * dt).toFixed(2)} v${(h.loco.speed | 0)}`, opt); }
}
/* run one way, then turn toward another view mid-stride */
function turn(from, to, { n = 10, dt = 0.03, opt } = {}) {
  setup(from); const h = g.hero; h.runMode = true; let f = h.facingVec();
  h.path = [[h.x + f[0] * 3000, h.y + f[1] * 3000]]; g.step(0.6);
  const d = DIR[to]; h.path = [[h.x + d[0] * 3000, h.y + d[1] * 3000]];
  for (let i = 0; i < n; i++) { g.step(dt); shot(`${from}->${to} ${((i + 1) * dt).toFixed(2)}`, opt); }
}
/* an attack clip or skill: ts = capture times (s) */
function clip(view, name, ts, { skill, opt } = {}) {
  setup(view); if (skill !== undefined) g.useSkill(skill); else g.hero.play(name, { kind: "basic" });
  let t = 0; for (const tt of ts) { g.step(tt - t); t = tt; shot(`${view} ${name || "skill" + skill} ${tt}`, opt); }
}
/* the qa:sim body: 90 s fight, must end with no errors */
function sim() {
  const out = [], errors = [];
  const onErr = e => errors.push(String(e.message || e));
  window.addEventListener("error", onErr);
  try {
    g.step(.1); g.hero.path = g.findPath(g.hero.x, g.hero.y, 1200, 320);
    for (let sec = 0; sec < 90; sec++) {
      if (!g.hero.target || g.hero.target.dead) { const live = g.mobs.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - g.hero.x, a.y - g.hero.y) - Math.hypot(b.x - g.hero.x, b.y - g.hero.y)); g.hero.target = live.find(m => !m.boss) || live[0]; }
      if (sec % 3 === 0) g.useSkill(sec % 4);
      if (g.hero.hp < 4000) g.useSkill(4);
      g.step(1, 30);
      if (sec % 15 === 14) out.push({ sec, hp: g.hero.hp | 0, dead: g.hero.dead, alive: g.mobs.filter(m => !m.dead).length, boss: g.boss.hp | 0 });
    }
  } catch (e) { errors.push("exception: " + e.message + "\n" + e.stack); }
  window.removeEventListener("error", onErr);
  return { out, errors };
}
/* Film a scripted walk around the map at a fixed 30 fps (deterministic, so it is smooth even on a
   slow or hidden browser). plan items: {idle: s} | {go: [x, y], run: bool, then?: [x, y], at?: s}
   ("then" re-targets mid-move after `at` seconds, to show a turn). Frames go to qa-out/<prefix>_0001.png...
   Call film() once per item if a single call would run too long; it keeps the frame counter. */
const cam = { x: 0, y: 0, on: false };
let filmN = 0;
async function frameOut(prefix, { z = 1.7, w = 720, h = 540 } = {}) {
  const hero = g.hero, wd = g.app.stage.children[0], W = g.app.screen.width, H = g.app.screen.height;
  if (!cam.on) { cam.x = hero.x; cam.y = hero.y; cam.on = true; }
  cam.x += (hero.x - cam.x) * .12; cam.y += (hero.y - 70 - cam.y) * .12;
  wd.scale.set(z); wd.x = W / 2 - cam.x * z; wd.y = H / 2 - cam.y * z; g.app.render();
  const r = g.app.renderer.resolution, c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(g.app.view, (W / 2 - w / 2) * r, (H / 2 - h / 2) * r, w * r, h * r, 0, 0, w, h);
  filmN++;
  await fetch(`/__qa/save/${prefix}_${String(filmN).padStart(4, "0")}.png`, { method: "POST", body: c.toDataURL("image/png") });
}
async function film(prefix, plan, opt) {
  const hero = g.hero;
  for (const it of plan) {
    if (it.reset) { filmN = 0; cam.on = false; }
    if (it.place) { hero.x = it.place[0]; hero.y = it.place[1]; hero.path = []; hero.speedCur = 0; hero.loco.reset(); if (it.face) hero.face(...it.face); g.step(.5); }
    if (it.idle) for (let t = 0; t < it.idle; t += 1 / 30) { g.step(1 / 30, 60); await frameOut(prefix, opt); }
    if (it.go) {
      hero.runMode = !!it.run; hero.target = null; hero.path = g.findPath(hero.x, hero.y, ...it.go);
      let t = 0, still = 0;
      while (t < 8 && still < .45) {
        if (it.then && t >= it.at && !it.done) { it.done = true; hero.path = g.findPath(hero.x, hero.y, ...it.then); }
        g.step(1 / 30, 60); t += 1 / 30; await frameOut(prefix, opt);
        still = hero.path.length || hero.loco.speed > 1 ? 0 : still + 1 / 30;
      }
    }
  }
  return filmN;
}
window.__qa = { setup, shot, save, walk, startStop, turn, clip, sim, hud, film, g, frames: () => frames.length };
hud(false);
export default window.__qa;
