/**
 * ตรวจโครงสร้าง SEO ของไฟล์ที่ build แล้วใน dist/
 * ใช้: npm run build && npm run check:seo
 *
 * เช็คทุกหน้า:
 *  1. มี <title> และยาวไม่เกินเกณฑ์
 *  2. มี meta description และอยู่ในช่วง 70–170 ตัวอักษร
 *  3. มี <h1> ตัวเดียวเท่านั้น
 *  4. มี canonical เป็น absolute URL และปิดท้ายด้วย /
 *  5. JSON-LD parse ได้ และมี @graph
 *  6. มี og:title / og:description / og:image
 *  7. ไม่มีลิงก์ภายในที่ชี้ไปหน้าที่ไม่มีอยู่ใน dist (broken internal link)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MAX_TITLE = 70;
const MIN_DESC = 70;
const MAX_DESC = 170;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : [];
  });
}

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

if (!existsSync(DIST)) {
  console.error('❌ ยังไม่มีโฟลเดอร์ dist/ — รัน `npm run build` ก่อน');
  process.exit(1);
}

const files = walk(DIST);
const problems = [];
const routes = new Set(
  files.map((f) => {
    const rel = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
    return rel === '/index.html' ? '/' : rel;
  }),
);

for (const file of files) {
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const add = (msg) => problems.push(`${page} — ${msg}`);
  const is404 = page.includes('404');

  const title = pick(html, /<title>([\s\S]*?)<\/title>/);
  if (!title) add('ไม่มี <title>');
  else if (title.length > MAX_TITLE) add(`<title> ยาว ${title.length} ตัวอักษร (เกิน ${MAX_TITLE})`);

  const desc = pick(html, /<meta name="description" content="([\s\S]*?)"/);
  if (!desc) add('ไม่มี meta description');
  else if (desc.length < MIN_DESC || desc.length > MAX_DESC)
    add(`meta description ยาว ${desc.length} ตัวอักษร (ควรอยู่ระหว่าง ${MIN_DESC}–${MAX_DESC})`);

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) add(`มี <h1> ${h1Count} ตัว (ต้องมี 1 ตัวเท่านั้น)`);

  const canonical = pick(html, /<link rel="canonical" href="([\s\S]*?)"/);
  if (!canonical) add('ไม่มี canonical');
  else if (!canonical.startsWith('https://')) add('canonical ไม่ใช่ absolute URL');
  else if (!canonical.endsWith('/')) add('canonical ไม่ปิดท้ายด้วย /');

  for (const prop of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!html.includes(`property="${prop}"`)) add(`ไม่มี ${prop}`);
  }

  const ld = pick(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld && !is404) add('ไม่มี JSON-LD');
  else if (ld) {
    try {
      const data = JSON.parse(ld);
      if (!Array.isArray(data['@graph']) || data['@graph'].length === 0)
        add('JSON-LD ไม่มี @graph หรือว่างเปล่า');
    } catch {
      add('JSON-LD parse ไม่ผ่าน');
    }
  }

  // ลิงก์ภายในที่ตายแล้ว
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/fonts/') || href.startsWith('/_astro/')) continue;
    if (/\.(png|svg|xml|txt|webp|jpg|ico)$/.test(href)) continue;
    if (!routes.has(href)) add(`ลิงก์ภายในตาย: ${href}`);
  }
}

console.log(`ตรวจ ${files.length} หน้า`);
if (problems.length > 0) {
  console.error(`\n❌ พบปัญหา ${problems.length} จุด:`);
  for (const p of [...new Set(problems)]) console.error('   - ' + p);
  process.exit(1);
}
console.log('✅ โครงสร้าง SEO ผ่านทุกข้อ');
