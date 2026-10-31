// Dev-only browser capture: boots the built game in Chromium at phone size,
// checks console errors and saves screenshots of each screen. For the boss/dock
// shots it fast-forwards the real CombatWorld with a scripted bot (invulnerable),
// so these are UI/render evidence, not proof of feel or difficulty.
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
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/01_title.png` });
await page.getByText(/เริ่มภารกิจทดลอง|Start test mission/).click();
await page.waitForTimeout(4500);
await page.screenshot({ path: `${out}/02_wave1.png` });

// drag the ship with a real touch-like pointer drag (mouse emulation of pointer events)
const box = await page.locator("#game").boundingBox();
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.7, { steps: 12 });
await page.waitForTimeout(600);
await page.mouse.up();
await page.screenshot({ path: `${out}/03_after_drag.png` });

const bot = `(() => {
  const app = window.__rb; const s = app.screen; const w = s.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  window.__botStep = (n, stopWhen) => {
    for (let i = 0; i < n && w.status === "running" && !w.dock; i++) {
      if (stopWhen && stopWhen(w)) return true;
      const b = w.boss; const c = b?.item; let inp;
      if (w.pickups.length && (!b || !b.e.alive || b.lull)) inp = { move: steer(w.pickups[0].pos), fire: true };
      else if (!b || !b.e.alive) inp = { move: steer({ x: w.enemies[0]?.pos.x ?? 360, y: 860 }), fire: true };
      else if (c && (c.state === "detached_intact" || c.state === "acquiring")) inp = { move: steer({ x: c.pos.x, y: c.pos.y + 90 }), tractorHeld: true, fire: true };
      else if (w.enemies.length) inp = { move: steer({ x: w.enemies[0].pos.x, y: 900 }), fire: true };
      else if (!b.signatureRemoved) { if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: "tail_joint" }; inp = { move: steer({ x: b.e.pos.x + b.joint.offset.x, y: 820 }), fire: b.jointExposed }; }
      else { w.lock = { enemyId: b.e.id, partId: "core" }; inp = { move: steer({ x: b.e.pos.x - 30, y: 860 }), fire: true }; }
      w.step(inp);
    }
    return false;
  };
})()`;
await page.evaluate(bot);
const run = (cond) => page.evaluate(`window.__botStep(60*120, ${cond})`);
await run("(w) => w.pickups.length > 0");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/03b_pickup_drop.png` });
await run("(w) => w.buffs.remaining.size > 0");
await page.evaluate(() => { const w = window.__rb.screen.world; for (let i = 0; i < 20; i++) w.step({ move: { x: 0, y: 0 }, fire: true }); });
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/03c_buff_active.png` });
await run("(w) => w.boss && !w.boss.entering && w.boss.action && w.boss.action.name === 'tail_sweep' && w.boss.action.t > 0.6");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/04_boss_sweep_telegraph.png` });
await run("(w) => w.boss && w.boss.jointExposed && w.boss.joint.hp < w.boss.joint.hpMax");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/05_joint_exposed.png` });
await run("(w) => w.tow && w.tow.towing");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/06_towing.png` });
await run("(w) => !!w.dock");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/07_dock.png` });
await page.getByText(/ติดตั้งตำแหน่งที่เลือก|Fit at selected spot/).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/08_dock_fitted.png` });
await page.getByText(/ออกบิน|Launch/).click();
await page.waitForTimeout(300);
await run("(w) => w.friendly.items.some((b) => b.alive && b.model === 'plasma')");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/09_stolen_plasma.png` });
await run("null");
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/10_results.png` });
await page.getByText(/^หน้าแรก$|^Title$/).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/11_title_after.png` });
await page.reload();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/12_title_reloaded.png` });
const saved = await page.evaluate(() => { const a = window.__rb; return { frags: a.profile.blueprint_fragments, credits: a.profile.credits, records: a.profile.test_records }; });
console.log("profile after reload:", JSON.stringify(saved));
console.log("console errors/warnings:", errors.length ? errors.join("\n") : "none");
await browser.close();
