// Dev-only capture for M2 stage 1: title → sector map → briefing → P01-01 combat
// (E02 aim line, E04 hauler, supply node) → results with stars. Fast-forwards the
// real CombatWorld with a scripted invulnerable bot; UI/render evidence only.
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
await page.screenshot({ path: `${out}/c01_title.png` });
await page.getByRole("button", { name: /แคมเปญ|Campaign/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/c02_map.png` });
await page.locator('[data-mission="P01-01"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/c03_briefing.png` });
await page.getByText(/ออกบิน|Launch/).click();
await page.waitForTimeout(500);

await page.evaluate(`(() => {
  const w = window.__rb.screen.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  window.__botStep = (n, stopWhen) => {
    for (let i = 0; i < n && w.status === "running"; i++) {
      if (w.dock) return "dock";
      if (stopWhen && stopWhen(w)) return true;
      const loose = !(w.tow && w.tow.towing) && w.items.find((it) => it.sourceEncounter === "E04" && (it.state === "detached_intact" || it.state === "acquiring"));
      let inp;
      if (loose) inp = { move: steer({ x: loose.pos.x, y: loose.pos.y + 90 }), tractorHeld: true, fire: true };
      else {
        const on = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
        const t = on.find((e) => e.role === "supply") || on.find((e) => e.role === "cargo" && e.parts.find((p) => p.id === "engine").active) || on[0];
        if (t) { w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" }; inp = { move: steer({ x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), fire: true }; }
        else inp = { move: steer({ x: 360, y: 900 }), fire: true };
      }
      w.step(inp);
    }
    return false;
  };
})()`);
const shot = async (name) => { await page.waitForTimeout(150); await page.screenshot({ path: `${out}/${name}.png` }); };
let docked = 0;
// Run the bot until `cond`; a safe dock opening on the way is handled through the real panel.
async function until(cond) {
  for (let k = 0; k < 12; k++) {
    const r = await page.evaluate(`window.__botStep(60*40, ${cond})`);
    if (r !== "dock") return r;
    await page.waitForTimeout(300);
    if (!docked++) await shot("c08_dock");
    await page.getByText(/ติดตั้งอัตโนมัติ|Auto/).first().click().catch(() => {});
    await page.waitForTimeout(150);
    if (await page.getByText(/^ออกบิน$|^Launch$/).count() === 0) {
      await page.getByText(/เก็บเข้าช่องเก็บ|Stow/).first().click().catch(() => {});
      await page.waitForTimeout(150);
    }
    await page.getByText(/^ออกบิน$|^Launch$/).first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
  return false;
}
await until("(w) => w.enemies.some((e) => e.role === 'supply' && e.pos.y > 80)");
await shot("c04_supply_node");
await until("(w) => w.enemies.some((e) => e.role === 'interceptor' && e.telegraph > 0 && e.aim)");
await shot("c05_interceptor_aim");
await until("(w) => w.enemies.some((e) => e.role === 'cargo' && e.pos.x > 120 && e.pos.x < 600)");
await shot("c06_hauler");
await until("(w) => w.items.some((it) => it.sourceEncounter === 'E04' && it.state === 'detached_intact')");
await shot("c07_cargo_freed");
await until("(w) => w.status !== 'running'");
await page.waitForTimeout(2500);
await shot("c09_results");
await page.getByText(/^แผนที่$|^Map$/).click();
await page.waitForTimeout(300);
await shot("c10_map_after");
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
