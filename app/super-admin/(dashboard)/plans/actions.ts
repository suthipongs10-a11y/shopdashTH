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
];

function parseIntField(formData: FormData, name: string, min: number): number | null {
  const value = Number(formData.get(name));
  if (!Number.isInteger(value) || value < min) return null;
  return value;
}

export async function updatePlan(
  planId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const priceYearly = parseIntField(formData, 'price_yearly', 0);
  const maxProducts = parseIntField(formData, 'max_products', -1);
  const maxImages = parseIntField(formData, 'max_images_per_product', 1);
  const maxStaff = parseIntField(formData, 'max_staff', 0);
  const themeTier = parseIntField(formData, 'allowed_theme_tier', 1);

  if (priceYearly === null) return { error: 'ราคาต่อปีต้องเป็นจำนวนเต็มไม่ติดลบ' };
  if (maxProducts === null) return { error: 'จำนวนสินค้าสูงสุดต้องเป็นจำนวนเต็ม (-1 = ไม่จำกัด)' };
  if (maxImages === null) return { error: 'จำนวนรูปต่อสินค้าต้องเป็นจำนวนเต็มอย่างน้อย 1' };
  if (maxStaff === null) return { error: 'จำนวน staff ต้องเป็นจำนวนเต็มไม่ติดลบ' };
  if (themeTier === null || themeTier > 3) return { error: 'theme tier ต้องอยู่ระหว่าง 1–3' };

  const features: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = formData.get(`feature_${key}`) === 'on';
  }

  const db = createAdminClient();
  const { error } = await db
    .from('plans')
    .update({
      price_yearly: priceYearly,
      max_products: maxProducts,
      max_images_per_product: maxImages,
      max_staff: maxStaff,
      allowed_theme_tier: themeTier,
      features,
      is_active: formData.get('is_active') === 'on',
    })
    .eq('id', planId);

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  // ร้านที่ถือแพลนนี้ได้ค่าใหม่ทันที (flag คำนวณ realtime §5.2) — แค่ log ไว้
  await logTenantEvent(null, 'plan_updated', 'ok', {
    plan_id: planId,
    actor: user.email ?? user.id,
  });
  revalidatePath('/plans');
  return { done: true };
}
