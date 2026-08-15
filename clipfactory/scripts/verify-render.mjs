/**
 * ตรวจสอบว่าไปป์ไลน์เรนเดอร์สร้างไฟล์ mp4 ได้จริง
 * เปิดหน้า /selftest ด้วย Chromium จริง แล้วอ่านผลการทดสอบ
 *
 *   pnpm build && node scripts/verify-render.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

/** อ่านโครงสร้างกล่อง (box) ของไฟล์ mp4 เพื่อยืนยันว่าไฟล์สมบูรณ์จริง */
function parseBoxes(buf, start = 0, end = buf.length, depth = 0) {
  const found = [];
  let off = start;
  while (off + 8 <= end) {
    const size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (size < 8 || off + size > end) break;
    found.push({ type, size, depth });
    if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
      found.push(...parseBoxes(buf, off + 8, off + size, depth + 1));
    }
    off += size;
  }
  return found;
}

const PORT = process.env.PORT || '3123';
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(proc, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('เซิร์ฟเวอร์ไม่ตอบใน 60 วินาที')), timeoutMs);
    const onData = (buf) => {
      const text = buf.toString();
      process.stdout.write(`[next] ${text}`);
      if (/Ready in|started server on|Local:/i.test(text)) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`เซิร์ฟเวอร์ปิดตัวเอง (exit ${code})`));
    });
  });
}

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', PORT], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production' },
});

let exitCode = 0;

try {
  await waitForServer(server);

  // ใช้ Chromium ที่ติดตั้งไว้ในเครื่องถ้ามี (เลี่ยงการดาวน์โหลดเบราว์เซอร์ใหม่)
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[console.error] ${m.text()}`);
  });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  await page.goto(`${BASE}/selftest`, { waitUntil: 'domcontentloaded' });
  await page.click('[data-testid="run"]');

  await page.waitForFunction(
    () => {
      const s = window.__selftest;
      return s && s.busy === false && (s.summary || s.error);
    },
    { timeout: 180_000 },
  );

  const result = await page.evaluate(() => {
    const s = window.__selftest;
    return { checks: s.checks, summary: s.summary, error: s.error, warning: s.warning };
  });

  // ดึงไฟล์จริงออกมาตรวจโครงสร้าง
  const bytes = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="video"]');
    if (!el) return null;
    const res = await fetch(el.getAttribute('src'));
    const arr = new Uint8Array(await res.arrayBuffer());
    return Array.from(arr);
  });

  console.log('\n══ ผลการทดสอบ ══');
  for (const c of result.checks) {
    const icon = c.status === 'pass' ? '✓' : c.status === 'fail' ? '✕' : '·';
    console.log(`  ${icon} ${c.labelTh}${c.detail ? ` — ${c.detail}` : ''}`);
  }

  if (bytes) {
    const buf = Buffer.from(bytes);
    const outPath = '/tmp/clipfactory-selftest.mp4';
    await writeFile(outPath, buf);
    const boxes = parseBoxes(buf);
    const types = boxes.map((b) => b.type);
    const trakCount = types.filter((t) => t === 'trak').length;
    const mdat = boxes.find((b) => b.type === 'mdat');

    console.log('\n══ โครงสร้างไฟล์ mp4 ══');
    console.log(`  ไฟล์: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    console.log(`  กล่องระดับบน: ${boxes.filter((b) => b.depth === 0).map((b) => b.type).join(', ')}`);
    console.log(`  จำนวน track: ${trakCount}`);
    console.log(`  ขนาด mdat: ${mdat ? (mdat.size / 1024).toFixed(0) + ' KB' : 'ไม่พบ'}`);

    const problems = [];
    if (!types.includes('ftyp')) problems.push('ไม่พบกล่อง ftyp');
    if (!types.includes('moov')) problems.push('ไม่พบกล่อง moov (metadata)');
    if (!mdat || mdat.size < 1024) problems.push('กล่อง mdat ว่างหรือเล็กผิดปกติ');
    if (trakCount < 2) problems.push(`คาดว่าจะมี 2 track (ภาพ+เสียง) แต่พบ ${trakCount}`);
    if (types.indexOf('moov') > types.indexOf('mdat')) {
      problems.push('moov อยู่หลัง mdat — fastStart ไม่ทำงาน');
    }

    if (problems.length) {
      console.log(`  ✕ ${problems.join(' · ')}`);
      exitCode = 1;
    } else {
      console.log('  ✓ โครงสร้างไฟล์ครบถ้วนและ fastStart ทำงาน');
    }
  }

  if (result.warning) console.log(`\n⚠ ${result.warning}`);

  if (result.error) {
    console.log(`\n✕ ล้มเหลว: ${result.error}`);
    exitCode = 1;
  } else {
    console.log(`\n✓ ${result.summary}`);
  }

  await browser.close();
} catch (err) {
  console.error(`\n✕ ${err.message}`);
  exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

process.exit(exitCode);
