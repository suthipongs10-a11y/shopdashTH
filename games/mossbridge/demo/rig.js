/* rig.js — Mossbridge cutout rig runtime (shared by game.js and rig-editor.html).
 *
 *  RigSkeleton  one view's rest joints + bones; solve(pose) -> current joints. Legs and arms move in
 *               the character's own "walking plane" (forward on the ground + up), projected with the
 *               view's `fwd` vector, so a step toward the camera moves the foot down the screen.
 *               Legs use 2-bone IK on an ankle target (planted feet); arms use FK swing + IK reach.
 *  RigView      PixiJS pieces of one view (or its mirror): each cut piece is a mesh skinned to its
 *               bones; the head is a mesh pinned to the neck (hair spring), the weapon a sprite.
 *  Locomotion   procedural idle / walk / run with world-planted feet, start / stop / turn accents.
 *               Stride x cadence equals the real speed because a foot in stance never moves.
 *  Tracks       keyframes [[t, v], ...] sampled with smooth cubic Hermite; cycles are periodic.
 *
 *  Units: "view px" = pixels of the 320x320 painting (view.root = ground point between the feet); the game scales
 *  the whole rig by depthScale. Angles in radians. Pose channels are plain numbers (see POSE).
 */
(function (global) {
"use strict";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const frac = x => x - Math.floor(x);

/* every channel a pose can set; all additive-friendly numbers (0 = rest painting) */
const POSE = {
  air: 0, squash: 1, squashX: 1, bodyU: 0, bodyF: 0, bodyL: 0, lean: 0, tilt: 0, hipRoll: 0, breath: 0, head: 0,
  armLSwing: 0, armLBend: 0, armLReachF: 0, armLReachU: 0, armRSwing: 0, armRBend: 0, armRReachF: 0, armRReachU: 0,
  footLX: 0, footLY: 0, footLLift: 0, footLPitch: 0, footRX: 0, footRY: 0, footRLift: 0, footRPitch: 0,
  footLF: 0, footLS: 0, footRF: 0, footRS: 0,   // extra foot move forward / sideways (view independent)
  weaponRot: 0, weaponTop: 0,
};
/* Channel meaning (the same in every view; the solver turns it into screen motion per view):
   lean +   = chest forward        armXSwing + = hand forward (pi/2 = arm straight ahead, pi = overhead)
   head +   = nod down             armXBend +  = forearm folds forward / up
   weaponRot + = blade tip turns forward/up from where the fist holds it
   footXF / footXS = foot moved forward / to the character's right, in view px
   footXX / footXY = raw screen offset (locomotion's planted feet), footXLift = up, footXPitch + = heel up */
const pose = (o) => Object.assign({}, POSE, o);
function blendPose(a, b, w) { const o = {}; for (const k in POSE) o[k] = lerp(a[k] ?? POSE[k], b[k] ?? POSE[k], w); return o; }

/* ------------------------------------------------------------------ tracks */
// keys [[t, v], ...] sorted by t. period: wrap t into [0, period) and treat keys[0]/keys[n-1] as joined
// (author the last key at t = period with the first key's value). Tangents: Catmull-Rom style.
// A key may carry an easing for the segment that ARRIVES at it: [t, v, "in" | "out" | "io" | "lin"]
// ("in" = accelerate into the key, e.g. a strike; "out" = decelerate, e.g. a wind-up settling).
const EASE = { lin: k => k, in: k => k * k * k, out: k => 1 - (1 - k) ** 3, io: k => (k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2) };
function sample(keys, t, period) {
  if (!keys || !keys.length) return 0;
  const n = keys.length;
  if (n === 1) return keys[0][1];
  if (period) t = frac(t / period) * period;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i], [t1, v1, ease] = keys[i + 1];
  if (ease && EASE[ease]) return v0 + (v1 - v0) * EASE[ease]((t - t0) / (t1 - t0));
  const tan = (j) => {
    let pj = keys[j - 1], nj = keys[j + 1];
    if (period) { if (j === 0) pj = [keys[n - 2][0] - period, keys[n - 2][1]]; if (j === n - 1) nj = [keys[1][0] + period, keys[1][1]]; }
    if (!pj || !nj || keys[j][2] || (keys[j + 1] && keys[j + 1][2])) return 0;   // flat next to eased keys
    return (nj[1] - pj[1]) / (nj[0] - pj[0]);
  };
  const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
  const m0 = tan(i) * h, m1 = tan(i + 1) * h;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1;
}
/* clip = { dur, loop?, tracks: { channel: keys } } -> partial pose at time t */
function sampleClip(clip, t, out = {}, weight = 1, add = false) {
  const per = clip.loop ? clip.dur : 0;
  for (const ch in clip.tracks) { const v = sample(clip.tracks[ch], t, per) * weight; out[ch] = add ? (out[ch] || 0) + v : v; }
  return out;
}

/* ------------------------------------------------------------------ 2D helpers */
const rot = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const perp = (a) => [-a[1], a[0]];

/* ------------------------------------------------------------------ skeleton */
class RigSkeleton {
  constructor(rig, viewName) {
    const V = rig.views[viewName];
    this.rig = rig; this.name = viewName; this.V = V;
    this.origin = V.root || rig.origin; this.fwd = V.fwd; this.right = V.right || [0, 0];   // root = ground point under the body
    this.J0 = {}; for (const k in V.joints) this.J0[k] = V.joints[k].slice();
    this.bones = rig.bones.map(b => ({ ...b }));
    this.boneIx = {}; this.bones.forEach((b, i) => { this.boneIx[b.name] = i; });
    // rest frames
    for (const b of this.bones) { const A = this.J0[b.from], B = this.J0[b.to]; const e = sub(B, A), L = len(e) || 1; b.A0 = A; b.L0 = L; b.t0 = mul(e, 1 / L); b.n0 = perp(b.t0); }
    // rest IK solutions (delta IK keeps the painting exact at rest)
    this.legs = {}; this.arms = {};
    for (const s of ["L", "R"]) {
      // In the walking plane the rest leg is vertical: its sideways slant in the painting (the
      // stance) is kept as a constant screen offset `o`, so steps forward and back reach equally.
      const H = this.J0["hip" + s], K = this.J0["knee" + s], A = this.J0["ankle" + s];
      const dy = A[1] - H[1], o = [A[0] - H[0], 0], tk = (K[1] - H[1]) / dy;
      const kp = this.dec(sub(sub(K, H), mul(o, tk))), ap = [0, -dy];
      const leg = { l1: len(kp), l2: len(sub(ap, kp)), bend: 1, o };
      leg.kr = this.kPlane(ap[0], ap[1], leg);
      leg.toe0 = sub(this.J0["toe" + s], A); leg.toeLen = len(leg.toe0);
      this.legs[s] = leg;
      const S = this.J0["shoulder" + s], E = this.J0["elbow" + s], W = this.J0["hand" + s];
      const u = sub(E, S), f = sub(W, E), cr = (W[0] - S[0]) * (E[1] - S[1]) - (W[1] - S[1]) * (E[0] - S[0]);
      this.arms[s] = { u, f, l1: len(u), l2: len(f), bend: cr >= 0 ? 1 : -1 };
    }
  }
  /* screen vector <-> walking-plane coords (a = forward, b = up) */
  dec(v) { const f = this.fwd, a = v[0] / f[0]; return [a, a * f[1] - v[1]]; }
  comp(a, b) { const f = this.fwd; return [a * f[0], a * f[1] - b]; }
  rotSag(v, th) { const [a, b] = this.dec(v), c = Math.cos(th), s = Math.sin(th); return this.comp(a * c + b * s, -a * s + b * c); }
  /* a move on the ground (screen px) -> [forward, sideways] in units of the fwd / right vectors */
  decG(v) { const f = this.fwd, r = this.right, det = f[0] * r[1] - f[1] * r[0]; return [(v[0] * r[1] - v[1] * r[0]) / det, (f[0] * v[1] - f[1] * v[0]) / det]; }
  /* knee (walking-plane coords, hip at 0,0) for an ankle at (ta, tb); the knee bends forward */
  kPlane(ta, tb, leg) {
    const d0 = Math.hypot(ta, tb) || 1e-6, d = clamp(d0, Math.abs(leg.l1 - leg.l2) + 1e-3, leg.l1 + leg.l2 - 1e-3);
    const x = (leg.l1 * leg.l1 - leg.l2 * leg.l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, leg.l1 * leg.l1 - x * x));
    const da = ta / d0, db = tb / d0;
    return [da * x - db * h * leg.bend, db * x + da * h * leg.bend];
  }
  /* screen-space 2-bone IK (arms) */
  ik2(S, T, l1, l2, bend) {
    const v = sub(T, S), d0 = len(v) || 1e-6, d = clamp(d0, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const u = mul(v, 1 / d0), n = perp(u);
    return { E: add(S, add(mul(u, x), mul(n, h * bend))), T: add(S, mul(u, Math.min(d0, l1 + l2 - 1e-3))) };
  }
  /* width-preserving map of a rest point through bone b (current A,B) */
  static mapThrough(b, cur, p) {
    const d = sub(p, b.A0), s = (d[0] * b.t0[0] + d[1] * b.t0[1]) / b.L0, q = d[0] * b.n0[0] + d[1] * b.n0[1];
    return [cur.A[0] + s * cur.e[0] + q * cur.n[0], cur.A[1] + s * cur.e[1] + q * cur.n[1]];
  }

  /* pose -> current joints J (before the global squash/air transform) + bone frames */
  solve(P) {
    const J0 = this.J0, J = {}, up = [0, -1];
    const dH = add(add(mul(this.fwd, P.bodyF), mul(this.right, P.bodyL)), mul(up, P.bodyU));
    J.pelvis = add(J0.pelvis, dH);
    J.crotch = add(J.pelvis, rot(sub(J0.crotch, J0.pelvis), P.hipRoll));
    const c0 = sub(J0.neck, J0.pelvis), cl = len(c0);
    let cv = this.rotSag(c0, P.lean); cv = mul(cv, (cl + P.breath) / (len(cv) || 1)); cv = rot(cv, P.tilt);
    J.neck = add(J.pelvis, cv);
    const frames = new Array(this.bones.length);
    const frame = (b) => { const A = J[b.from], B = J[b.to], e = sub(B, A), L = len(e) || 1e-6; return { A, e, n: mul(perp(e), 1 / L) }; };
    const hipF = frame(this.bones[this.boneIx.hip]), chestF = frame(this.bones[this.boneIx.chest]);
    const hipB = this.bones[this.boneIx.hip], chestB = this.bones[this.boneIx.chest];
    for (const s of ["L", "R"]) {
      // arm: FK swing (+bend) in the walking plane, then IK toward a reach offset
      const arm = this.arms[s], S = RigSkeleton.mapThrough(chestB, chestF, J0["shoulder" + s]);
      const sw = P["arm" + s + "Swing"], bd = P["arm" + s + "Bend"];
      let E = add(S, this.rotSag(arm.u, -sw)), W = add(E, this.rotSag(arm.f, -(sw + bd)));
      const rf = P["arm" + s + "ReachF"], ru = P["arm" + s + "ReachU"];
      if (rf || ru) {
        const T = add(add(W, mul(this.fwd, rf)), mul(up, ru));
        const cr = (W[0] - S[0]) * (E[1] - S[1]) - (W[1] - S[1]) * (E[0] - S[0]);
        const r = this.ik2(S, T, arm.l1, arm.l2, cr >= 0 ? 1 : -1); E = r.E; W = r.T;
      }
      J["shoulder" + s] = S; J["elbow" + s] = E; J["hand" + s] = W;
      // leg: the foot offset (footX/Y) is a move on the ground = forward + sideways. Forward and
      // height (lift, heel rise) go into the walking-plane IK; sideways shifts the lower leg.
      const leg = this.legs[s], H = RigSkeleton.mapThrough(hipB, hipF, J0["hip" + s]);
      const pitch = P["foot" + s + "Pitch"];
      let [ga, gl] = this.decG([P["foot" + s + "X"], P["foot" + s + "Y"]]); ga += P["foot" + s + "F"]; gl += P["foot" + s + "S"];
      const latBody = mul(this.right, P.bodyL), latFoot = mul(this.right, gl), Hp = sub(H, latBody);
      const lift = P["foot" + s + "Lift"] + (pitch > 0 ? leg.toeLen * Math.sin(pitch) * .8 : 0);
      const T = add(add(J0["ankle" + s], mul(this.fwd, ga)), [0, -lift]);
      // keep the ankle within reach (a little stretch is allowed so a planted foot never slides)
      let [ta, tb] = this.dec(sub(sub(T, Hp), leg.o));
      const reach = (leg.l1 + leg.l2) * 1.06, td = Math.hypot(ta, tb);
      if (td > reach) { ta *= reach / td; tb *= reach / td; }
      const kc = this.kPlane(ta, tb, leg), dHip = sub(Hp, J0["hip" + s]);
      J["hip" + s] = H;
      J["knee" + s] = add(add(add(J0["knee" + s], dHip), this.comp(kc[0] - leg.kr[0], kc[1] - leg.kr[1])), mul(add(latBody, latFoot), .5));
      J["ankle" + s] = add(add(add(Hp, leg.o), this.comp(ta, tb)), latFoot);
      // flat-foot pitch: the painted foot turns about the ankle in the walking plane
      const tp = this.comp(leg.toeLen * (Math.cos(pitch) - 1), -leg.toeLen * Math.sin(pitch));
      J["toe" + s] = add(add(J["ankle" + s], leg.toe0), tp);
    }
    for (let i = 0; i < this.bones.length; i++) frames[i] = frame(this.bones[i]);
    J.headRot = Math.atan2(cv[1], cv[0]) - Math.atan2(c0[1], c0[0]) + P.head * Math.sign(this.fwd[0] || 1);
    return { J, frames };
  }
}

/* ------------------------------------------------------------------ springs (secondary motion) */
// A lagging mass behind an anchor: driven by the anchor's acceleration, so walking, stopping and
// breathing all swing hair / scarf a little. disp is in view px (applied to vertices near it).
class Spring {
  constructor(k = 140, c = 9, gain = 1, max = 9) { this.k = k; this.c = c; this.gain = gain; this.max = max; this.d = [0, 0]; this.v = [0, 0]; this.prev = null; this.pv = [0, 0]; }
  reset() { this.prev = null; }
  update(dt, anchor) {
    if (dt <= 0) return this.d;
    let acc = [0, 0];
    if (this.prev) { const vel = mul(sub(anchor, this.prev), 1 / dt); acc = mul(sub(vel, this.pv), 1 / dt); this.pv = vel; }
    else this.pv = [0, 0];
    this.prev = anchor.slice();
    const ax = clamp(acc[0], -4000, 4000), ay = clamp(acc[1], -4000, 4000);
    for (let i = 0; i < 2; i++) {
      const a = -this.k * this.d[i] - this.c * this.v[i] - (i ? ay : ax) * this.gain;
      this.v[i] += a * dt; this.d[i] += this.v[i] * dt;
      if (Math.abs(this.d[i]) > this.max) { this.d[i] = Math.sign(this.d[i]) * this.max; this.v[i] *= .5; }
    }
    return this.d;
  }
}

/* ------------------------------------------------------------------ PixiJS view */
const GRID = 8, TAU_W = 6;
class RigView {
  /* tex: { atlas: PIXI.Texture (whole atlas), head: PIXI.Texture, weapon: PIXI.Texture } */
  constructor(rig, viewName, tex, flip = false) {
    const PIXI = global.PIXI;
    this.skel = new RigSkeleton(rig, viewName); this.V = rig.views[viewName]; this.flip = flip; this.rig = rig;
    const O = this.skel.origin;
    this.container = new PIXI.Container();
    this.container.position.set(flip ? O[0] : -O[0], -O[1]); this.container.scale.x = flip ? -1 : 1;
    this.slots = {};
    const byName = {}; for (const s of this.V.slots) byName[s.name] = s;
    for (const name of this.V.drawOrder) {
      if (name === "head") { this.head = this.makeHead(tex.head); this.container.addChild(this.head.mesh); continue; }
      if (name === "weapon") {
        const w = this.V.weapon; this.weapon = new PIXI.Sprite(tex.weapon);
        this.weapon.anchor.set(w.weaponGrip[0] / tex.weapon.width, w.weaponGrip[1] / tex.weapon.height);
        this.container.addChild(this.weapon); continue;
      }
      const s = byName[name]; if (!s || !s.rect) continue;
      this.slots[name] = this.makeSlot(s, tex.atlas);
      this.container.addChild(this.slots[name].mesh);
    }
    this.weaponHome = this.container.children.indexOf(this.weapon);
  }
  makeSlot(s, atlas) {
    const PIXI = global.PIXI, [rx, ry, w, h] = s.rect;
    const t = new PIXI.Texture(atlas.baseTexture, new PIXI.Rectangle(rx, ry, w, h));
    const cols = Math.max(2, Math.round(w / GRID) + 1), rows = Math.max(2, Math.round(h / GRID) + 1);
    const mesh = new PIXI.SimplePlane(t, cols, rows);
    const bones = s.bones.map(n => this.skel.boneIx[n]);
    const nv = cols * rows, skin = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const p = [s.pos[0] + c * w / (cols - 1), s.pos[1] + r * h / (rows - 1)];
      const ds = bones.map(bi => { const b = this.skel.bones[bi], d = sub(p, b.A0); const s1 = clamp((d[0] * b.t0[0] + d[1] * b.t0[1]) / b.L0, 0, 1); return len(sub(p, add(b.A0, mul(b.t0, s1 * b.L0)))); });
      const dmin = Math.min(...ds);
      let ws = ds.map(d => Math.exp(-(((d - dmin) / TAU_W) ** 2))), tot = ws.reduce((a, b) => a + b, 0);
      const list = [];
      bones.forEach((bi, k) => { const wk = ws[k] / tot; if (wk > .02) { const b = this.skel.bones[bi], d = sub(p, b.A0); list.push([bi, wk, (d[0] * b.t0[0] + d[1] * b.t0[1]) / b.L0, d[0] * b.n0[0] + d[1] * b.n0[1]]); } });
      const t2 = list.reduce((a, e) => a + e[1], 0); list.forEach(e => { e[1] /= t2; });
      skin.push({ p, list });
    }
    return { mesh, skin, name: s.name, nv };
  }
  makeHead(texture) {
    const PIXI = global.PIXI, mesh = new PIXI.SimplePlane(texture, 9, 9), pv = this.V.head.pivot;
    const rest = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const x = c * texture.width / 8, y = r * texture.height / 8; rest.push([x - pv[0], y - pv[1], smooth(pv[1] - 55, pv[1] - 150, y)]); }
    return { mesh, rest };
  }
  /* draw at pose P. springs: { hair: [dx,dy], scarf: [dx,dy] } in view px. returns solve result */
  update(P, springs = {}) {
    const res = this.skel.solve(P), { J, frames } = res, O = this.skel.origin;
    const sq = P.squash, sx = (1 + (1 - sq) * .7) * P.squashX, air = P.air;
    const G = (x, y) => [O[0] + (x - O[0]) * sx, O[1] + (y - O[1]) * sq - air];
    const scarf = this.V.scarf, sd = springs.scarf || [0, 0];
    for (const name in this.slots) {
      const sl = this.slots[name], buf = sl.mesh.geometry.getBuffer("aVertexPosition"), d = buf.data;
      if (d.length !== sl.nv * 2) continue;
      const isTorso = name === "torso";
      for (let i = 0; i < sl.nv; i++) {
        const { p, list } = sl.skin[i]; let x = 0, y = 0;
        for (const [bi, w, s, q] of list) { const f = frames[bi]; x += w * (f.A[0] + s * f.e[0] + q * f.n[0]); y += w * (f.A[1] + s * f.e[1] + q * f.n[1]); }
        if (isTorso && scarf) { const k = smooth(scarf[2], scarf[2] * .35, Math.hypot(p[0] - scarf[0], p[1] - scarf[1])); x += sd[0] * k; y += sd[1] * k; }
        const g = G(x, y); d[i * 2] = g[0]; d[i * 2 + 1] = g[1];
      }
      buf.update();
    }
    // head mesh: pinned to the neck, turned with the chest + head channel, hair lags (spring)
    if (this.head) {
      const buf = this.head.mesh.geometry.getBuffer("aVertexPosition"), d = buf.data, hd = springs.hair || [0, 0];
      const c = Math.cos(J.headRot), s = Math.sin(J.headRot), hx = 1 + (1 - sq) * .7, n = J.neck;
      this.head.rest.forEach(([x, y, w], i) => {
        const X = x * hx + hd[0] * w, Y = y * sq + hd[1] * w;
        const g = G(n[0] + X * c - Y * s, n[1] + X * s + Y * c); d[i * 2] = g[0]; d[i * 2 + 1] = g[1];
      });
      buf.update();
    }
    // weapon: grip follows the forearm of its hand
    if (this.weapon) {
      const w = this.V.weapon, fb = this.skel.bones[this.skel.boneIx["foreArm" + w.hand]], fr = frames[this.skel.boneIx["foreArm" + w.hand]];
      const gp = RigSkeleton.mapThrough(fb, fr, w.grip), g = G(gp[0], gp[1]);
      const armRot = Math.atan2(fr.e[1], fr.e[0]) - Math.atan2(fb.t0[1], fb.t0[0]);
      this.weapon.position.set(g[0], g[1]);
      this.weapon.rotation = w.angle * Math.PI / 180 + armRot - Math.sign(this.skel.fwd[0] || 1) * P.weaponRot;
      // during attacks the weapon is drawn on top (it swings in front of the body)
      const want = P.weaponTop > .5 ? this.container.children.length - 1 : this.weaponHome;
      if (this.container.getChildIndex(this.weapon) !== want) this.container.setChildIndex(this.weapon, want);
    }
    res.G = G;
    return res;
  }
  /* blade tip in view px (for trails) */
  weaponTip(frac = 1) {
    const w = this.V.weapon, r = this.weapon.rotation, tx = (w.weaponTip[0] - w.weaponGrip[0]) * frac, ty = (w.weaponTip[1] - w.weaponGrip[1]) * frac;
    return [this.weapon.x + tx * Math.cos(r) - ty * Math.sin(r), this.weapon.y + tx * Math.sin(r) + ty * Math.cos(r)];
  }
  /* static copy of the current pieces (afterimages) */
  snapshot() {
    const PIXI = global.PIXI, c = new PIXI.Container();
    c.position.copyFrom(this.container.position); c.scale.copyFrom(this.container.scale);
    for (const ch of this.container.children) {
      if (ch === this.weapon) continue;
      const g = ch.geometry, m = new PIXI.SimpleMesh(ch.texture, Float32Array.from(g.getBuffer("aVertexPosition").data), Float32Array.from(g.getBuffer("aTextureCoord").data), Uint16Array.from(g.getIndex().data));
      c.addChild(m);
    }
    return c;
  }
  destroy() { this.container.destroy({ children: true }); }
}

/* ------------------------------------------------------------------ locomotion */
// Feet are kept in WORLD coordinates (map px). A foot in stance never moves; in swing it travels
// from where it lifted to a landing point predicted from the current velocity, so the stride
// always matches the real speed. Idle = both feet back under the body (small settle steps).
class Locomotion {
  constructor(rig) {
    this.M = rig.motion; this.phase = 0; this.time = 0; this.moveW = 0; this.runW = 0; this.moving = false;
    this.feet = { L: { w: null, sw: null, lift: 0, pitch: 0 }, R: { w: null, sw: null, lift: 0, pitch: 0 } };
    this.over = []; this.speed = 0; this.lastSettle = 0;
  }
  trigger(name) { const c = this.M[name]; if (c) this.over.push({ c, t: 0 }); }
  reset() { this.feet.L.w = this.feet.R.w = null; this.feet.L.sw = this.feet.R.sw = null; }
  /* ctx: { dt, x, y, vx, vy, s (scale), flip, skel, lock (0..1: an action drives the legs), run (0..1 wish) } */
  update(ctx) {
    const { dt, x, y, vx, vy, s, flip, skel } = ctx, M = this.M, O = skel.origin, sx = flip ? -s : s;
    this.time += dt;
    const toW = (p, hx, hy) => [hx + (p[0] - O[0]) * sx, hy + (p[1] - O[1]) * s];
    const toL = (w) => [O[0] + (w[0] - x) / sx, O[1] + (w[1] - y) / s];
    const restW = (side, hx = x, hy = y) => toW(skel.J0["ankle" + side], hx, hy);
    const speed = Math.hypot(vx, vy) / s;                     // view px / s
    this.speed = speed;
    const moving = this.moving ? speed > 6 : speed > 14;
    const W = M.walk, R = M.run;
    this.runW = lerp(this.runW, smooth(W.speed * 1.15, R.speed * .9, speed), 1 - Math.pow(.002, dt));
    const rw = this.runW;
    const cad = lerp(W.cadence, R.cadence, rw) * clamp(Math.pow(speed / lerp(W.speed, R.speed, rw), .3), .75, 1.25);
    const sf = lerp(W.swing, R.swing, rw), liftH = lerp(W.lift, R.lift, rw);
    const F = this.feet;
    for (const side of ["L", "R"]) if (!F[side].w) F[side].w = restW(side);

    if (ctx.lock > .5) {                                       // an attack/skill poses the legs itself
      for (const side of ["L", "R"]) { F[side].w = restW(side); F[side].sw = null; F[side].lift = F[side].pitch = 0; }
      this.moving = false;
    } else if (moving) {
      if (!this.moving) {                                      // start: the foot that is behind steps first
        const dir = [vx / (speed * s), vy / (speed * s)];
        const back = side => { const d = sub(F[side].w, restW(side)); return d[0] * dir[0] + d[1] * dir[1]; };
        const first = back("L") <= back("R") ? "L" : "R";
        // a foot already in the air (settle step) keeps its progress; the swing is re-based from here
        const prog = f => !f.sw ? 0 : f.sw.dur ? lerp(f.sw.k0, 1, clamp(f.sw.t / f.sw.dur, 0, 1)) : f.sw.k;
        const swingF = F.L.sw ? "L" : F.R.sw ? "R" : null;
        const k = swingF ? prog(F[swingF]) : 0;
        this.phase = (swingF || first) === "L" ? k * sf : k * sf + .5;
        for (const side of ["L", "R"]) if (F[side].sw) { const kk = prog(F[side]); F[side].sw = { from: F[side].w.slice(), k: kk, k0: kk }; }
        this.trigger("start");
      }
      this.phase += dt * cad;
      for (const side of ["L", "R"]) {
        const f = F[side], p = frac(this.phase + (side === "R" ? .5 : 0));
        if (p < sf) {
          if (!f.sw) f.sw = { from: f.w.slice(), k: 0 };
          const k = p / sf, remain = (sf - p) / cad, stance = (1 - sf) / cad;
          const land = add(restW(side, x + vx * remain, y + vy * remain), [vx * stance * .5, vy * stance * .5]);
          // progress may only move forward; a phase reset re-bases the swing from where the foot is
          if (k < f.sw.k) f.sw = { from: f.w.slice(), k: 0 };
          const e = smooth(f.sw.k0 ?? 0, 1, k);
          f.sw.k = k;
          f.w = [lerp(f.sw.from[0], land[0], e), lerp(f.sw.from[1], land[1], e)];
          f.lift = liftH * sample(M.lift, k); f.pitch = sample(M.pitch, k);
        } else {
          f.sw = null; f.lift = 0;
          const q = (p - sf) / (1 - sf);                       // stance progress: heel rises at the end
          f.pitch = M.heelRise * smooth(.72, 1, q);
        }
      }
    } else {
      if (this.moving) {                                       // stop: finish the step under the body
        this.trigger("stop");
        for (const side of ["L", "R"]) { const f = F[side]; if (f.sw) f.sw = { from: f.w.slice(), k0: f.sw.k, t: 0, dur: Math.max(.08, (1 - f.sw.k) * sf / cad), h: liftH }; }
      }
      for (const side of ["L", "R"]) {
        const f = F[side];
        if (f.sw && f.sw.dur) {
          f.sw.t += dt; const u = clamp(f.sw.t / f.sw.dur, 0, 1), k = lerp(f.sw.k0, 1, u);
          const land = restW(side), e = smooth(0, 1, u);
          f.w = [lerp(f.sw.from[0], land[0], e), lerp(f.sw.from[1], land[1], e)];
          f.lift = f.sw.h * sample(M.lift, k); f.pitch = sample(M.pitch, k) * (1 - u * .3);
          if (u >= 1) { f.sw = null; f.lift = 0; f.pitch = 0; f.w = land; }
        } else if (f.sw) f.sw = null;
        else f.pitch = lerp(f.pitch, 0, 1 - Math.pow(.001, dt));
      }
      // settle: a foot far from its rest spot takes a small step (one foot at a time)
      if (!F.L.sw && !F.R.sw && this.time - this.lastSettle > .05) {
        const err = side => len(sub(toL(F[side].w), skel.J0["ankle" + side]));
        const eL = err("L"), eR = err("R"), side = eL >= eR ? "L" : "R", e = Math.max(eL, eR);
        if (e > M.settle.minDist) {
          F[side].sw = { from: F[side].w.slice(), k0: 0, t: 0, dur: M.settle.dur, h: Math.min(liftH, 2 + e * .25) };
          this.lastSettle = this.time;
        }
      }
    }
    this.moving = moving && !(ctx.lock > .5);
    this.moveW = lerp(this.moveW, this.moving ? 1 : 0, 1 - Math.pow(this.moving ? .0004 : .002, dt));

    // body, arms, head from the cycles (walk/run by speed, idle by time) + one-shot accents
    const P = {}, mw = this.moveW, ph = frac(this.phase);
    sampleClip(M.idle, this.time, P, 1 - mw);
    const cyc = (clip, w) => {
      if (w <= 0) return;
      for (const ch in clip.tracks) {
        const keys = clip.tracks[ch];
        if (ch === "armSwing") { P.armRSwing = (P.armRSwing || 0) + sample(keys, ph, 1) * w * M.armScale.R; P.armLSwing = (P.armLSwing || 0) + sample(keys, ph + .5, 1) * w * M.armScale.L; }
        else if (ch === "armBend") { const bs = M.armBendScale || { L: 1, R: 1 }; P.armRBend = (P.armRBend || 0) + sample(keys, ph, 1) * w * bs.R; P.armLBend = (P.armLBend || 0) + sample(keys, ph + .5, 1) * w * bs.L; }
        else P[ch] = (P[ch] || 0) + sample(keys, ph, 1) * w;
      }
    };
    cyc(W, mw * (1 - rw)); cyc(R, mw * rw);
    for (let i = this.over.length - 1; i >= 0; i--) {
      const o = this.over[i]; o.t += dt;
      if (o.t > o.c.dur) { this.over.splice(i, 1); continue; }
      sampleClip(o.c, o.t, P, 1, true);
    }
    for (const side of ["L", "R"]) {
      const f = F[side], l = toL(f.w), a = skel.J0["ankle" + side];
      P["foot" + side + "X"] = l[0] - a[0]; P["foot" + side + "Y"] = l[1] - a[1];
      P["foot" + side + "Lift"] = f.lift; P["foot" + side + "Pitch"] = f.pitch;
    }
    if (P.squashX !== undefined) P.squashX += 1;
    return pose(P);
  }
}

global.MossRig = { POSE, pose, blendPose, sample, sampleClip, RigSkeleton, RigView, Spring, Locomotion, clamp, lerp, smooth };
})(typeof window !== "undefined" ? window : globalThis);
