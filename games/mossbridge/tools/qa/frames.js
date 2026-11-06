// Deterministic animation frames of the hero (or the boss) -> qa-out/frames/*.png + frames.json
// usage: node tools/qa/frames.js '<json sequence>'
// sequence items: {"view":"se","walk":1,"n":8,"dt":0.05}  |  {"view":"sw","clip":"slash1","ts":[0.1,0.2]}  |  {"view":"se","skill":1,"ts":[...]}
// views: sw se w e ne nw ; skill index: 0 Tidecleave, 1 Mossquake, 2 Gale Dash, 3 Mend
const { open, OUT } = require('./_browser');
const fs = require('fs'), path = require('path');
const seq = JSON.parse(process.argv[2] || '[{"view":"se","walk":1,"n":8,"dt":0.05},{"view":"sw","clip":"slash1","ts":[0.07,0.13,0.17,0.21,0.27,0.4]}]');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 600 });
  const dir = path.join(OUT, 'frames'); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(() => document.querySelectorAll('.hud,.vignette,#loading').forEach(e => e.style.display = 'none'));
  const frames = [];
  const cap = async label => {
    await page.evaluate(() => { const g = window.__mossbridge, h = g.hero, w = g.app.stage.children[0], z = 2.6; w.scale.set(z); w.x = 400 - h.x * z; w.y = 470 - h.y * z; g.app.render(); });
    const f = path.join(dir, `f_${String(frames.length).padStart(3, '0')}.png`);
    await page.screenshot({ path: f, clip: { x: 200, y: 40, width: 400, height: 520 } }); frames.push([f, label]);
  };
  for (const item of seq) {
    await page.evaluate(v => { const g = window.__mossbridge, h = g.hero; g.step(0.01); h.path = []; h.target = null; h.action = null; h.x = 650; h.y = 700; const d = { sw: [-1, 1], se: [1, 1], w: [-1, 0], e: [1, 0], ne: [1, -1], nw: [-1, -1] }[v]; h.face(d[0], d[1]); g.step(0.5); }, item.view);
    if (item.walk) {
      await page.evaluate(() => { const g = window.__mossbridge, h = g.hero, f = h.facingVec(); h.path = [[h.x + f[0] * 900, h.y + f[1] * 900]]; g.step(0.4); });
      for (let i = 0; i < item.n; i++) { await page.evaluate(dt => window.__mossbridge.step(dt), item.dt); await cap(`${item.view} walk ${i}`); }
    } else {
      await page.evaluate(c => { const g = window.__mossbridge; if (c.skill !== undefined) g.useSkill(c.skill); else g.hero.play(c.clip, { kind: 'basic' }); }, item);
      let t = 0; for (const tt of item.ts) { await page.evaluate(dt => window.__mossbridge.step(dt), tt - t); t = tt; await cap(`${item.clip || 'skill' + item.skill} ${tt}`); }
    }
  }
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(frames));
  console.log(`${frames.length} frames -> ${dir}`); if (errors.length) console.log(errors.join('\n'));
  await browser.close();
})();
