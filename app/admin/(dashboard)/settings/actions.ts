'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser, userRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { SOCIAL_KEYS, type SocialLinks } from '@/lib/theme-content';
import { getTenantContext, invalidateTenantCache } from '@/lib/tenant-context';

export interface SettingsState {
  error?: string;
  success?: boolean;
}

const PROMPTPAY_PATTERN = /^[0-9]{10}$|^[0-9]{13}$/;
const CUTOFF_TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

// ตั้งค่าร้านแก้ได้เฉพาะ "เจ้าของร้าน" (§2.3 P4: staff สิทธิ์เท่า owner ยกเว้น ตั้งค่าร้าน/แพลน/staff)
async function requireUser(): Promise<boolean> {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  return user !== null && userRole(user) === 'store_owner';
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
  const orderCutoffTime = String(formData.get('order_cutoff_time') ?? '').trim();
  const shippingNote = String(formData.get('shipping_note_th') ?? '').trim();

  if (!name) return { error: 'กรุณากรอกชื่อร้าน' };
  if (promptpayId && !PROMPTPAY_PATTERN.test(promptpayId)) {
    return { error: 'PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก' };
  }
  if (orderCutoffTime && !CUTOFF_TIME_PATTERN.test(orderCutoffTime)) {
    return { error: 'เวลาตัดรอบต้องเป็นรูปแบบ HH:MM เช่น 14:00' };
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
      order_cutoff_time: orderCutoffTime || null,
      shipping_note_th: shippingNote || null,
    })
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  invalidateTenantCache(ctx.slug); // กัน LRU 60s เสิร์ฟค่าเก่า
  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { success: true };
}

/** ลิงก์โซเชียลของร้าน (ปุ่มวงกลมใน footer ทุกธีม) — เก็บใน theme_overrides.__content.socials
 *  (jsonb เดิม — ไม่ต้อง migration; resolveThemeStyle อ่านเฉพาะ token จึงไม่กระทบธีม) */
export async function updateSocialLinks(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  if (!(await requireUser())) return { error: 'กรุณาเข้าสู่ระบบ' };

  const socials: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const raw = String(formData.get(`social_${key}`) ?? '').trim();
    if (!raw) continue;
    if (!/^https?:\/\/.+\..+/.test(raw)) {
      return { error: `ลิงก์ ${key} ต้องขึ้นต้นด้วย https:// เช่น https://facebook.com/ชื่อเพจ` };
    }
    socials[key] = raw.slice(0, 300);
  }

  const ctx = await getTenantContext();
  const db = createAdminClient();
  // merge เข้ากับ __content เดิม — แตะเฉพาะ key socials ไม่ทับเนื้อหาธีมส่วนอื่น
  const { data: row, error: readErr } = await db
    .from('stores')
    .select('theme_overrides')
    .eq('tenant_id', ctx.tenantId)
    .single();
  if (readErr) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  const overrides = (row.theme_overrides ?? {}) as Record<string, unknown>;
  const contentRaw = overrides['__content'];
  const contentObj =
    contentRaw && typeof contentRaw === 'object' && !Array.isArray(contentRaw)
      ? (contentRaw as Record<string, unknown>)
      : {};
  const nextOverrides = {
    ...overrides,
    __content: { ...contentObj, socials },
  };

  const { error } = await db
    .from('stores')
    .update({ theme_overrides: nextOverrides })
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { success: true };
}

/** ตั้งค่า LINE OA token (งาน 4.5 — feature flag `line_oa`, server ตรวจซ้ำ) */
export async function updateLineToken(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };
  if (!ctx.features.line_oa) {
    return { error: 'ฟีเจอร์แจ้งเตือน LINE OA ใช้ได้กับแพลน Pro ขึ้นไป' };
  }

  const token = String(formData.get('line_token') ?? '').trim();
  const db = createAdminClient();
  const { error } = await db
    .from('stores')
    .update({ line_channel_access_token: token || null })
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/settings');
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
