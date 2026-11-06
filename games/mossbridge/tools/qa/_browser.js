// Shared Playwright setup for the QA scripts.
// BASE (default http://localhost:8000/) must serve games/mossbridge/demo  ->  npm run serve
// SOFTWARE_GL=1 forces SwiftShader (needed on machines/containers without a GPU).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8000/';
const OUT = path.resolve(process.env.OUT || path.join(__dirname, '..', '..', 'qa-out'));
require('fs').mkdirSync(OUT, { recursive: true });
async function open(viewport = { width: 1280, height: 720 }) {
  const args = process.env.SOFTWARE_GL ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // PIXI_LOCAL=/path/pixi.min.js serves PixiJS from disk (for sandboxes without CDN access)
  if (process.env.PIXI_LOCAL) await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: process.env.PIXI_LOCAL, contentType: 'application/javascript' }));
  await page.goto(BASE + 'index.html');
  await page.waitForFunction(() => window.__mossbridge, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  return { browser, page, errors };
}
module.exports = { open, OUT, BASE };
