// Auth helpers (§3.3 ข้อ 4): tenant_id + role ฝังใน auth.users.raw_app_metadata
// app_metadata แก้ได้เฉพาะ service role — client ปลอมไม่ได้ (ต่างจาก user_metadata)

import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { TenantContext } from '@/lib/tenant-context';

export type AppRole = 'store_owner' | 'store_staff' | 'super_admin';

export interface AppMetadata {
  tenant_id?: string;
  role?: AppRole;
}

export function userTenantId(user: User): string | null {
  return (user.app_metadata as AppMetadata).tenant_id ?? null;
}

export function userRole(user: User): AppRole | null {
  return (user.app_metadata as AppMetadata).role ?? null;
}

/** ผูก user เข้า tenant + role — ใช้โดย provisioning (Phase 3) และสคริปต์ตั้งค่า */
export async function setUserTenant(
  userId: string,
  tenantId: string,
  role: Exclude<AppRole, 'super_admin'>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, role },
  });
  if (error) throw new Error(`setUserTenant failed: ${error.message}`);
}

/**
 * user ปัจจุบันเป็นแอดมิน (owner/staff) ของร้านใน context นี้หรือไม่
 * — login ของร้าน A ใช้กับ host ของร้าน B ไม่ได้ (§2.4 Phase 2)
 */
export async function getStoreUser(ctx: TenantContext): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = userRole(user);
  if (role !== 'store_owner' && role !== 'store_staff') return null;
  if (userTenantId(user) !== ctx.tenantId) return null;
  return user;
}

/** user ปัจจุบันเป็น super admin ของแพลตฟอร์มหรือไม่ (ใช้ที่ admin.shopdash.co เท่านั้น) */
export async function getSuperAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return userRole(user) === 'super_admin' ? user : null;
}
