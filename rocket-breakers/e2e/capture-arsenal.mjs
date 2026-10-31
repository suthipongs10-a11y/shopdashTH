// Dev-only capture: several salvaged arsenal weapons firing at once (missiles, arc, flak, drones, ...).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const url = process.argv[2] ?? "http://localhost:4173/";
const out = process.argv[3] ?? "./captures";
const sets = [["W011", "W015", "W020"], ["W012", "W007", "W005"], ["W019", "W017", "W004"], ["W010", "W003", "W014"]];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForTimeout(700);
for (let i = 0; i < sets.length; i++) {
  await page.evaluate(() => window.__rb.startMission("P01-01"));
  await page.waitForTimeout(200);
  await page.evaluate((ids) => {
    const w = window.__rb.screen.world; w.opts.invulnerable = true;
    for (const m of [...w.assembly.modules]) w.assembly.remove(m.instanceId);
    for (const id of ids) { const wr = w.catalog.weapon(id); const o = w.assembly.suggestOrigins(wr)[0]; if (o) w.assembly.place(wr, o, "cap-" + id); }
    w.refreshAssembly(); w.weapons.energyRegen = 999;
    for (let k = 0; k < 60 * 7; k++) { const e = w.enemies.find((x) => x.pos.y > 100 && x.pos.y < 800 && x.pos.x > 60 && x.pos.x < 660); w.step({ move: e ? { x: Math.sign(e.pos.x - w.motion.pos.x) * 0.6, y: Math.sign(e.pos.y + 330 - w.motion.pos.y) * 0.6 } : { x: 0, y: 0 }, fire: true }); }
  }, sets[i]);
  await page.waitForTimeout(260);
  await page.screenshot({ path: `${out}/a${i}.png` });
}
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
