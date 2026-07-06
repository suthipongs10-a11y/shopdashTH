// Tenant context helper (§3.8) — จุดเดียวที่ resolve ร้านของ request
// **เวอร์ชัน Phase 2**: อ่าน slug จาก header `x-tenant-slug` ที่ middleware แนบมา
// cache 2 ชั้น: ต่อ request ด้วย React cache() + ต่อ process ด้วย LRU TTL 60s

import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';

export class TenantNotFoundError extends Error {
  constructor(message = 'ไม่พบร้านค้า') {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

/** ร้านสถานะ locked — storefront แสดงหน้า "ปิดปรับปรุงชั่วคราว" (§7.4) */
export class TenantLockedError extends Error {
  constructor(message = 'ร้านนี้ปิดปรับปรุงชั่วคราว') {
    super(message);
    this.name = 'TenantLockedError';
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

interface TenantRow {
  id: string;
  slug: string;
  status: string;
  plans: PlanRow;
  stores: StoreRow;
}

// ---------- LRU cache ต่อ process (TTL 60s ตาม §3.8) ----------
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const tenantCache = new Map<string, { row: TenantRow; expires: number }>();

/** ล้าง cache ของร้าน — เรียกหลังแอดมินแก้ตั้งค่าร้าน เพื่อไม่ให้เห็นค่าเก่าค้าง 60s */
export function invalidateTenantCache(slug: string): void {
  tenantCache.delete(slug);
}

async function loadTenant(slug: string): Promise<TenantRow | null> {
  const cached = tenantCache.get(slug);
  if (cached && cached.expires > Date.now()) return cached.row;

  const db = createAdminClient();
  const { data } = await db
    .from('tenants')
    .select('id, slug, status, plans(*), stores(*)')
    .eq('slug', slug)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as TenantRow;
  if (!row.plans || !row.stores) return null;

  if (tenantCache.size >= MAX_ENTRIES) {
    const oldest = tenantCache.keys().next().value;
    if (oldest !== undefined) tenantCache.delete(oldest);
  }
  tenantCache.set(slug, { row, expires: Date.now() + TTL_MS });
  return row;
}

/**
 * คืน context ของร้านสำหรับ request ปัจจุบัน
 * - โยน TenantNotFoundError เมื่อไม่มี slug / ไม่พบร้าน / archived
 * - โยน TenantLockedError เมื่อร้านถูกล็อก (ค้างชำระ/ถูกระงับ)
 * ทุก query ใน storefront/store-admin ต้อง scope ด้วย ctx.tenantId เสมอ
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const headerList = await headers();
  const slug = headerList.get('x-tenant-slug');
  if (!slug) throw new TenantNotFoundError();

  const tenant = await loadTenant(slug);
  if (!tenant || tenant.status === 'archived') throw new TenantNotFoundError();
  if (tenant.status === 'locked') throw new TenantLockedError();

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    store: tenant.stores,
    plan: tenant.plans,
  };
});
