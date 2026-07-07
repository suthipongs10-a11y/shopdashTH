'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, invalidateTenantCache } from '@/lib/tenant-context';
import { getPreset, THEME_PRESETS } from '@/themes/presets';
import { FONT_VAR } from '@/themes/fonts';

export interface ThemeActionState {
  error?: string;
  success?: boolean;
}

/** เปลี่ยนธีมร้าน — server ตรวจ tier ตามแพลนเสมอ (ห้ามเชื่อ UI §3.7) */
export async function setStoreTheme(
  _prev: ThemeActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };

  const code = String(formData.get('theme_code') ?? '');
  const preset = THEME_PRESETS[code];
  if (!preset) return { error: 'ไม่พบธีมที่เลือก' };
  if (preset.tier > ctx.plan.allowed_theme_tier) {
    return { error: `ธีม "${preset.nameTh}" ต้องใช้แพลนที่สูงกว่า — อัปเกรดแพลนเพื่อปลดล็อก` };
  }

  const db = createAdminClient();
  // เปลี่ยนธีม = ล้าง overrides เดิมด้วย (ค่าที่แต่งไว้ผูกกับธีมเก่า)
  const { error } = await db
    .from('stores')
    .update({ theme_code: code, theme_overrides: {} })
    .eq('tenant_id', ctx.tenantId);
  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/theme');
  revalidatePath('/');
  return { success: true };
}

/** ข้อความ AnnouncementBar (ธีมกลุ่ม Pro ขึ้นไปแสดง — เก็บได้ทุกร้าน) */
export async function setAnnouncementText(
  _prev: ThemeActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };

  const text = String(formData.get('announcement_text') ?? '').trim();
  const db = createAdminClient();
  const { error } = await db
    .from('stores')
    .update({ announcement_text: text || null })
    .eq('tenant_id', ctx.tenantId);
  if (error) return { error: 'บันทึกไม่สำเร็จ' };

  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/theme');
  revalidatePath('/');
  return { success: true };
}

// ---------- ปรับแต่งธีม (§4.6 — เฉพาะธีม customizable: prem-01/02) ----------

// token ที่เปิดให้ร้านแก้จากหน้า "ปรับแต่งธีม"
const CUSTOMIZABLE_TOKENS = ['--color-primary', '--color-accent', '--radius-md'] as const;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const RADIUS_PATTERN = /^\d{1,2}px$/;

export async function saveThemeOverrides(
  _prev: ThemeActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };

  const preset = getPreset(ctx.store.theme_code);
  if (!preset.customizable) {
    return { error: 'ธีมนี้ไม่รองรับการปรับแต่ง — ใช้ได้กับธีมซิกเนเจอร์และมินิมอลพรีเมียม' };
  }

  const overrides: Record<string, string> = {};

  for (const token of CUSTOMIZABLE_TOKENS) {
    const value = String(formData.get(token) ?? '').trim();
    if (!value || value === preset.tokens[token]) continue; // เท่าค่าธีม = ไม่ต้อง override
    if (token === '--radius-md') {
      if (!RADIUS_PATTERN.test(value)) return { error: 'ความโค้งมุมต้องเป็นค่า 0–99px เช่น 12px' };
    } else if (!HEX_PATTERN.test(value)) {
      return { error: 'ค่าสีต้องเป็นรหัส hex เช่น #1a3c34' };
    }
    overrides[token] = value;
  }

  for (const token of ['--font-heading', '--font-body'] as const) {
    const value = String(formData.get(token) ?? '').trim();
    if (!value || value === preset.tokens[token]) continue;
    if (!(value in FONT_VAR)) return { error: 'ฟอนต์ที่เลือกไม่อยู่ในรายการที่รองรับ' };
    overrides[token] = value;
  }

  const db = createAdminClient();
  const { error } = await db
    .from('stores')
    .update({ theme_overrides: overrides })
    .eq('tenant_id', ctx.tenantId);
  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/theme/customize');
  revalidatePath('/');
  return { success: true };
}

export async function resetThemeOverrides(): Promise<void> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return;

  const db = createAdminClient();
  await db.from('stores').update({ theme_overrides: {} }).eq('tenant_id', ctx.tenantId);
  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/theme/customize');
  revalidatePath('/');
}
