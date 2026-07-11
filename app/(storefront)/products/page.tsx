// แคตตาล็อกสินค้า — filter ฝั่ง server ผ่าน query params (§2.1)
// ?category=&size=&color=&sort=newest|price_asc|price_desc&page=

import Link from 'next/link';
import { Suspense } from 'react';
import { FilterBar } from '@/components/storefront/FilterBar';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { fetchCatalog, fetchFilterOptions } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';

const SORTS = ['newest', 'price_asc', 'price_desc'] as const;

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete('page');
  } else {
    next.set('page', String(page));
  }
  const qs = next.toString();
  return qs ? `/products?${qs}` : '/products';
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    size?: string;
    color?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);

  const sort = SORTS.includes(params.sort as (typeof SORTS)[number])
    ? (params.sort as (typeof SORTS)[number])
    : 'newest';
  const pageNum = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const db = createAdminClient();
  const [{ products, total, page, pageCount }, { sizes, colors }, { data: categories }] =
    await Promise.all([
      fetchCatalog(ctx.tenantId, {
        categoryId: params.category || undefined,
        size: params.size || undefined,
        color: params.color || undefined,
        search: params.q || undefined,
        sort,
        page: pageNum,
      }),
      fetchFilterOptions(ctx.tenantId),
      db
        .from('categories')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { ascending: true }),
    ]);

  const activeCategory = (categories ?? []).find((c) => c.id === params.category);
  const currentParams = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null) as [string, string][],
  );

  return (
    <main className="mx-auto max-w-(--container-max) space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {params.q
            ? `ผลการค้นหา “${params.q}”`
            : activeCategory
              ? activeCategory.name
              : 'สินค้าทั้งหมด'}
        </h1>
        <p className="rounded-full bg-surface px-3 py-1 text-sm text-text-muted">
          พบ {total.toLocaleString('th-TH')} รายการ
        </p>
      </div>

      <Suspense fallback={null}>
        <FilterBar categories={categories ?? []} sizes={sizes} colors={colors} />
      </Suspense>

      <ProductGrid
        products={products}
        cardVariant={preset.variants.productCard}
        emptyText="ไม่พบสินค้าตามเงื่อนไขที่เลือก"
        slug={ctx.slug}
        wishlistEnabled={ctx.features.wishlist}
        detailButtonText={ctx.features.online_ordering ? 'สั่งซื้อ' : 'ดูรายละเอียด'}
      />

      {pageCount > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Link
              href={pageHref(currentParams, page - 1)}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              ← ก่อนหน้า
            </Link>
          )}
          <span className="rounded-full bg-surface px-4 py-2 text-sm text-text-muted">
            หน้า {page} / {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={pageHref(currentParams, page + 1)}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              ถัดไป →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
