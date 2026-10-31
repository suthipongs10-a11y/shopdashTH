// Dev-only capture for P01-04: an E21 Loot Snatcher beaming and carrying a freed hauler part.
// Scripted bot frees hauler cargo but never tows it, so the snatchers get to work.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const url = process.argv[2] ?? "http://localhost:4173/";
const out = process.argv[3] ?? "./captures";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForTimeout(700);
await page.evaluate(() => window.__rb.startMission("P01-04"));
await page.waitForTimeout(300);
const step = (cond) => page.evaluate(`(() => { const w = window.__rb.screen.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  for (let i = 0; i < 60 * 120 && w.status === "running" && !w.dock; i++) {
    if ((${cond})(w)) return true;
    const t = w.enemies.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine").active && e.pos.x > 40 && e.pos.x < 680);
    if (t) { w.lock = { enemyId: t.id, partId: "engine" }; w.step({ move: steer({ x: t.pos.x, y: t.pos.y + 320 }), fire: true }); }
    else w.step({ move: steer({ x: 360, y: 980 }), fire: false });
  }
  return false; })()`);
await step("(w) => w.enemies.some((e) => e.steal && e.steal.beam > 1.2)");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/s01_snatch_beam.png` });
await step("(w) => w.enemies.some((e) => e.steal && e.steal.carrying && e.pos.y < 330)");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/s02_carrying.png` });
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
