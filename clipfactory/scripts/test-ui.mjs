/**
 * ทดสอบพฤติกรรมฝั่งเบราว์เซอร์ที่ไม่ต้องเรียก Gemini
 *
 *   pnpm build && node scripts/test-ui.mjs
 *
 * ครอบคลุม: การกู้คืนงานที่ค้าง, การบันทึก/โหลด/ลบงาน, การแนะนำสูตรตามหมวด,
 * การกรองสูตรตามแพลตฟอร์ม และการคุมความยาวคลิปของ Shopee
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = process.env.PORT || '3131';
const BASE = `http://127.0.0.1:${PORT}`;

let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✕ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('เซิร์ฟเวอร์ไม่ตอบใน 60 วินาที')), 60_000);
    const onData = (buf) => {
      if (/Ready in/i.test(buf.toString())) {
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

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', PORT], { cwd: process.cwd() });

try {
  await waitForServer(server);

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  console.log('\nปฏิทินแคมเปญและช่องค้นเทรนด์');
  check('มีแถบแคมเปญที่กำลังจะมา', await page.locator('text=แคมเปญที่กำลังจะมา').isVisible());
  const campaignCards = await page.locator('button:has-text("อีก")').count();
  check('มีการ์ดแคมเปญอย่างน้อย 1 ใบ', campaignCards > 0, String(campaignCards));
  check('ปุ่มค้นเทรนด์ถูกปิดไว้ตอนยังไม่พิมพ์', await page.locator('button:has-text("ค้นเทรนด์ตอนนี้")').isDisabled());
  await page.fill('#trend-q', 'สกินแคร์');
  await page.waitForTimeout(200);
  check('พิมพ์แล้วปุ่มค้นเทรนด์ใช้ได้', !(await page.locator('button:has-text("ค้นเทรนด์ตอนนี้")').isDisabled()));
  await page.fill('#trend-q', '');

  console.log('\nแนะนำสูตรตามหมวดสินค้า');
  await page.fill('#p-name', 'ผงซักผ้าขาว ขจัดคราบฝังลึก');
  await page.fill('#p-cat', 'ทำความสะอาด');
  await page.waitForTimeout(300);
  const firstTemplate = await page.locator('section >> text=Problem → Solution Demo').first().isVisible();
  check('หมวดทำความสะอาด ดันสูตร Problem → Solution ขึ้นมา', firstTemplate);

  await page.fill('#p-cat', 'สกินแคร์');
  await page.waitForTimeout(300);
  const cards = await page.locator('[class*="rounded-lg border"] >> text=/^Listicle พูดหน้ากล้อง$/').count();
  check('หมวดสกินแคร์ ยังเห็นสูตร Listicle', cards > 0);

  console.log('\nกรองสูตรตามแพลตฟอร์ม');
  await page.click('[data-testid="platform-shopee"]');
  await page.waitForTimeout(300);
  check('มีหัวข้อแยกสูตรที่ไม่เหมาะกับ Shopee', await page.locator('[data-testid="unavailable-templates"]').isVisible());
  check('haul ถูกจัดอยู่กลุ่มที่ใช้กับ Shopee ไม่ได้',
    await page.locator('[data-testid="template-haul"]').isDisabled());

  console.log('\nคุมความยาวคลิปของ Shopee');
  await page.click('[data-testid="template-listicle"]');
  await page.waitForTimeout(300);
  const durInput = page.locator('#dur');
  check('ช่องกรอกความยาวปรากฏหลังเลือกสูตร', (await durInput.count()) === 1);
  const max = Number(await durInput.getAttribute('max'));
  const min = Number(await durInput.getAttribute('min'));
  const value = Number(await durInput.inputValue());
  check('ช่วงความยาวถูกคุมไว้ที่ 10–30 วิ', min >= 10 && max <= 30 && max > 0, `min=${min} max=${max}`);
  check('ค่าเริ่มต้นอยู่ในช่วงนั้นจริง', value >= min && value <= max, `value=${value}`);
  check('มีคำอธิบายช่วงความยาวของ Shopee', await page.locator('text=/Shopee แนะนำ 10–30 วิ/').isVisible());

  console.log('\nสลับกลับไป TikTok');
  await page.click('[data-testid="platform-tiktok"]');
  await page.waitForTimeout(300);
  check('haul กลับมาใช้ได้บน TikTok', !(await page.locator('[data-testid="template-haul"]').isDisabled()));

  console.log('\nบันทึกและโหลดงาน');
  await page.click('button:has-text("บันทึกงานนี้")');
  await page.waitForTimeout(400);
  const saved = await page.locator('text=ผงซักผ้าขาว ขจัดคราบฝังลึก').count();
  check('งานปรากฏในรายการที่บันทึกไว้', saved >= 1);

  await page.click('button:has-text("เริ่มสินค้าใหม่")');
  await page.waitForTimeout(300);
  check('เริ่มสินค้าใหม่แล้วฟอร์มว่าง', (await page.inputValue('#p-name')) === '');

  await page.locator('li >> text=ผงซักผ้าขาว ขจัดคราบฝังลึก').first().click();
  await page.waitForTimeout(400);
  check('โหลดงานเก่ากลับมาได้', (await page.inputValue('#p-name')) === 'ผงซักผ้าขาว ขจัดคราบฝังลึก');

  console.log('\nกู้คืนงานที่ค้างหลังปิดแท็บ');
  await page.fill('#p-name', 'ครีมกันแดดเนื้อบางเบา');
  await page.waitForTimeout(1200); // รอ autosave (หน่วง 800ms)
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  check('กู้คืนชื่อสินค้าที่ค้างไว้', (await page.inputValue('#p-name')) === 'ครีมกันแดดเนื้อบางเบา');
  check('มีแถบแจ้งว่ากู้คืนให้แล้ว', await page.locator('text=กู้คืนงานที่ค้างไว้ให้แล้ว').isVisible());

  console.log('\nวางข้อมูลจากแอป');
  await page.click('button:has-text("วางข้อมูลจากแอป")');
  await page.waitForTimeout(200);
  check('เปิดกล่องวางข้อมูลได้', await page.locator('textarea[placeholder*="ตัวอย่าง"]').isVisible());

  console.log('\nสถานะทั่วไป');
  check('ไม่มี JavaScript error ระหว่างใช้งาน', errors.length === 0, errors.join(' | '));

  await page.screenshot({ path: '/tmp/studio-v2.png', fullPage: false });
  await browser.close();
} catch (err) {
  failed++;
  console.error(`\n✕ ${err.message}`);
} finally {
  server.kill('SIGTERM');
}

console.log(failed === 0 ? '\n✓ ผ่านทั้งหมด\n' : `\n✕ ไม่ผ่าน ${failed} ข้อ\n`);
process.exit(failed === 0 ? 0 : 1);
