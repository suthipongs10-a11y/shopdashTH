/**
 * ตรวจความพร้อมก่อนใช้งานจริง — บอกเป็นภาษาไทยว่าติดตรงไหนและต้องทำอะไรต่อ
 *
 *   npm run check
 */
import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (m, d = '') => console.log(`  ✓ ${m}${d ? ` — ${d}` : ''}`);
const warn = (m, d = '') => console.log(`  ! ${m}${d ? ` — ${d}` : ''}`);
const bad = (m, d = '') => console.log(`  ✕ ${m}${d ? ` — ${d}` : ''}`);

let blocking = 0;

console.log('\nตรวจความพร้อมของเครื่อง\n');

// ── Node
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('Node.js', `v${process.versions.node}`);
else {
  bad('Node.js เก่าเกินไป', `พบ v${process.versions.node} ต้องการ v20 ขึ้นไป — ดาวน์โหลดที่ https://nodejs.org`);
  blocking++;
}
if (major < 22) {
  warn('สคริปต์ทดสอบ (pnpm test) ต้องใช้ Node 22 ขึ้นไป', 'ตัวแอปยังใช้งานได้ปกติ');
}

// ── ไฟล์ env
const envPath = join(root, '.env.local');
if (!existsSync(envPath)) {
  const example = join(root, '.env.example');
  if (existsSync(example)) {
    copyFileSync(example, envPath);
    warn('สร้างไฟล์ .env.local ให้แล้ว', 'ยังต้องใส่ GEMINI_API_KEY');
  } else {
    bad('ไม่พบทั้ง .env.local และ .env.example');
    blocking++;
  }
}

if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8');
  // ใช้ [ \t] แทน \s เพราะ \s กินขึ้นบรรทัดใหม่ แล้วจะไปคว้าคอมเมนต์บรรทัดถัดไปมาเป็นคีย์
  const m = raw.match(/^[ \t]*GEMINI_API_KEY[ \t]*=[ \t]*(.*)$/m);
  const key = (m?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
  if (!key) {
    bad('ยังไม่ได้ใส่ GEMINI_API_KEY ใน .env.local');
    console.log('      1. เปิด https://aistudio.google.com/apikey แล้วกด Create API key (ฟรี)');
    console.log(`      2. เปิดไฟล์ ${envPath}`);
    console.log('      3. วางคีย์ต่อท้าย GEMINI_API_KEY=');
    blocking++;
  } else if (key.length < 20) {
    bad('GEMINI_API_KEY สั้นผิดปกติ', 'น่าจะคัดลอกมาไม่ครบ');
    blocking++;
  } else {
    ok('GEMINI_API_KEY', `ใส่แล้ว (${key.slice(0, 6)}…${key.slice(-4)})`);
  }
}

// ── node_modules
if (existsSync(join(root, 'node_modules', 'next'))) ok('ติดตั้ง dependencies แล้ว');
else {
  bad('ยังไม่ได้ติดตั้ง dependencies', 'รัน: pnpm install --ignore-workspace');
  blocking++;
}

// ── พอร์ต
const port = Number(process.env.PORT || 3000);
const free = await new Promise((resolve) => {
  const s = createServer();
  s.once('error', () => resolve(false));
  s.once('listening', () => s.close(() => resolve(true)));
  s.listen(port, '127.0.0.1');
});
if (free) ok(`พอร์ต ${port} ว่าง`);
else warn(`พอร์ต ${port} ถูกใช้อยู่`, `เปิดด้วยพอร์ตอื่นได้: pnpm dev -p 3005`);

console.log('');
if (blocking > 0) {
  console.log(`ยังไม่พร้อม — แก้ ${blocking} ข้อข้างบนก่อน แล้วรัน npm run check ใหม่\n`);
  process.exit(1);
}

console.log('พร้อมแล้ว ทำตามนี้ต่อ\n');
console.log('  1. npm run dev');
console.log(`  2. เปิด http://localhost:${port}/selftest ด้วย Chrome หรือ Edge แล้วกด "เริ่มทดสอบ"`);
console.log('     ต้องผ่านครบ 5 ข้อ และขึ้น H.264 + AAC (ถ้าขึ้น VP9 แปลว่าเบราว์เซอร์ไม่มี codec)');
console.log(`  3. เปิด http://localhost:${port} แล้วเริ่มใช้งานจริง\n`);
