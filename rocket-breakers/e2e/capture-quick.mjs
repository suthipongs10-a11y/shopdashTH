// Dev-only capture for quick salvage: sever the B02 tail, read the callout, then a real tap on
// the Grab button pulls the tail in and fits it. Bot only fast-forwards the fight.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const url = process.argv[2] ?? "http://localhost:4173/";
const out = process.argv[3] ?? "./captures";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForTimeout(700);
await page.evaluate(() => window.__rb.startMission("P01-06"));
await page.waitForTimeout(300);
const ff = (cond) => page.evaluate(`(() => { const w = window.__rb.screen.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  for (let i = 0; i < 60 * 200 && w.status === "running"; i++) {
    if ((${cond})(w)) return true;
    const b = w.boss; const on = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
    if (on.length) { w.lock = { enemyId: on[0].id, partId: "core" }; w.step({ move: steer({ x: on[0].pos.x, y: Math.min(1000, on[0].pos.y + 320) }), fire: true }); }
    else if (b && b.e.alive && !b.signatureRemoved) { if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: b.joint.id }; w.step({ move: steer({ x: b.e.pos.x + b.joint.offset.x, y: 860 }), fire: b.jointExposed }); }
    else w.step({ move: { x: 0, y: 0 }, fire: false });
  }
  return false; })()`);
await ff("(w) => w.boss && w.boss.item.state === 'detached_intact'");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/q01_callout.png` });
await page.getByRole("button", { name: /เข้าใจแล้ว|Got it/ }).click({ timeout: 2000 }).catch(() => {});
// park the ship near the part (the bot would fly there), then a real tap on the Grab button
await page.evaluate(() => { const w = window.__rb.screen.world; const it = w.boss.item; w.motion.pos = { x: it.pos.x, y: Math.min(1000, it.pos.y + 150) }; w.motion.prev = { ...w.motion.pos }; });
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/q02_in_range.png` });
const btn = await page.evaluate(() => { const s = window.__rb.screen; const b = s.buttons.find((x) => x.action === "tractor"); const r = document.getElementById("stage").getBoundingClientRect(); return { x: r.left + (b.c.x / 720) * r.width, y: r.top + (b.c.y / 1280) * r.height }; });
await page.touchscreen.tap(btn.x, btn.y);
await page.waitForTimeout(450);
await page.screenshot({ path: `${out}/q03_fitted.png` });
console.log("tail state:", await page.evaluate(() => window.__rb.screen.world.boss.item.state));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
