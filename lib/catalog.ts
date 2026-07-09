// Query สินค้าฝั่ง storefront — เฉพาะ published + variant ที่เปิดขาย
// ทุก query scope ด้วย tenantId จาก getTenantContext() เสมอ (§3.8)

import 'server-only';
import type { ProductCardData } from '@/components/storefront/types';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

export const CATALOG_PAGE_SIZE = 24; // §2.1

export interface CatalogFilters {
  categoryId?: string;
  size?: string;
  color?: string;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
}

/** ตัดอักขระ wildcard ของ LIKE ออก (`%` `_` `\`) — ค้นหาแบบ substring ตรงตัว (§5.4) */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[\\%_]/g, '').trim().slice(0, 100);
}

interface ProductRow {
  id: string;
  name: string;
  base_price: number;
  product_images: { r2_key: string; sort_order: number }[];
  product_variants: {
    price_override: number | null;
    stock: number;
    size: string | null;
    color: string | null;
  }[];
}

const CARD_SELECT =
  'id, name, base_price, created_at, ' +
  'product_images(r2_key, sort_order), ' +
  'product_variants!inner(price_override, stock, size, color, is_enabled)';

function toCard(row: ProductRow): ProductCardData {
  const prices = row.product_variants.map((v) => v.price_override ?? row.base_price);
  const image = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: row.id,
    name: row.name,
    href: `/products/${row.id}`,
    priceMin: prices.length > 0 ? Math.min(...prices) : row.base_price,
    priceMax: prices.length > 0 ? Math.max(...prices) : undefined,
    imageUrl: image ? publicR2Url(image.r2_key) : undefined,
    inStock: row.product_variants.some((v) => v.stock > 0),
  };
}

function baseQuery(tenantId: string, filters: CatalogFilters, withCount: boolean) {
  const db = createAdminClient();
  let q = db
    .from('products')
    .select(CARD_SELECT, withCount ? { count: 'exact' } : undefined)
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .eq('product_variants.is_enabled', true);

  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.size) q = q.eq('product_variants.size', filters.size);
  if (filters.color) q = q.eq('product_variants.color', filters.color);
  if (filters.search) {
    const term = sanitizeSearch(filters.search);
    // pg_trgm GIN index (migration 006) รองรับ ILIKE — ค้นหาไทยบางส่วน
    if (term) q = q.ilike('name', `%${term}%`);
  }

  switch (filters.sort) {
    case 'price_asc':
      return q.order('base_price', { ascending: true });
    case 'price_desc':
      return q.order('base_price', { ascending: false });
    default:
      return q.order('created_at', { ascending: false });
  }
}

/** แคตตาล็อก — filter ฝั่ง server + pagination 24 ชิ้น/หน้า */
export async function fetchCatalog(
  tenantId: string,
  filters: CatalogFilters,
): Promise<{ products: ProductCardData[]; total: number; page: number; pageCount: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * CATALOG_PAGE_SIZE;
  const { data, count } = await baseQuery(tenantId, filters, true).range(
    from,
    from + CATALOG_PAGE_SIZE - 1,
  );
  const total = count ?? 0;
  return {
    products: ((data ?? []) as unknown as ProductRow[]).map(toCard),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

/** สินค้าแนะนำหน้าแรก (flag is_featured) */
export async function fetchFeatured(tenantId: string, limit = 8): Promise<ProductCardData[]> {
  const { data } = await baseQuery(tenantId, {}, false).eq('is_featured', true).limit(limit);
  return ((data ?? []) as unknown as ProductRow[]).map(toCard);
}

/** สินค้าล่าสุดหน้าแรก */
export async function fetchLatest(tenantId: string, limit = 8): Promise<ProductCardData[]> {
  const { data } = await baseQuery(tenantId, {}, false).limit(limit);
  return ((data ?? []) as unknown as ProductRow[]).map(toCard);
}

/** สินค้าที่เกี่ยวข้อง (P4 — หมวดเดียวกันก่อน ไม่พอเติมสินค้าล่าสุด) */
export async function fetchRelated(
  tenantId: string,
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<ProductCardData[]> {
  let rows: ProductRow[] = [];
  if (categoryId) {
    const { data } = await baseQuery(tenantId, { categoryId }, false)
      .neq('id', productId)
      .limit(limit);
    rows = (data ?? []) as unknown as ProductRow[];
  }
  if (rows.length < limit) {
    const { data } = await baseQuery(tenantId, {}, false)
      .neq('id', productId)
      .limit(limit + rows.length);
    const seen = new Set(rows.map((r) => r.id));
    for (const row of (data ?? []) as unknown as ProductRow[]) {
      if (rows.length >= limit) break;
      if (!seen.has(row.id)) rows.push(row);
    }
  }
  return rows.slice(0, limit).map(toCard);
}

/** ตัวเลือกไซส์/สีทั้งหมดของร้าน (ไว้ทำ FilterBar) */
export async function fetchFilterOptions(
  tenantId: string,
): Promise<{ sizes: string[]; colors: string[] }> {
  const db = createAdminClient();
  const { data } = await db
    .from('product_variants')
    .select('size, color, products!inner(status)')
    .eq('tenant_id', tenantId)
    .eq('is_enabled', true)
    .eq('products.status', 'published');

  const sizes = new Set<string>();
  const colors = new Set<string>();
  for (const v of data ?? []) {
    if (v.size) sizes.add(v.size);
    if (v.color) colors.add(v.color);
  }
  return { sizes: [...sizes].sort(), colors: [...colors].sort() };
}

// ---------- หน้าสินค้า ----------

export interface StorefrontVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  descriptionMd: string | null;
  basePrice: number;
  categoryId: string | null;
  images: string[];
  variants: StorefrontVariant[];
}

interface ProductDetailRow {
  id: string;
  name: string;
  description_md: string | null;
  base_price: number;
  category_id: string | null;
  product_images: { r2_key: string; sort_order: number }[];
  product_variants: {
    id: string;
    size: string | null;
    color: string | null;
    price_override: number | null;
    stock: number;
    is_enabled: boolean;
  }[];
}

export async function fetchProduct(
  tenantId: string,
  productId: string,
): Promise<StorefrontProduct | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('products')
    .select(
      'id, name, description_md, base_price, category_id, ' +
        'product_images(r2_key, sort_order), ' +
        'product_variants(id, size, color, price_override, stock, is_enabled)',
    )
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .eq('status', 'published')
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as ProductDetailRow;

  return {
    id: row.id,
    name: row.name,
    descriptionMd: row.description_md,
    basePrice: row.base_price,
    categoryId: row.category_id,
    images: [...(row.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => publicR2Url(img.r2_key)),
    variants: (row.product_variants ?? [])
      .filter((v) => v.is_enabled)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        price: v.price_override ?? row.base_price,
        stock: v.stock,
      })),
  };
}
