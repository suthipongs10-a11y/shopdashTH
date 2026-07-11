// หน้าแรกร้าน — ลำดับ section ตาม preset.sections (§4.4)
// basic-01: hero → featured → categories → grid → footer(อยู่ใน layout)

import Link from 'next/link';
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar';
import { CategoryBannerRow } from '@/components/storefront/CategoryBannerRow';
import { ContactCtaBand } from '@/components/storefront/ContactCtaBand';
import { FeatureBand } from '@/components/storefront/FeatureBand';
import { FeatureListBand } from '@/components/storefront/FeatureListBand';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { SectionHeading } from '@/components/storefront/SectionHeading';
import { ToolsRow } from '@/components/storefront/ToolsRow';
import { UspStrip } from '@/components/storefront/UspStrip';
import {
  ArrowRightIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
} from '@/components/storefront/icons';
import { fetchFeatured, fetchLatest } from '@/lib/catalog';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_FEATURE_BAND_TITLE,
  DEFAULT_FEATURE_LIST,
  DEFAULT_FEATURE_LIST_TITLE,
  DEFAULT_USP,
  getThemeContent,
} from '@/lib/theme-content';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import type { ThemeSection } from '@/themes/types';

export default async function StorefrontHomePage() {
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);
  const content = getThemeContent(ctx.store.theme_overrides);
  const isStoreCard = preset.variants.productCard === 'store';
  const isSimpleCard = preset.variants.productCard === 'simple';
  // §3.1 (ref T1): ปุ่มการ์ดตาม flag — เว็บแนะนำสินค้า = "ดูรายละเอียด", มีระบบสั่งซื้อ = "สั่งซื้อ"
  const detailButtonText = ctx.features.online_ordering ? 'สั่งซื้อ' : 'ดูรายละเอียด';

  const db = createAdminClient();
  const [featuredRaw, latest, { data: categories }, catalog] = await Promise.all([
    // การ์ดแบบ 'store' โชว์แถวเดียว 6 ใบตาม ref T2 / แบบ 'simple' โชว์ 4 ใบตาม ref T1
    fetchFeatured(ctx.tenantId, isStoreCard ? 6 : isSimpleCard ? 4 : 8),
    fetchLatest(ctx.tenantId),
    db
      .from('categories')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .order('sort_order', { ascending: true }),
    // section 'catalog' (ธีม one-page) — แคตตาล็อกเต็มบนหน้าแรก
    preset.sections.includes('catalog') ? fetchLatest(ctx.tenantId, 24) : Promise.resolve([]),
  ]);

  // ธีม Commerce: badge "ใหม่" 2 ชิ้นแรก (เรียงตาม created_at ล่าสุดอยู่แล้ว)
  // ดาวรีวิวมาจาก DB จริงใน fetchFeatured (product_reviews — migration 010)
  const featured = isStoreCard
    ? featuredRaw.map((p, i) => ({ ...p, badge: i < 2 ? 'ใหม่' : p.badge }))
    : featuredRaw;

  const sections: Record<ThemeSection, React.ReactNode> = {
    announcement: <AnnouncementBar key="announcement" text={ctx.store.announcement_text} />,
    hero:
      preset.variants.hero === 'commerce' || preset.variants.hero === 'split-panel' ? (
        <HeroBanner
          key="hero"
          variant={preset.variants.hero}
          imageUrl={
            content.hero?.imageUrl ??
            (ctx.store.banner_r2_key ? publicR2Url(ctx.store.banner_r2_key) : undefined)
          }
          eyebrow={content.hero?.eyebrow ?? (preset.variants.hero === 'commerce' ? 'NEW COLLECTION' : undefined)}
          headline={content.hero?.headline ?? ctx.store.name}
          subline={content.hero?.sub}
          ctaText={content.hero?.ctaText ?? 'ช้อปเลย'}
          ctaHref={content.hero?.ctaHref ?? '/products'}
        />
      ) : (
        <HeroBanner
          key="hero"
          variant={preset.variants.hero}
          imageUrl={ctx.store.banner_r2_key ? publicR2Url(ctx.store.banner_r2_key) : undefined}
          headline={ctx.store.banner_r2_key ? undefined : ctx.store.name}
          ctaText="ดูสินค้าทั้งหมด"
          ctaHref="/products"
        />
      ),
    usp: <UspStrip key="usp" items={content.usp ?? DEFAULT_USP} />,
    featured:
      featured.length > 0 ? (
        <section key="featured" className="mx-auto max-w-(--container-max) px-4 py-12">
          {isStoreCard ? (
            // หัว section แบบ ref T2 — ข้อความซ้ายเรียบๆ ไม่มี pill
            <h2 className="mb-5 font-heading text-lg font-semibold tracking-tight text-text">
              สินค้าแนะนำ
            </h2>
          ) : isSimpleCard ? (
            // หัว section แบบ ref T1 — กลางหน้า + เส้นใต้สั้น
            <div className="mb-8 text-center">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-text">
                สินค้าแนะนำ
              </h2>
              <span className="mt-2.5 inline-block h-0.5 w-14 bg-primary" />
            </div>
          ) : (
            <SectionHeading
              eyebrow="คัดสรรโดยร้าน"
              title="สินค้าแนะนำ"
              linkText="ดูทั้งหมด"
              linkHref="/products"
            />
          )}
          <ProductGrid
            products={featured}
            cardVariant={preset.variants.productCard}
            slug={ctx.slug}
            wishlistEnabled={ctx.features.wishlist}
            detailButtonText={detailButtonText}
          />
          {isSimpleCard && (
            <div className="mt-8 text-center">
              <Link
                href="/products"
                className="inline-block rounded-sm bg-primary px-8 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
              >
                ดูสินค้าทั้งหมด
              </Link>
            </div>
          )}
        </section>
      ) : null,
    categoryBanners:
      (content.categoryBanners ?? []).length > 0 ? (
        <div key="categoryBanners" className="py-2">
          <CategoryBannerRow banners={content.categoryBanners ?? []} />
        </div>
      ) : null,
    tools: (
      <div key="tools" className="py-10">
        <ToolsRow
          slug={ctx.slug}
          sampleOrderNumber={`${ctx.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'WS'}24051789`}
        />
      </div>
    ),
    featureBand: (
      <FeatureBand key="featureBand" title={content.featureBandTitle ?? DEFAULT_FEATURE_BAND_TITLE} />
    ),
    contactCta: content.contact ? (
      <div key="contactCta" className="py-6">
        <ContactCtaBand contact={content.contact} />
      </div>
    ) : null,
    featureList: (
      <div key="featureList" className="py-6">
        <FeatureListBand
          title={content.featureListTitle ?? DEFAULT_FEATURE_LIST_TITLE}
          items={content.featureList ?? DEFAULT_FEATURE_LIST}
          note={content.featureListNote}
          noteHighlight={content.featureListNoteHighlight}
        />
      </div>
    ),
    categories:
      (categories ?? []).length > 0 ? (
        <section key="categories" className="mx-auto max-w-(--container-max) px-4 py-6">
          <SectionHeading title="เลือกซื้อตามหมวดหมู่" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(categories ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary-soft hover:shadow-card"
              >
                <span className="truncate text-sm font-medium text-text group-hover:text-primary">
                  {c.name}
                </span>
                <ArrowRightIcon
                  size={15}
                  className="shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null,
    grid: (
      <section key="grid" className="mx-auto max-w-(--container-max) px-4 py-12">
        <SectionHeading
          eyebrow="อัปเดตล่าสุด"
          title="สินค้ามาใหม่"
          linkText="ดูทั้งหมด"
          linkHref="/products"
        />
        <ProductGrid
          products={latest}
          cardVariant={preset.variants.productCard}
          slug={ctx.slug}
          wishlistEnabled={ctx.features.wishlist}
        />
      </section>
    ),
    // ธีม one-page: แคตตาล็อกเต็มบนหน้าแรก (สูงสุด 24 ชิ้น — เกินนั้นลิงก์ไป /products)
    catalog:
      catalog.length > 0 ? (
        <section key="catalog" className="mx-auto max-w-(--container-max) px-4 py-12">
          <SectionHeading
            eyebrow="แคตตาล็อก"
            title="สินค้าของร้าน"
            linkText={catalog.length >= 24 ? 'ดูทั้งหมด' : undefined}
            linkHref={catalog.length >= 24 ? '/products' : undefined}
          />
          <ProductGrid
            products={catalog}
            cardVariant={preset.variants.productCard}
            slug={ctx.slug}
            wishlistEnabled={ctx.features.wishlist}
          />
        </section>
      ) : null,
    // ธีม one-page: การ์ดติดต่อร้าน — "แคตตาล็อก+ติดต่อ" จบในหน้าเดียว
    contact:
      ctx.store.phone || ctx.store.address ? (
        <section key="contact" className="mx-auto max-w-(--container-max) px-4 py-12">
          <SectionHeading title="ติดต่อร้าน" />
          <div className="grid gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2 md:p-8">
            <div className="space-y-4">
              {ctx.store.address && (
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <MapPinIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text">ที่อยู่ร้าน</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                      {ctx.store.address}
                    </p>
                  </div>
                </div>
              )}
              {ctx.store.phone && (
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <PhoneIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text">โทรศัพท์</p>
                    <a
                      href={`tel:${ctx.store.phone}`}
                      className="mt-0.5 inline-block text-sm text-text-muted transition-colors hover:text-primary"
                    >
                      {ctx.store.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <PackageIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">สั่งซื้อแล้วเช็คสถานะได้ตลอด</p>
                <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
                  ใช้เลขคำสั่งซื้อ + เบอร์โทรของคุณตรวจสอบสถานะและเลขพัสดุได้ที่
                </p>
                <Link
                  href="/track"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  หน้าติดตามคำสั่งซื้อ
                  <ArrowRightIcon size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null,
    footer: null, // Footer อยู่ใน layout
  };

  return <main>{preset.sections.map((name) => sections[name])}</main>;
}
