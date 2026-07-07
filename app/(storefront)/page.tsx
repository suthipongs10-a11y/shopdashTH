// หน้าแรกร้าน — ลำดับ section ตาม preset.sections (§4.4)
// basic-01: hero → featured → categories → grid → footer(อยู่ใน layout)

import Link from 'next/link';
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { fetchFeatured, fetchLatest } from '@/lib/catalog';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import type { ThemeSection } from '@/themes/types';

export default async function StorefrontHomePage() {
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);

  const db = createAdminClient();
  const [featured, latest, { data: categories }] = await Promise.all([
    fetchFeatured(ctx.tenantId),
    fetchLatest(ctx.tenantId),
    db
      .from('categories')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .order('sort_order', { ascending: true }),
  ]);

  const sections: Record<ThemeSection, React.ReactNode> = {
    announcement: <AnnouncementBar key="announcement" text={ctx.store.announcement_text} />,
    hero: (
      <HeroBanner
        key="hero"
        variant={preset.variants.hero}
        imageUrl={ctx.store.banner_r2_key ? publicR2Url(ctx.store.banner_r2_key) : undefined}
        headline={ctx.store.banner_r2_key ? undefined : ctx.store.name}
        ctaText="ดูสินค้าทั้งหมด"
        ctaHref="/products"
      />
    ),
    featured:
      featured.length > 0 ? (
        <section key="featured" className="mx-auto max-w-(--container-max) px-4 py-10">
          <h2 className="mb-4 font-heading text-xl font-semibold">สินค้าแนะนำ</h2>
          <ProductGrid products={featured} cardVariant={preset.variants.productCard} />
        </section>
      ) : null,
    categories:
      (categories ?? []).length > 0 ? (
        <section key="categories" className="mx-auto max-w-(--container-max) px-4 py-4">
          <h2 className="mb-4 font-heading text-xl font-semibold">หมวดหมู่</h2>
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null,
    grid: (
      <section key="grid" className="mx-auto max-w-(--container-max) px-4 py-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-semibold">สินค้ามาใหม่</h2>
          <Link href="/products" className="text-sm text-text-muted underline underline-offset-2">
            ดูทั้งหมด
          </Link>
        </div>
        <ProductGrid products={latest} cardVariant={preset.variants.productCard} />
      </section>
    ),
    footer: null, // Footer อยู่ใน layout
  };

  return <main>{preset.sections.map((name) => sections[name])}</main>;
}
