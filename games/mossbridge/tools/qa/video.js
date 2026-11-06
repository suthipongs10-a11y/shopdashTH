// Record ~12 s of real-time gameplay to qa-out/video/*.webm (walk to the meadow, fight, skills).
// Needs a real GPU for smooth capture (run without SOFTWARE_GL on a desktop).
const { chromium } = require('playwright');
const { OUT, BASE } = require('./_browser');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html'); await page.waitForFunction(() => window.__mossbridge);
  await page.evaluate(() => { const g = window.__mossbridge; g.hero.x = 1180; g.hero.y = 330; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.__mossbridge; g.hero.target = g.mobs.find(m => !m.boss && !m.dead); });
  await page.waitForTimeout(3000);
  for (const k of [0, 2, 1]) { await page.evaluate(i => window.__mossbridge.useSkill(i), k); await page.waitForTimeout(1600); }
  await page.evaluate(() => { const g = window.__mossbridge; g.hero.target = g.boss; });
  await page.waitForTimeout(4000);
  await ctx.close(); await browser.close(); console.log('video saved in', path.join(OUT, 'video'));
})();
