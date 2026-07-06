// Tenant isolation test (Phase 2 งาน 2.6 — DoD ข้อ 1 และ 4)
// รัน: node --experimental-strip-types scripts/test-isolation.ts
//
// (ก) JWT ร้าน A select orders/products/customers/slips → เห็นเฉพาะของ A
// (ข) JWT ร้าน A insert product ที่ tenant_id = B → ถูก RLS ปฏิเสธ
// (ค) anon select orders/customers/payment_slips → 0 แถวเสมอ
// (ง) anon เห็นเฉพาะ products ที่ published
// (จ) ทุกตาราง relforcerowsecurity = true (ผ่าน RPC rls_status)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const SHOP2_TENANT = '00000000-0000-0000-0000-000000000011';
const DEMO_OWNER = { email: 'phase1-smoke-test@shopdash.local', password: 'Sm0keTest!2026' };

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function anonClient(): SupabaseClient {
  return createClient(URL_, ANON, { auth: { persistSession: false } });
}

// ---------- (จ) FORCE RLS ครบทุกตาราง ----------
console.log('\n[จ] RLS enabled + forced ทุกตาราง');
const service = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const { data: rls, error: rlsError } = await service.rpc('rls_status');
check('rpc rls_status เรียกได้ (service role)', !rlsError, rlsError?.message);
if (rls) {
  const bad = (rls as { table_name: string; rls_enabled: boolean; rls_forced: boolean }[]).filter(
    (r) => !r.rls_enabled || !r.rls_forced,
  );
  check(
    `ทั้ง ${(rls as unknown[]).length} ตาราง forced ครบ`,
    bad.length === 0,
    JSON.stringify(bad),
  );
}

// ---------- (ค) anon: ตารางอ่อนไหวต้อง 0 แถว ----------
console.log('\n[ค] anon key อ่านตารางอ่อนไหว → 0 แถวเสมอ');
for (const table of ['orders', 'order_items', 'customers', 'payment_slips', 'stock_movements']) {
  const { data, error } = await anonClient().from(table).select('id').limit(10);
  check(`anon ${table} = 0 แถว`, !error && (data ?? []).length === 0, error?.message);
}

// ---------- (ง) anon เห็นเฉพาะ products published ----------
console.log('\n[ง] anon เห็นเฉพาะสินค้า published');
{
  const { data } = await anonClient().from('products').select('id, status');
  const rows = data ?? [];
  check('anon products > 0 แถว (มีของ published)', rows.length > 0);
  check(
    'ทุกแถว status = published',
    rows.every((r) => r.status === 'published'),
    JSON.stringify(rows.filter((r) => r.status !== 'published')),
  );
  // ระดับ SQL anon อ่านข้าม tenant ได้ (by design §3.5) — แอปต้อง scope เอง
}
{
  const { data } = await anonClient().from('product_variants').select('id, is_enabled');
  check('anon variants ทุกแถว is_enabled', (data ?? []).every((v) => v.is_enabled));
}

// ---------- (ก)+(ข) JWT ร้าน A ----------
console.log('\n[ก] JWT ร้าน A (demo) เห็นเฉพาะข้อมูลร้านตัวเอง');
const shopA = anonClient();
const { data: signIn, error: signInError } = await shopA.auth.signInWithPassword(DEMO_OWNER);
check('login demo owner สำเร็จ', !signInError && !!signIn?.user, signInError?.message);

if (signIn?.user) {
  const meta = signIn.user.app_metadata as { tenant_id?: string; role?: string };
  check(
    'JWT มี app_metadata tenant_id + role',
    meta.tenant_id === DEMO_TENANT && meta.role === 'store_owner',
    JSON.stringify(meta),
  );

  for (const table of ['orders', 'products', 'customers', 'payment_slips']) {
    const { data, error } = await shopA.from(table).select('tenant_id').limit(200);
    const rows = data ?? [];
    const crossTenant = rows.filter((r) => r.tenant_id !== DEMO_TENANT);
    check(
      `${table}: ${rows.length} แถว ทั้งหมดเป็นของ demo`,
      !error && crossTenant.length === 0,
      error?.message ?? `${crossTenant.length} แถวข้าม tenant!`,
    );
  }

  // จงใจ select สินค้าร้าน B ตรงๆ → ต้องเห็นเฉพาะที่ policy public อนุญาต...
  // products มี policy anon(published) — แต่ role authenticated ไม่มี policy public
  // จึงเห็นเฉพาะ tenant ตัวเอง → query ร้าน B ต้องได้ 0
  const { data: crossRead } = await shopA
    .from('products')
    .select('id')
    .eq('tenant_id', SHOP2_TENANT);
  check('อ่าน products ของ shop2 ตรงๆ = 0 แถว', (crossRead ?? []).length === 0);

  console.log('\n[ข] JWT ร้าน A insert ข้อมูลใส่ร้าน B → ถูก RLS ปฏิเสธ');
  const { error: insertCross } = await shopA.from('products').insert({
    tenant_id: SHOP2_TENANT,
    name: 'สินค้าแอบยัดข้ามร้าน',
    base_price: 1,
    status: 'draft',
  });
  check('insert product tenant_id=B ถูกปฏิเสธ', insertCross !== null, 'insert สำเร็จ = รั่ว!');

  const { error: updateCross, data: updated } = await shopA
    .from('stores')
    .update({ name: 'โดนแฮ็ก' })
    .eq('tenant_id', SHOP2_TENANT)
    .select('id');
  check(
    'update stores ของร้าน B ไม่มีผล',
    updateCross !== null || (updated ?? []).length === 0,
  );

  await shopA.auth.signOut();
}

// ---------- สรุป ----------
console.log(`\n${'='.repeat(40)}`);
console.log(`ผ่าน ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.error('ISOLATION_TEST_FAILED');
  process.exit(1);
}
console.log('ISOLATION_TEST_PASSED');
