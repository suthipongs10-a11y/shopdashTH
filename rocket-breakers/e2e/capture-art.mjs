// Dev-only: screenshots of integrated art, with an optional collider overlay to
// check that sprites line up with the gameplay hitboxes.
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
  const s = window.__rb.screen; const w = s.world; w.opts.invulnerable = true;
  s.tutorialOn = false; // art capture: skip callouts
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  window.__go = (stop) => {
    for (let i = 0; i < 60 * 150 && w.status === "running" && !w.dock; i++) {
      if (stop(w)) return;
      const b = w.boss, c = b?.item;
      let inp;
      if (!b) inp = { move: steer({ x: w.enemies[0]?.pos.x ?? 360, y: 860 }), fire: true };
      else if (c && (c.state === "detached_intact" || c.state === "acquiring")) inp = { move: steer({ x: c.pos.x, y: c.pos.y + 90 }), tractorHeld: true, fire: true };
      else if (w.enemies.length) inp = { move: steer({ x: w.enemies[0].pos.x, y: 900 }), fire: true };
      else if (!b.signatureRemoved) { if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: "tail_joint" }; inp = { move: steer({ x: b.e.pos.x + b.joint.offset.x, y: 820 }), fire: b.jointExposed }; }
      else { w.lock = { enemyId: b.e.id, partId: "core" }; inp = { move: steer({ x: b.e.pos.x - 30, y: 860 }), fire: true }; }
      w.step(inp);
    }
  };
  // Freeze the sim and overlay colliders for alignment review.
  window.__colliders = (on) => {
    s.paused = on; s.driver.paused = on;
    window.__overlay = on;
    if (window.__overlayHooked) return;
    window.__overlayHooked = true;
    const draw = s.draw.bind(s);
    s.draw = (g) => {
      draw(g);
      if (!window.__overlay) return;
      g.save(); g.lineWidth = 2;
      for (const e of w.allEnemies()) for (const p of e.parts) {
        if (!p.active) continue;
        g.strokeStyle = { core: "#0f0", armor: "#ff0", joint: "#f80", module: "#0ff" }[p.kind];
        const c = { x: e.pos.x + p.offset.x, y: e.pos.y + p.offset.y };
        const sh = p.shape;
        if (sh.type === "circle") { g.beginPath(); g.arc(c.x, c.y, sh.r, 0, 7); g.stroke(); }
        else if (sh.type === "rect") g.strokeRect(c.x - sh.hw, c.y - sh.hh, sh.hw * 2, sh.hh * 2);
        else for (const q of sh.points) { g.beginPath(); g.arc(c.x + q.x, c.y + q.y, sh.r, 0, 7); g.stroke(); }
      }
      const m = w.motion.pos; g.strokeStyle = "#f0f"; g.beginPath(); g.arc(m.x, m.y, 12, 0, 7); g.stroke(); g.beginPath(); g.arc(m.x, m.y, 26, 0, 7); g.stroke();
      g.restore();
    };
  };
});
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${name}.png` }); };
await page.evaluate(() => window.__go((w) => w.boss && !w.boss.entering && !w.boss.action));
await shot("a1_boss");
await page.evaluate(() => window.__colliders(true));
await shot("a2_boss_colliders");
await page.evaluate(() => window.__colliders(false));
await page.evaluate(() => window.__go((w) => w.boss.jointExposed && w.boss.joint.hp < w.boss.joint.hpMax * 0.7));
await shot("a3_vent_open");
await page.evaluate(() => window.__colliders(true));
await shot("a4_vent_colliders");
await page.evaluate(() => window.__colliders(false));
await page.evaluate(() => window.__go((w) => w.boss.item.state === "detached_intact"));
await shot("a5_tail_loose");
await page.evaluate(() => window.__go((w) => !!w.tow?.towing));
await page.evaluate(() => window.__go((w) => w.tick % 40 === 0 && !!w.tow?.towing));
await shot("a6_towing");
await page.evaluate(() => window.__go(() => false));
await page.getByRole("button", { name: /ติดตั้งอัตโนมัติ/ }).click();
await page.waitForTimeout(200);
await page.getByText(/ออกบิน/).click();
await page.evaluate(() => window.__go((w) => w.friendly.items.some((b) => b.alive && b.model === "plasma")));
await shot("a7_stolen_tail_fitted");
console.log("errors:", errors.length ? errors : "none");
await browser.close();
