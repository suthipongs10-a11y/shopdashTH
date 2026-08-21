/**
 * เช็คก่อน launch (M4): ห้ามขึ้น production ทั้งที่เบอร์โทร/LINE ยังเป็น placeholder
 * ใช้: npm run check:launch
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8');
const problems = [];

if (/isPlaceholder:\s*true/.test(src)) {
  problems.push('contact.isPlaceholder ยังเป็น true — ยืนยันข้อมูลติดต่อจริงแล้วค่อยเปลี่ยนเป็น false');
}
if (/08X-XXX-XXXX|08XXXXXXXX/.test(src)) {
  problems.push('เบอร์โทรใน src/data/site.ts ยังเป็น placeholder (08X-XXX-XXXX)');
}
if (/TODO\(M4/.test(src)) {
  problems.push('ยังมี TODO(M4 …) ค้างใน src/data/site.ts');
}

if (problems.length > 0) {
  console.error('\n❌ ยังไม่พร้อม launch:');
  for (const p of problems) console.error('   - ' + p);
  console.error('');
  process.exit(1);
}

console.log('✅ ข้อมูลติดต่อพร้อม launch');
