// Dev-only: screenshots of the tutorial callouts, firing lane and dock panel.
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
// Fast-forward with a scripted, invulnerable pilot (dev capture only).
await page.evaluate(() => {
  const w = window.__rb.screen.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  window.__go = (stop) => {
    for (let i = 0; i < 60 * 150 && w.status === "running" && !w.dock; i++) {
      if (stop(w)) return;
      const b = w.boss, c = b?.item;
      let inp;
      if (!b) inp = { move: steer({ x: w.enemies[0]?.pos.x ?? 360, y: 860 }), fire: true };
      else if (c && (c.state === "detached_intact" || c.state === "acquiring")) inp = { move: steer({ x: c.pos.x, y: c.pos.y + 90 }), tractorHeld: true, fire: true };
      else if (w.enemies.length) inp = { move: steer({ x: w.enemies[0].pos.x, y: 900 }), fire: true };
      else inp = { move: steer({ x: b.e.pos.x + b.joint.offset.x, y: 820 }), fire: b.jointExposed };
      w.step(inp);
    }
  };
});
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${name}.png` }); };
await page.evaluate(() => window.__go((w) => w.boss && !w.boss.entering && w.boss.upcoming() === "tail_vent" && !w.boss.action));
await shot("t1_joint_soon");
await page.evaluate(() => window.__go((w) => w.boss && w.boss.jointExposed));
await shot("t2_joint_callout");
await page.getByText(/เข้าใจแล้ว/).click();
await page.evaluate(() => window.__go((w) => w.boss.jointExposed && w.boss.joint.hp < w.boss.joint.hpMax * 0.6));
await shot("t3_lane_shooting");
await page.evaluate(() => window.__go((w) => w.boss.item.state === "detached_intact"));
await shot("t4_tow_callout");
await page.getByText(/เข้าใจแล้ว/).click();
await page.evaluate(() => window.__go((w) => !!w.tow?.towing));
await shot("t5_towing_callout");
await page.getByText(/เข้าใจแล้ว/).click();
await page.evaluate(() => window.__go(() => false));
await shot("t6_dock");
await page.getByRole("button", { name: /ติดตั้งอัตโนมัติ/ }).click();
await shot("t7_dock_fitted");
console.log("errors:", errors.length ? errors : "none");
await browser.close();
