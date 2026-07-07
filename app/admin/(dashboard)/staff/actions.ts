'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser, userRole } from '@/lib/auth';
import { assertFeature, FeatureDisabledError, PlanLimitError } from '@/lib/features';
import { inviteStaff, removeStaff, setStaffDisabled } from '@/lib/staff';
import { getTenantContext, type TenantContext } from '@/lib/tenant-context';

export interface StaffActionState {
  error?: string;
  success?: string;
}

/** จัดการ staff ได้เฉพาะ "เจ้าของร้าน" (§2.3) + แพลนต้องมีฟีเจอร์ staff_accounts */
async function requireOwnerWithStaffFeature(): Promise<
  { ok: true; ctx: TenantContext } | { ok: false; error: string }
> {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  if (!user) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  if (userRole(user) !== 'store_owner') {
    return { ok: false, error: 'เฉพาะเจ้าของร้านเท่านั้นที่จัดการ staff ได้' };
  }
  try {
    assertFeature(ctx, 'staff_accounts');
  } catch (err) {
    if (err instanceof FeatureDisabledError) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, ctx };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const access = await requireOwnerWithStaffFeature();
  if (!access.ok) return { error: access.error };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_REGEX.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  if (password.length < 8) return { error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' };

  try {
    await inviteStaff(access.ctx, email, password);
  } catch (err) {
    if (err instanceof PlanLimitError || err instanceof Error) return { error: err.message };
    return { error: 'เพิ่ม staff ไม่สำเร็จ' };
  }

  revalidatePath('/admin/staff');
  return { success: `เพิ่ม ${email} เป็น staff แล้ว — แจ้งอีเมลและรหัสผ่านให้พนักงานได้เลย` };
}

export async function setStaffDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<StaffActionState> {
  const access = await requireOwnerWithStaffFeature();
  if (!access.ok) return { error: access.error };

  try {
    await setStaffDisabled(access.ctx.tenantId, userId, disabled);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ' };
  }
  revalidatePath('/admin/staff');
  return {};
}

export async function removeStaffAction(userId: string): Promise<StaffActionState> {
  const access = await requireOwnerWithStaffFeature();
  if (!access.ok) return { error: access.error };

  try {
    await removeStaff(access.ctx.tenantId, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ลบไม่สำเร็จ' };
  }
  revalidatePath('/admin/staff');
  return {};
}
