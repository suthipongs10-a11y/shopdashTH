// ผูก auth users เข้า tenant + role ผ่าน app_metadata (Phase 2 งาน 2.4)
// รัน: node scripts/setup-tenant-users.mjs
// idempotent — รันซ้ำได้ (Phase 3 auto-provisioning จะทำขั้นตอนนี้อัตโนมัติตอน signup)

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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const SHOP2_TENANT = '00000000-0000-0000-0000-000000000011';

// [email, tenant_id, role, passwordถ้าต้องสร้างใหม่]
const ASSIGNMENTS = [
  ['testdash@shopdash.com', DEMO_TENANT, 'store_owner', null],
  ['phase1-smoke-test@shopdash.local', DEMO_TENANT, 'store_owner', null],
  ['shop2-owner@shopdash.local', SHOP2_TENANT, 'store_owner', 'Shop2Test!2026'],
];

const { data: list, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error('listUsers failed:', listError.message);
  process.exit(1);
}

for (const [email, tenantId, role, password] of ASSIGNMENTS) {
  let user = list.users.find((u) => u.email === email);

  if (!user && password) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`create ${email} failed:`, error.message);
      continue;
    }
    user = data.user;
    console.log(`created ${email}`);
  }
  if (!user) {
    console.log(`skip ${email} (not found, no password provided)`);
    continue;
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { tenant_id: tenantId, role },
  });
  console.log(error ? `FAIL ${email}: ${error.message}` : `ok ${email} -> ${role} @ ${tenantId.slice(-4)}`);
}
