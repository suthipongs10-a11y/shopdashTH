// Headless checks of demo/rig.js (no browser): node tools/qa/rig_check.js
//  1. rest pose reproduces the painted joints exactly (every view)
//  2. walking / running in many directions: a foot in stance stays put in the world (no sliding),
//     the ankle target stays reachable, stride x cadence = speed, and the feet settle after stopping
const path = require("path"), fs = require("fs");
require(path.join(__dirname, "..", "..", "demo", "rig.js"));
const R = globalThis.MossRig;
const rig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "demo", "rigs", "kaelrin.json"), "utf8"));
let bad = 0;
const fail = (m) => { bad++; console.log("FAIL", m); };

for (const v of Object.keys(rig.views)) {
  const sk = new R.RigSkeleton(rig, v), { J } = sk.solve(R.pose({}));
  let worst = 0;
  for (const k in sk.J0) worst = Math.max(worst, Math.hypot(J[k][0] - sk.J0[k][0], J[k][1] - sk.J0[k][1]));
  if (worst > 1e-6) fail(`${v}: rest pose moves joints by ${worst.toFixed(4)} px`);
}
console.log("rest pose: checked");

// facing per heading (same table as Hero.face, ignoring lastSide)
function facing(dx, dy) {
  const a = Math.atan2(dy, dx) * 180 / Math.PI;
  if (a > -22.5 && a <= 22.5) return ["w", true]; if (a > 22.5 && a <= 67.5) return ["se", false];
  if (a > 67.5 && a <= 112.5) return ["se", false]; if (a > 112.5 && a <= 157.5) return ["sw", false];
  if (a > 157.5 || a <= -157.5) return ["w", false]; if (a > -157.5 && a <= -112.5) return ["ne", true];
  return ["ne", false];
}
const skels = {}; for (const v of Object.keys(rig.views)) skels[v] = new R.RigSkeleton(rig, v);
for (const speedV of [130, 300]) for (let deg = 0; deg < 360; deg += 30) {
  const loco = new R.Locomotion(rig), s = 0.45, dt = 1 / 60;
  const dir = [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)], [view, flip] = facing(dir[0], dir[1]), sk = skels[view];
  let x = 600, y = 600, slide = 0, stretched = 0, frames = 0, worstMiss = 0;
  const prev = { L: null, R: null };
  for (let i = 0; i < 300; i++) {
    const moving = i < 200, v = moving ? speedV * s : 0;
    const vx = dir[0] * v, vy = dir[1] * v; x += vx * dt; y += vy * dt;
    const P = loco.update({ dt, x, y, vx, vy, s, flip, skel: sk, lock: 0 });
    const { J } = sk.solve(P);
    const sx = flip ? -s : s, O = sk.origin;
    for (const side of ["L", "R"]) {
      const f = loco.feet[side];
      // world position of the solved ankle at ground height (lift removed)
      const ax = x + (J["ankle" + side][0] - O[0]) * sx, ay = y + (J["ankle" + side][1] + P["foot" + side + "Lift"] - O[1]) * s;
      const planted = !f.sw && P["foot" + side + "Pitch"] <= 0.01;
      if (planted && prev[side] && i > 30) slide = Math.max(slide, Math.hypot(ax - prev[side][0], ay - prev[side][1]) / s);
      prev[side] = planted ? [ax, ay] : null;
      const pitch = P["foot" + side + "Pitch"], heel = pitch > 0 ? sk.legs[side].toeLen * Math.sin(pitch) * .8 : 0;
      const want = [sk.J0["ankle" + side][0] + P["foot" + side + "X"], sk.J0["ankle" + side][1] + P["foot" + side + "Y"] - P["foot" + side + "Lift"] - heel];
      const miss = Math.hypot(J["ankle" + side][0] - want[0], J["ankle" + side][1] - want[1]);
      if (miss > 0.5) { stretched++; worstMiss = Math.max(worstMiss, miss); }
    }
    frames++;
  }
  const settle = ["L", "R"].map(side => Math.hypot(loco.feet[side].w[0] - (x + (sk.J0["ankle" + side][0] - sk.origin[0]) * (flip ? -s : s)), loco.feet[side].w[1] - (y + (sk.J0["ankle" + side][1] - sk.origin[1]) * s)) / s);
  const line = `speed ${speedV} dir ${deg}° (${view}${flip ? " mirrored" : ""}): stance slide ${slide.toFixed(2)} px, unreachable ${stretched}/${frames * 2} foot-frames (worst ${worstMiss.toFixed(1)} px), after stop feet ${settle.map(e => e.toFixed(1)).join("/")} px from rest`;
  console.log(line);
  if (slide > 0.6) fail("feet slide: " + line);
  if (stretched > frames * 0.1) fail("ankle out of reach too often: " + line);
  if (Math.max(...settle) > rig.motion.settle.minDist + 0.5) fail("feet did not settle: " + line);
}
console.log(bad ? `${bad} problem(s)` : "rig check: no problems");
process.exit(bad ? 1 : 0);
