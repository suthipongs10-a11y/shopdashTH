// สร้าง/อัปเดต super admin user (Phase 3 งาน 3.1)
// รัน: node scripts/setup-super-admin.mjs [email] [password]
// default: superadmin@shopdash.local / SuperAdmin!2026 (เปลี่ยนก่อนใช้ production)
// idempotent — ถ้ามี user อยู่แล้วจะตั้ง role ให้อย่างเดียว ไม่แตะรหัสผ่าน

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

const email = process.argv[2] ?? 'superadmin@shopdash.local';
const password = process.argv[3] ?? 'SuperAdmin!2026';

const { data: list, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error('listUsers failed:', listError.message);
  process.exit(1);
}

let user = list.users.find((u) => u.email === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(`create ${email} failed:`, error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`created ${email}`);
}

// super admin ไม่ผูก tenant — role อย่างเดียว
const { error } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: { role: 'super_admin' },
});
console.log(error ? `FAIL: ${error.message}` : `ok ${email} -> super_admin`);
