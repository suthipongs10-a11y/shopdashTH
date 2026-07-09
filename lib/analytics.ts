// Analytics — typed wrappers รอบ RPC ใน migration 005 (§5.2–5.3)
// ทุกฟังก์ชันเรียกผ่าน service role (createAdminClient) + scope ด้วย tenantId
// นับเฉพาะออร์เดอร์ confirmed/packing/shipped (ตัดสินใจที่ชั้น SQL แล้ว)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface DailySalesPoint {
  day: string; // YYYY-MM-DD (เวลาไทย)
  order_count: number;
  revenue: number;
}
export interface WeeklySalesPoint {
  week_start: string;
  order_count: number;
  revenue: number;
}
export interface TopProduct {
  product_name: string;
  qty: number;
  revenue: number;
}
export interface SalesSummary {
  revenue: number;
  order_count: number;
  avg_order_value: number;
}

// ---------- Store-level (§5.2) ----------

export async function getStoreDailySales(tenantId: string, days = 30): Promise<DailySalesPoint[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('store_daily_sales', {
    p_tenant_id: tenantId,
    p_days: days,
  });
  if (error) throw new Error(`store_daily_sales: ${error.message}`);
  return (data ?? []) as DailySalesPoint[];
}

export async function getStoreWeeklySales(
  tenantId: string,
  weeks = 12,
): Promise<WeeklySalesPoint[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('store_weekly_sales', {
    p_tenant_id: tenantId,
    p_weeks: weeks,
  });
  if (error) throw new Error(`store_weekly_sales: ${error.message}`);
  return (data ?? []) as WeeklySalesPoint[];
}

export async function getStoreTopProducts(
  tenantId: string,
  days = 30,
  limit = 10,
): Promise<TopProduct[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('store_top_products', {
    p_tenant_id: tenantId,
    p_days: days,
    p_limit: limit,
  });
  if (error) throw new Error(`store_top_products: ${error.message}`);
  return (data ?? []) as TopProduct[];
}

export async function getStoreSalesSummary(tenantId: string, days = 30): Promise<SalesSummary> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('store_sales_summary', {
    p_tenant_id: tenantId,
    p_days: days,
  });
  if (error) throw new Error(`store_sales_summary: ${error.message}`);
  const row = (data as SalesSummary[] | null)?.[0];
  return row ?? { revenue: 0, order_count: 0, avg_order_value: 0 };
}

/** จำนวนออร์เดอร์แยกตามสถานะ (คืน map สถานะ → จำนวน) */
export async function getStoreOrderStatusCounts(
  tenantId: string,
): Promise<Record<string, number>> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('store_order_status_counts', {
    p_tenant_id: tenantId,
  });
  if (error) throw new Error(`store_order_status_counts: ${error.message}`);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { status: string; count: number }[]) {
    out[r.status] = r.count;
  }
  return out;
}

export interface LowStockVariant {
  productId: string;
  productName: string;
  label: string;
  stock: number;
  threshold: number;
}

/** variant ที่สต๊อกต่ำกว่า/เท่ากับ threshold (เปิดขายอยู่) — แถบเตือนบนแดชบอร์ด */
export async function getLowStockVariants(
  tenantId: string,
  limit = 20,
): Promise<LowStockVariant[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('product_variants')
    .select('product_id, size, color, stock, low_stock_threshold, is_enabled, products!inner(name, status)')
    .eq('tenant_id', tenantId)
    .eq('is_enabled', true)
    .neq('products.status', 'draft')
    .order('stock', { ascending: true })
    .limit(200);
  if (error) throw new Error(`low stock: ${error.message}`);

  type Row = {
    product_id: string;
    size: string | null;
    color: string | null;
    stock: number;
    low_stock_threshold: number;
    products: { name: string } | { name: string }[];
  };

  return ((data ?? []) as unknown as Row[])
    .filter((v) => v.stock <= v.low_stock_threshold)
    .slice(0, limit)
    .map((v) => {
      const product = Array.isArray(v.products) ? v.products[0] : v.products;
      const label = [v.size, v.color].filter(Boolean).join(' / ') || 'ไม่มีตัวเลือก';
      return {
        productId: v.product_id,
        productName: product?.name ?? '(ไม่มีชื่อ)',
        label,
        stock: v.stock,
        threshold: v.low_stock_threshold,
      };
    });
}

// ---------- Platform-level (§5.3) ----------

export interface PlatformSummary {
  mrr: number;
  arr: number;
  active_stores: number;
  trial_stores: number;
  grace_stores: number;
  locked_stores: number;
  archived_stores: number;
  total_stores: number;
  churned_30d: number;
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('platform_summary');
  if (error) throw new Error(`platform_summary: ${error.message}`);
  const row = (data as PlatformSummary[] | null)?.[0];
  return (
    row ?? {
      mrr: 0,
      arr: 0,
      active_stores: 0,
      trial_stores: 0,
      grace_stores: 0,
      locked_stores: 0,
      archived_stores: 0,
      total_stores: 0,
      churned_30d: 0,
    }
  );
}

export async function getPlatformNewStores(
  months = 12,
): Promise<{ month: string; count: number }[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('platform_new_stores', { p_months: months });
  if (error) throw new Error(`platform_new_stores: ${error.message}`);
  return (data ?? []) as { month: string; count: number }[];
}
