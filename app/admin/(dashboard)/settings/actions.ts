'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, invalidateTenantCache } from '@/lib/tenant-context';

export interface SettingsState {
  error?: string;
  success?: boolean;
}

const PROMPTPAY_PATTERN = /^[0-9]{10}$|^[0-9]{13}$/;

async function requireUser(): Promise<boolean> {
  const ctx = await getTenantContext();
  return (await getStoreUser(ctx)) !== null;
}

export async function updateStoreSettings(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  if (!(await requireUser())) return { error: 'กรุณาเข้าสู่ระบบ' };

  const name = String(formData.get('name') ?? '').trim();
  const promptpayId = String(formData.get('promptpay_id') ?? '').trim();
  const promptpayAccountName = String(formData.get('promptpay_account_name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const flatShippingFee = Number(formData.get('flat_shipping_fee'));
  const freeShippingMinRaw = String(formData.get('free_shipping_min') ?? '').trim();

  if (!name) return { error: 'กรุณากรอกชื่อร้าน' };
  if (promptpayId && !PROMPTPAY_PATTERN.test(promptpayId)) {
    return { error: 'PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก' };
  }
  if (!Number.isInteger(flatShippingFee) || flatShippingFee < 0) {
    return { error: 'ค่าส่งต้องเป็นจำนวนเต็มไม่ติดลบ' };
  }
  let freeShippingMin: number | null = null;
  if (freeShippingMinRaw) {
    freeShippingMin = Number(freeShippingMinRaw);
    if (!Number.isInteger(freeShippingMin) || freeShippingMin <= 0) {
      return { error: 'ยอดขั้นต่ำส่งฟรีต้องเป็นจำนวนเต็มมากกว่า 0 (เว้นว่าง = ไม่มีส่งฟรี)' };
    }
  }

  const ctx = await getTenantContext();
  const db = createAdminClient();
  const { error } = await db
    .from('stores')
    .update({
      name,
      promptpay_id: promptpayId || null,
      promptpay_account_name: promptpayAccountName || null,
      address: address || null,
      phone: phone || null,
      flat_shipping_fee: flatShippingFee,
      free_shipping_min: freeShippingMin,
    })
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  invalidateTenantCache(ctx.slug); // กัน LRU 60s เสิร์ฟค่าเก่า
  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { success: true };
}

export async function updateBrandingKey(
  kind: 'logo' | 'banner',
  r2Key: string,
): Promise<SettingsState> {
  if (!(await requireUser())) return { error: 'กรุณาเข้าสู่ระบบ' };

  const ctx = await getTenantContext();
  const db = createAdminClient();
  const column = kind === 'logo' ? 'logo_r2_key' : 'banner_r2_key';
  const { error } = await db
    .from('stores')
    .update({ [column]: r2Key })
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'บันทึกรูปไม่สำเร็จ' };
  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { success: true };
}
