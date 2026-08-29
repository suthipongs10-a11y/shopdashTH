/**
 * แพ็คเกมทั้งเกมเป็นไฟล์ HTML ไฟล์เดียว (ไม่มีไฟล์แนบเลย) เพื่อเอาไปโฮสต์ที่ไหนก็ได้
 * รวมถึง Claude Artifact ที่รับได้เฉพาะหน้าเดียวจบ
 *
 *   node scripts/build-artifact.mjs
 *   → packages/client/dist/himmapan-guard.html
 *
 * ผลลัพธ์เป็น "เนื้อหน้า" ล้วน (title + style + markup + script) ไม่มี <html>/<head>/<body>
 * เพราะ Artifact จะห่อโครงนั้นให้เอง — เปิดเป็นไฟล์เดี่ยวในเบราว์เซอร์ก็ยังทำงานได้
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(root, 'packages/client');
const distDir = join(clientDir, 'dist');
const OUT = join(distDir, 'himmapan-guard.html');

const FONTS = 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Sarabun:wght@400;600&display=swap';
const TITLE = 'หิมพานต์การ์ด';

console.log('▸ vite build (ปิด sourcemap เพื่อให้ไฟล์เล็ก)');
execSync('npx vite build --sourcemap false', { cwd: clientDir, stdio: 'inherit' });

const assets = readdirSync(join(distDir, 'assets'));
const jsFile = assets.find((f) => f.endsWith('.js'));
const cssFile = assets.find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('หาไฟล์ bundle ใน dist/assets ไม่เจอ');

const js = readFileSync(join(distDir, 'assets', jsFile), 'utf8');
const css = readFileSync(join(distDir, 'assets', cssFile), 'utf8');

// กัน string ในบันเดิลไปปิดแท็กก่อนเวลา
const safeJs = js.replaceAll('</script', '<\\/script');
const safeCss = css.replaceAll('</style', '<\\/style');

// charset + viewport ประกาศไว้ต้นไฟล์เอง เผื่อเปิดไฟล์ตรงๆ หรือโฮสต์ที่ไม่ได้ใส่ให้
// (ขาด viewport เมื่อไร มือถือจะ "boost" ขนาดฟอนต์เองจนหน้าจอเละ)
// user-scalable=no จำเป็นสำหรับเกมนี้ เพราะจีบสองนิ้ว = ซูมกล้องในเกม ไม่ใช่ซูมหน้าเว็บ
const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${TITLE}</title>
<link rel="stylesheet" href="${FONTS}">
<style>
${safeCss}
</style>

<div id="app">
  <canvas id="scene"></canvas>
  <div id="ui"></div>
</div>

<script type="module">
${safeJs}
</script>
`;

writeFileSync(OUT, html, 'utf8');
const kb = (html.length / 1024).toFixed(0);
console.log(`\n✅ ${OUT}`);
console.log(`   ขนาด ${kb} KB — ไฟล์เดียวจบ ไม่ต้องมี asset แนบ`);
