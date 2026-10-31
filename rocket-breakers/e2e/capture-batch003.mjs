// Dev-only: BATCH_003 art review (enemies + collider overlay, banking, damage overlays).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url = "http://localhost:4173/", out = "./captures"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(600);
await page.getByText(/เริ่มภารกิจทดลอง/).click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  const s = window.__rb.screen, w = s.world; w.opts.invulnerable = true; s.tutorialOn = false;
  window.__run = (n, inp) => { for (let i = 0; i < n; i++) w.step(inp(w)); };
  window.__freeze = (on) => { s.paused = on; s.driver.paused = on; };
  window.__overlay = false;
  const draw = s.draw.bind(s);
  s.draw = (g) => {
    draw(g);
    if (!window.__overlay) return;
    g.save(); g.lineWidth = 2;
    for (const e of w.allEnemies()) for (const p of e.parts) {
      if (!p.active) continue;
      g.strokeStyle = { core: "#0f0", armor: "#ff0", joint: "#f80", module: "#0ff" }[p.kind];
      const c = { x: e.pos.x + p.offset.x, y: e.pos.y + p.offset.y }, sh = p.shape;
      if (sh.type === "circle") { g.beginPath(); g.arc(c.x, c.y, sh.r, 0, 7); g.stroke(); }
      else if (sh.type === "rect") g.strokeRect(c.x - sh.hw, c.y - sh.hh, sh.hw * 2, sh.hh * 2);
    }
    g.restore();
  };
});
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png` }); };
// scouts on screen, ship banking left
await page.evaluate(() => window.__run(60 * 4, () => ({ move: { x: -1, y: 0 }, fire: true })));
await page.evaluate(() => { const w = window.__rb.screen.world; for (let i = 0; i < 8; i++) w.step({ move: { x: -1, y: 0 }, fire: true }); window.__freeze(true); });
await shot("c1_scouts_bank_left");
await page.evaluate(() => window.__freeze(false));
// to wave 2 barges
await page.evaluate(() => { const w = window.__rb.screen.world; for (let i = 0; i < 60 * 60 && w.phase !== "wave2"; i++) w.step({ move: { x: Math.sign((w.enemies[0]?.pos.x ?? 360) - w.motion.pos.x), y: 0 }, fire: true }); for (let i = 0; i < 160; i++) w.step({ move: { x: 1, y: 0 }, fire: false }); window.__freeze(true); });
await shot("c2_barges_bank_right");
await page.evaluate(() => { window.__overlay = true; });
await shot("c3_barges_colliders");
await page.evaluate(() => { window.__overlay = false; window.__freeze(false); });
// damaged hull + damaged boss
await page.evaluate(() => {
  const w = window.__rb.screen.world;
  for (let i = 0; i < 60 * 90 && !(w.boss && !w.boss.entering); i++) w.step({ move: { x: Math.sign((w.enemies[0]?.pos.x ?? 360) - w.motion.pos.x), y: 0 }, fire: true });
  w.hp = 30; w.boss.core.hp = w.boss.core.hpMax * 0.35;
  for (let i = 0; i < 10; i++) w.step({ move: { x: 0, y: 0 }, fire: false });
  window.__freeze(true);
});
await shot("c4_damage_overlays");
console.log("errors:", errors.length ? errors : "none");
await browser.close();
