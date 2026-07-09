// Seed load test data (§6 5.1 / DoD ข้อ 2) — insert ออร์เดอร์ confirmed จำนวนมาก
// เพื่อวัดว่า query แดชบอร์ดตอบใน < 1s ที่ 10,000 แถว
//
// รัน:   node --experimental-strip-types scripts/seed-load.ts [count]   (ดีฟอลต์ 10000)
// ล้าง:  node --experimental-strip-types scripts/seed-load.ts --clean
//
// ออร์เดอร์ที่ seed ใช้ order_number ขึ้นต้น 'PERF-' → ล้างทีหลังได้ด้วย --clean
// insert ลงร้าน demo (มี plan/store/customer อยู่แล้ว) — order_items ตาม snapshot

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const PREFIX = 'PERF-';
const CHUNK = 500;

// สินค้าจำลองสำหรับทดสอบ top-products (snapshot ชื่อ/ราคาใน order_items)
const PRODUCTS = [
  { name: 'เสื้อยืดคอกลม', price: 290 },
  { name: 'กางเกงยีนส์', price: 690 },
  { name: 'เดรสลายดอก', price: 550 },
  { name: 'เสื้อเชิ้ตอ็อกซ์ฟอร์ด', price: 450 },
  { name: 'กระโปรงพลีท', price: 390 },
];

async function ensureCustomer(): Promise<string> {
  const phone = '0800000000';
  const { data: existing } = await db
    .from('customers')
    .select('id')
    .eq('tenant_id', DEMO_TENANT)
    .eq('phone', phone)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db
    .from('customers')
    .insert({ tenant_id: DEMO_TENANT, phone, name: 'ลูกค้าทดสอบโหลด' })
    .select('id')
    .single();
  if (error) throw new Error(`ensureCustomer: ${error.message}`);
  return data.id;
}

async function clean(): Promise<void> {
  // order_items ลบตาม cascade เมื่อ order ถูกลบ
  const { error } = await db
    .from('orders')
    .delete()
    .eq('tenant_id', DEMO_TENANT)
    .like('order_number', `${PREFIX}%`);
  if (error) throw new Error(`clean: ${error.message}`);
  console.log('ลบออร์เดอร์ PERF- ทั้งหมดแล้ว');
}

async function seed(count: number): Promise<void> {
  const customerId = await ensureCustomer();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let inserted = 0;

  for (let start = 0; start < count; start += CHUNK) {
    const n = Math.min(CHUNK, count - start);
    const orders = [];
    const meta: { productName: string; price: number; qty: number }[] = [];
    for (let j = 0; j < n; j++) {
      const i = start + j;
      const p = PRODUCTS[i % PRODUCTS.length];
      const qty = (i % 3) + 1;
      const total = p.price * qty;
      // กระจายทั่ว 35 วันล่าสุด (30-วัน window มีข้อมูลแน่น)
      const createdAt = new Date(now - (i % 35) * DAY - (i % 24) * 60 * 60 * 1000);
      orders.push({
        tenant_id: DEMO_TENANT,
        order_number: `${PREFIX}${i}`,
        customer_id: customerId,
        status: 'confirmed',
        subtotal: total,
        shipping_fee: 0,
        discount: 0,
        total_amount: total,
        ship_name: 'ผู้รับทดสอบ',
        ship_phone: '0800000000',
        ship_address: 'ที่อยู่ทดสอบ',
        created_at: createdAt.toISOString(),
      });
      meta.push({ productName: p.name, price: p.price, qty });
    }

    const { data, error } = await db.from('orders').insert(orders).select('id');
    if (error) throw new Error(`insert orders @${start}: ${error.message}`);

    const items = (data ?? []).map((o, k) => ({
      tenant_id: DEMO_TENANT,
      order_id: o.id,
      variant_id: '00000000-0000-0000-0000-0000000000ff', // ไม่มี FK (snapshot §3.4)
      product_name: meta[k].productName,
      variant_label: null,
      unit_price: meta[k].price,
      qty: meta[k].qty,
    }));
    const { error: itemErr } = await db.from('order_items').insert(items);
    if (itemErr) throw new Error(`insert items @${start}: ${itemErr.message}`);

    inserted += n;
    process.stdout.write(`\r  seeded ${inserted}/${count}`);
  }
  console.log(`\nเสร็จ — insert ${inserted} ออร์เดอร์ (confirmed) ลงร้าน demo`);
}

const arg = process.argv[2];
if (arg === '--clean') {
  await clean();
} else {
  const count = arg ? Number.parseInt(arg, 10) : 10000;
  console.log(`กำลัง seed ${count} ออร์เดอร์ลงร้าน demo …`);
  await seed(count);
}
