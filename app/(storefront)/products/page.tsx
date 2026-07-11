// แคตตาล็อกสินค้า — filter ฝั่ง server ผ่าน query params (§2.1)
// ?category=&size=&color=&sort=newest|price_asc|price_desc&page=
// ธีม marketplace (layout.catalogSidebar — ref T3): ?category=id1,id2&price_min=&price_max=&instock=1
// + layout 2 คอลัมน์ sidebar ฟิลเตอร์ซ้าย / grid 5 คอลัมน์ขวา

import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogSidebar, CatalogSortBar } from '@/components/storefront/CatalogSidebar';
import { FilterBar } from '@/components/storefront/FilterBar';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { fetchCatalog, fetchFilterOptions, type CatalogFilters } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';

const SORTS = ['newest', 'price_asc', 'price_desc'] as const;

interface CatalogParams {
  category?: string;
  size?: string;
  color?: string;
  q?: string;
  sort?: string;
  page?: string;
  price_min?: string;
  price_max?: string;
  instock?: string;
}

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

function parsePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function Pagination({
  page,
  pageCount,
  currentParams,
}: {
  page: number;
  pageCount: number;
  currentParams: URLSearchParams;
}) {
  if (pageCount <= 1) return null;
  return (
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
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogParams>;
}) {
  const params = await searchParams;
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);
  const sidebarLayout = preset.layout?.catalogSidebar === true;

  const sort = SORTS.includes(params.sort as (typeof SORTS)[number])
    ? (params.sort as (typeof SORTS)[number])
    : 'newest';
  const pageNum = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  // ธีม sidebar: category เป็น comma list (checkbox) / ธีมอื่น: ค่าเดียว
  const categoryList = (params.category ?? '').split(',').filter(Boolean);
  const filters: CatalogFilters = {
    categoryId: !sidebarLayout ? params.category || undefined : undefined,
    categoryIds: sidebarLayout && categoryList.length > 0 ? categoryList : undefined,
    size: params.size || undefined,
    color: params.color || undefined,
    search: params.q || undefined,
    sort,
    page: pageNum,
    priceMin: sidebarLayout ? parsePrice(params.price_min) : undefined,
    priceMax: sidebarLayout ? parsePrice(params.price_max) : undefined,
    inStockOnly: sidebarLayout && params.instock === '1',
  };

  const db = createAdminClient();
  const [{ products, total, page, pageCount }, { sizes, colors }, { data: categories }] =
    await Promise.all([
      fetchCatalog(ctx.tenantId, filters),
      fetchFilterOptions(ctx.tenantId),
      db
        .from('categories')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { ascending: true }),
    ]);

  const currentParams = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null) as [string, string][],
  );

  // ---------- ธีม marketplace (ref T3): sidebar ซ้าย + grid 5 คอลัมน์ขวา ----------
  if (sidebarLayout) {
    const selectedNames = (categories ?? [])
      .filter((c) => categoryList.includes(c.id))
      .map((c) => c.name);
    const title = params.q
      ? `ผลการค้นหา “${params.q}”`
      : selectedNames.length === 1
        ? selectedNames[0]
        : 'สินค้าทั้งหมด';

    return (
      <main className="mx-auto max-w-(--container-max) px-4 py-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[240px_1fr]">
          <Suspense fallback={null}>
            <CatalogSidebar categories={categories ?? []} sizes={sizes} colors={colors} />
          </Suspense>
          <div className="space-y-4">
            <Suspense fallback={null}>
              <CatalogSortBar total={total} />
            </Suspense>
            <ProductGrid
              products={products}
              cardVariant={preset.variants.productCard}
              emptyText="ไม่พบสินค้าตามเงื่อนไขที่เลือก"
              slug={ctx.slug}
              wishlistEnabled={ctx.features.wishlist}
            />
            <Pagination page={page} pageCount={pageCount} currentParams={currentParams} />
          </div>
        </div>
      </main>
    );
  }

  // ---------- ธีมอื่นทั้งหมด: FilterBar แนวนอนแบบเดิม ----------
  const activeCategory = (categories ?? []).find((c) => c.id === params.category);

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

      <Pagination page={page} pageCount={pageCount} currentParams={currentParams} />
    </main>
  );
}
