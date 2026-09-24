// Regenerates static/og.png and static/apple-touch-icon.png with Playwright (dev-only).
// Usage: node scripts/make-images.mjs   (needs `playwright` resolvable, e.g. npm i -g playwright)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(execSync('npm root -g').toString().trim(), 'noop.js'));
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(join(here, 'og.html')).href);
await page.screenshot({ path: join(here, '../static/og.png') });
await page.setViewportSize({ width: 180, height: 180 });
await page.goto('about:blank');
await page.setContent(`<body style="margin:0"><img src="${pathToFileURL(join(here, '../static/favicon.svg')).href}" width="180" height="180"></body>`);
await page.screenshot({ path: join(here, '../static/apple-touch-icon.png') });
await browser.close();
console.log('wrote static/og.png, static/apple-touch-icon.png');
