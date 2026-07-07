// Staff accounts (งาน 4.9 — §2.3): เชิญ user เพิ่มเป็น store_staff
// สิทธิ์เท่า owner ยกเว้น ตั้งค่าร้าน/แพลน/staff — จำกัดจำนวนตาม plans.max_staff (§5.1)
// นโยบายดาวน์เกรด §7.2: staff เกิน → disable login (ไม่ลบ)

import 'server-only';
import type { User } from '@supabase/supabase-js';
import type { AppMetadata } from '@/lib/auth';
import { PlanLimitError } from '@/lib/features';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/tenant-context';

export interface StaffMember {
  id: string;
  email: string;
  createdAt: string;
  /** ถูกระงับการเข้าใช้งาน (ban) อยู่หรือไม่ */
  disabled: boolean;
}

function isBanned(user: User): boolean {
  // supabase-js มี type banned_until อยู่แล้ว (string | undefined)
  const bannedUntil = (user as User & { banned_until?: string }).banned_until;
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

/** ผู้ใช้ทั้งหมดของ tenant ที่ role = store_staff */
export async function listStaff(tenantId: string): Promise<StaffMember[]> {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  return data.users
    .filter((u) => {
      const meta = u.app_metadata as AppMetadata;
      return meta.tenant_id === tenantId && meta.role === 'store_staff';
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? '(ไม่มีอีเมล)',
      createdAt: u.created_at,
      disabled: isBanned(u),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** สร้างบัญชี staff ใหม่ — ตรวจ limit ตามแพลนก่อน (นับเฉพาะที่ยังไม่ถูก disable) */
export async function inviteStaff(
  ctx: TenantContext,
  email: string,
  password: string,
): Promise<StaffMember> {
  const staff = await listStaff(ctx.tenantId);
  const activeCount = staff.filter((s) => !s.disabled).length;
  if (ctx.plan.max_staff >= 0 && activeCount >= ctx.plan.max_staff) {
    throw new PlanLimitError(
      `แพลน ${ctx.plan.name_th} เพิ่ม staff ได้สูงสุด ${ctx.plan.max_staff} คน — อัปเกรดแพลนเพื่อเพิ่ม staff`,
    );
  }

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id: ctx.tenantId, role: 'store_staff' },
  });
  if (error || !data.user) {
    if (error?.message.toLowerCase().includes('already')) {
      throw new Error('อีเมลนี้ถูกใช้ในระบบแล้ว');
    }
    throw new Error('สร้างบัญชี staff ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    createdAt: data.user.created_at,
    disabled: false,
  };
}

/** ตรวจว่า user เป็น staff ของ tenant นี้จริงก่อนแตะบัญชี (กันยิงข้ามร้าน) */
async function assertStaffOfTenant(tenantId: string, userId: string): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('ไม่พบบัญชีนี้');
  const meta = data.user.app_metadata as AppMetadata;
  if (meta.tenant_id !== tenantId || meta.role !== 'store_staff') {
    throw new Error('บัญชีนี้ไม่ใช่ staff ของร้าน');
  }
}

/** ปิด/เปิดการเข้าใช้งาน (ban/unban) — ใช้ทั้งจากหน้า staff และตอนดาวน์เกรด §7.2 */
export async function setStaffDisabled(
  tenantId: string,
  userId: string,
  disabled: boolean,
): Promise<void> {
  await assertStaffOfTenant(tenantId, userId);
  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? '87600h' : 'none', // ~10 ปี = ปิดจนกว่าจะเปิดใหม่
  });
  if (error) throw new Error(`ปรับสถานะบัญชีไม่สำเร็จ: ${error.message}`);
}

export async function removeStaff(tenantId: string, userId: string): Promise<void> {
  await assertStaffOfTenant(tenantId, userId);
  const db = createAdminClient();
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`ลบบัญชีไม่สำเร็จ: ${error.message}`);
}
