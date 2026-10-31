// Dev-only capture for M2 stage 2 (P01-03 Rivet Crab): claw-sweep warning, open joint,
// severed claw, dock with W021, results. Scripted invulnerable bot; render evidence only.
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
await page.evaluate(() => window.__rb.startMission("P01-03"));
await page.waitForTimeout(300);
await page.evaluate(`(() => {
  const s = window.__rb.screen, w = s.world; w.opts.invulnerable = true;
  const steer = (to) => ({ x: Math.max(-1, Math.min(1, (to.x - w.motion.pos.x) / 25)), y: Math.max(-1, Math.min(1, (to.y - w.motion.pos.y) / 25)) });
  window.__botStep = (n, stopWhen) => {
    for (let i = 0; i < n && w.status === "running"; i++) {
      if (w.dock) return "dock";
      if (stopWhen && stopWhen(w)) return true;
      const b = w.boss; let inp;
      const loose = !(w.tow && w.tow.towing) && w.items.find((it) => it.sourceEncounter !== "player" && (it.state === "detached_intact" || it.state === "acquiring"));
      const minors = w.enemies.filter((e) => e.pos.x > 30 && e.pos.x < 690 && e.pos.y > 0 && e.pos.y < 900);
      if (loose) inp = { move: steer({ x: loose.pos.x, y: loose.pos.y + 90 }), tractorHeld: true, fire: true };
      else if (minors.length) { const t = minors[0]; w.lock = { enemyId: t.id, partId: t.role === "cargo" ? "engine" : "core" }; inp = { move: steer({ x: t.pos.x, y: Math.min(1000, t.pos.y + 320) }), fire: true }; }
      else if (!b || !b.e.alive) inp = { move: steer({ x: 360, y: 900 }), fire: true };
      else if (!b.signatureRemoved) { const jx = b.e.pos.x + b.joint.offset.x; if (b.jointExposed) w.lock = { enemyId: b.e.id, partId: b.joint.id }; inp = { move: steer({ x: jx, y: 860 }), fire: b.jointExposed }; }
      else { w.lock = { enemyId: b.e.id, partId: "core" }; inp = { move: steer({ x: b.e.pos.x, y: 880 }), fire: true }; }
      w.step(inp);
    }
    return false;
  };
})()`);
const shot = async (name) => { await page.waitForTimeout(120); await page.screenshot({ path: `${out}/${name}.png` }); };
let docked = 0;
async function until(cond) {
  for (let k = 0; k < 12; k++) {
    const r = await page.evaluate(`window.__botStep(60*40, ${cond})`);
    if (r !== "dock") return r;
    await page.waitForTimeout(300);
    await page.getByText(/เข้าใจแล้ว|Got it/).first().click({ timeout: 500 }).catch(() => {});
    if (!docked++) await shot("k05_dock");
    console.log("dock", await page.evaluate(() => { const w = window.__rb.screen.world; const o = w.assembly.suggestOrigins(w.dockWeapon()); return `${w.dockItem()?.templateId} origins=${JSON.stringify(o)} can=${o[0] && w.assembly.canPlace(w.dockWeapon(), o[0])} mods=${w.assembly.modules.map((m) => m.weapon.id + JSON.stringify(m.cells)).join(" ")} callout=${!!document.querySelector(".callout")} hold=${w.hold.length}`; }));
    await page.getByRole("button", { name: /ติดตั้งอัตโนมัติ|Auto-fit/ }).click({ timeout: 1500 }).catch((e) => console.log("autofit click failed", String(e).slice(0, 200)));
    await page.waitForTimeout(150);
    if (await page.getByText(/^ออกบิน$|^Launch$/).count() === 0) { await page.getByText(/เก็บเข้าช่องเก็บ|Stow/).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150); }
    await page.getByText(/^ออกบิน$|^Launch$/).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  return false;
}
// close tutorial callouts automatically when they appear
const closeCallout = async () => { await page.getByText(/เข้าใจแล้ว|Got it/).first().click({ timeout: 300 }).catch(() => {}); };
await until("(w) => w.boss && !w.boss.entering");
await shot("k01_crab");
await until("(w) => w.boss.action && w.boss.action.name === 'claw_sweep' && w.boss.action.t > 0.7");
await shot("k02_sweep_warning");
await until("(w) => w.boss.action && w.boss.action.name === 'claw_sweep' && w.boss.action.t > 1.25");
await shot("k03_sweep_active");
await until("(w) => w.boss.jointExposed");
await page.waitForTimeout(400);
await shot("k04_joint_open");
await closeCallout();
await until("(w) => w.boss.signatureRemoved");
await page.waitForTimeout(300);
await shot("k04b_severed");
for (let i = 0; i < 4; i++) {
  await closeCallout();
  const r = await until("(w) => w.status !== 'running'");
  console.log("round", i, r, await page.evaluate(() => { const w = window.__rb.screen.world; return w ? `${w.status} dock=${!!w.dock} boss=${w.boss && w.boss.e.alive} enemies=${w.enemies.length} items=${w.items.map((x) => x.state).join(",")}` : "no world"; }));
  if (r === true || r === false) break;
}
await shot("k99_end_state");
await page.waitForTimeout(2500);
await shot("k06_results");
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
