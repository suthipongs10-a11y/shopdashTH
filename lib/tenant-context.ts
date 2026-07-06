// Tenant context helper (§3.8) — จุดเดียวที่ resolve ร้านของ request
// **เวอร์ชัน Phase 1**: ร้านเดียว hardcode slug 'demo' (seed ด้วย fixed UUID)
// Phase 2 (งาน 2.2) จะเปลี่ยนเป็นอ่าน header x-tenant-slug จาก middleware
// + จัดการสถานะ locked/archived — signature ของฟังก์ชันคงเดิม

import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';

export class TenantNotFoundError extends Error {
  constructor(message = 'ไม่พบร้านค้า') {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

export interface PlanRow {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
  max_products: number;
  max_images_per_product: number;
  max_staff: number;
  allowed_theme_tier: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface StoreRow {
  id: string;
  tenant_id: string;
  name: string;
  logo_r2_key: string | null;
  banner_r2_key: string | null;
  promptpay_id: string | null;
  promptpay_account_name: string | null;
  address: string | null;
  phone: string | null;
  flat_shipping_fee: number;
  free_shipping_min: number | null;
  theme_code: string;
  theme_overrides: Record<string, unknown>;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  status: string;
  store: StoreRow;
  plan: PlanRow;
}

const PHASE1_SLUG = 'demo';

/**
 * คืน context ของร้านสำหรับ request ปัจจุบัน — cache ต่อ request ด้วย React cache()
 * ทุก query ใน storefront/store-admin ต้อง scope ด้วย ctx.tenantId เสมอ
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const db = createAdminClient();
  const { data, error } = await db
    .from('tenants')
    .select('id, slug, status, plans(*), stores(*)')
    .eq('slug', PHASE1_SLUG)
    .single();

  if (error || !data) {
    console.error('[getTenantContext] query failed', error);
    throw new TenantNotFoundError(
      'ไม่พบร้าน demo — ตรวจว่ารัน migration 001_init.sql และ seed.sql ใน Supabase แล้ว',
    );
  }

  const plan = data.plans as unknown as PlanRow;
  const store = data.stores as unknown as StoreRow;
  if (!plan || !store) {
    throw new TenantNotFoundError('ข้อมูลร้าน demo ไม่ครบ (ขาด plan หรือ store) — ตรวจ seed.sql');
  }

  return {
    tenantId: data.id,
    slug: data.slug,
    status: data.status,
    store,
    plan,
  };
});
