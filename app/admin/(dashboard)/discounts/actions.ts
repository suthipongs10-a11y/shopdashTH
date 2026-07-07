'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { normalizeDiscountCode } from '@/lib/discounts';
import { assertFeature, FeatureDisabledError } from '@/lib/features';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, type TenantContext } from '@/lib/tenant-context';

export interface DiscountActionState {
  error?: string;
  success?: boolean;
}

/** ทุก action ของหน้านี้: ต้องเป็นแอดมินร้าน + แพลนมีฟีเจอร์โค้ดส่วนลด (server ตรวจซ้ำ §3.7) */
async function requireDiscountAccess(): Promise<
  { ok: true; ctx: TenantContext } | { ok: false; error: string }
> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  try {
    assertFeature(ctx, 'discount_codes');
  } catch (err) {
    if (err instanceof FeatureDisabledError) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, ctx };
}

export async function createDiscount(
  _prev: DiscountActionState,
  formData: FormData,
): Promise<DiscountActionState> {
  const access = await requireDiscountAccess();
  if (!access.ok) return { error: access.error };

  const code = normalizeDiscountCode(String(formData.get('code') ?? ''));
  const type = String(formData.get('type') ?? '');
  const value = Number(formData.get('value'));
  const minOrderRaw = String(formData.get('min_order') ?? '').trim();
  const maxUsesRaw = String(formData.get('max_uses') ?? '').trim();
  const startsAt = String(formData.get('starts_at') ?? '').trim();
  const endsAt = String(formData.get('ends_at') ?? '').trim();

  if (!/^[A-Z0-9]{3,20}$/.test(code)) {
    return { error: 'โค้ดต้องเป็นตัวอักษรอังกฤษ/ตัวเลข 3–20 ตัว' };
  }
  if (type !== 'percent' && type !== 'fixed') return { error: 'ประเภทส่วนลดไม่ถูกต้อง' };
  if (!Number.isInteger(value) || value <= 0) {
    return { error: 'มูลค่าส่วนลดต้องเป็นจำนวนเต็มมากกว่า 0' };
  }
  if (type === 'percent' && value > 100) return { error: 'เปอร์เซ็นต์ส่วนลดต้องไม่เกิน 100' };

  let minOrder: number | null = null;
  if (minOrderRaw) {
    minOrder = Number(minOrderRaw);
    if (!Number.isInteger(minOrder) || minOrder <= 0) {
      return { error: 'ยอดขั้นต่ำต้องเป็นจำนวนเต็มมากกว่า 0 (เว้นว่าง = ไม่จำกัด)' };
    }
  }
  let maxUses: number | null = null;
  if (maxUsesRaw) {
    maxUses = Number(maxUsesRaw);
    if (!Number.isInteger(maxUses) || maxUses <= 0) {
      return { error: 'จำนวนครั้งใช้ต้องเป็นจำนวนเต็มมากกว่า 0 (เว้นว่าง = ไม่จำกัด)' };
    }
  }
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    return { error: 'วันหมดอายุต้องอยู่หลังวันเริ่มใช้งาน' };
  }

  const db = createAdminClient();
  const { error } = await db.from('discount_codes').insert({
    tenant_id: access.ctx.tenantId,
    code,
    type,
    value,
    min_order: minOrder,
    max_uses: maxUses,
    starts_at: startsAt ? new Date(startsAt).toISOString() : null,
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    is_active: true,
  });

  if (error) {
    if (error.code === '23505') return { error: 'มีโค้ดนี้อยู่แล้ว' };
    return { error: 'สร้างโค้ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }

  revalidatePath('/admin/discounts');
  return { success: true };
}

export async function toggleDiscount(discountId: string, isActive: boolean): Promise<void> {
  const access = await requireDiscountAccess();
  if (!access.ok) return;

  const db = createAdminClient();
  await db
    .from('discount_codes')
    .update({ is_active: isActive })
    .eq('id', discountId)
    .eq('tenant_id', access.ctx.tenantId);
  revalidatePath('/admin/discounts');
}

export async function deleteDiscount(discountId: string): Promise<void> {
  const access = await requireDiscountAccess();
  if (!access.ok) return;

  const db = createAdminClient();
  // ออร์เดอร์เก่าอ้าง discount_code_id ไว้ — ถ้าลบไม่ได้ (FK) ให้ปิดใช้งานแทน
  const { error } = await db
    .from('discount_codes')
    .delete()
    .eq('id', discountId)
    .eq('tenant_id', access.ctx.tenantId);
  if (error) {
    await db
      .from('discount_codes')
      .update({ is_active: false })
      .eq('id', discountId)
      .eq('tenant_id', access.ctx.tenantId);
  }
  revalidatePath('/admin/discounts');
}
