'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser } from '@/lib/auth';
import type { FeatureKey } from '@/lib/features';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PlanActionState {
  error?: string;
  done?: boolean;
}

const FEATURE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'theme_customize',
];

function parseIntField(formData: FormData, name: string, min: number): number | null {
  const value = Number(formData.get(name));
  if (!Number.isInteger(value) || value < min) return null;
  return value;
}

/** ช่องที่เว้นว่างได้ (เช่น ค่าดูแลรายปี — ว่าง = เท่าปีแรก) */
function parseOptionalIntField(
  formData: FormData,
  name: string,
  min: number,
): { ok: true; value: number | null } | { ok: false } {
  const raw = String(formData.get(name) ?? '').trim();
  if (!raw) return { ok: true, value: null };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) return { ok: false };
  return { ok: true, value };
}

interface ParsedPlanFields {
  price_yearly: number;
  price_renewal: number | null;
  max_products: number;
  max_images_per_product: number;
  max_staff: number;
  allowed_theme_tier: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

function parsePlanFields(formData: FormData): { error: string } | { fields: ParsedPlanFields } {
  const priceYearly = parseIntField(formData, 'price_yearly', 0);
  const priceRenewal = parseOptionalIntField(formData, 'price_renewal', 0);
  const maxProducts = parseIntField(formData, 'max_products', -1);
  const maxImages = parseIntField(formData, 'max_images_per_product', 1);
  const maxStaff = parseIntField(formData, 'max_staff', 0);
  const themeTier = parseIntField(formData, 'allowed_theme_tier', 1);

  if (priceYearly === null) return { error: 'ราคาปีแรกต้องเป็นจำนวนเต็มไม่ติดลบ' };
  if (!priceRenewal.ok) {
    return { error: 'ค่าดูแลรายปีต้องเป็นจำนวนเต็มไม่ติดลบ (เว้นว่าง = ราคาเดียวกับปีแรก)' };
  }
  if (maxProducts === null) return { error: 'จำนวนสินค้าสูงสุดต้องเป็นจำนวนเต็ม (-1 = ไม่จำกัด)' };
  if (maxImages === null) return { error: 'จำนวนรูปต่อสินค้าต้องเป็นจำนวนเต็มอย่างน้อย 1' };
  if (maxStaff === null) return { error: 'จำนวน staff ต้องเป็นจำนวนเต็มไม่ติดลบ' };
  if (themeTier === null || themeTier > 3) return { error: 'theme tier ต้องอยู่ระหว่าง 1–3' };

  const features: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = formData.get(`feature_${key}`) === 'on';
  }

  return {
    fields: {
      price_yearly: priceYearly,
      price_renewal: priceRenewal.value,
      max_products: maxProducts,
      max_images_per_product: maxImages,
      max_staff: maxStaff,
      allowed_theme_tier: themeTier,
      features,
      is_active: formData.get('is_active') === 'on',
    },
  };
}

export async function updatePlan(
  planId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const parsed = parsePlanFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const db = createAdminClient();
  const { error } = await db.from('plans').update(parsed.fields).eq('id', planId);

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  // ร้านที่ถือแพลนนี้ได้ค่าใหม่ทันที (flag คำนวณ realtime §5.2) — แค่ log ไว้
  await logTenantEvent(null, 'plan_updated', 'ok', {
    plan_id: planId,
    actor: user.email ?? user.id,
  });
  revalidatePath('/plans');
  return { done: true };
}

const PLAN_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,29}$/;

/** สร้างแพลนใหม่จาก UI (Billing v2 — เดิมเพิ่มแพลนได้ทาง SQL เท่านั้น) */
export async function createPlan(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  const nameTh = String(formData.get('name_th') ?? '').trim();
  if (!PLAN_CODE_PATTERN.test(code)) {
    return { error: 'รหัสแพลนต้องเป็น a-z 0-9 หรือ - ยาว 2–30 ตัว เช่น p2-shop' };
  }
  if (!nameTh) return { error: 'กรุณากรอกชื่อแพลน' };

  const parsed = parsePlanFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const db = createAdminClient();
  const { error } = await db.from('plans').insert({ code, name_th: nameTh, ...parsed.fields });

  if (error) {
    if (error.code === '23505') return { error: `รหัสแพลน "${code}" มีอยู่แล้ว` };
    return { error: `สร้างแพลนไม่สำเร็จ: ${error.message}` };
  }

  await logTenantEvent(null, 'plan_created', 'ok', { code, actor: user.email ?? user.id });
  revalidatePath('/plans');
  return { done: true };
}
