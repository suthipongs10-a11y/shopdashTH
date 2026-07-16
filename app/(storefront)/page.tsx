// หน้าแรกร้าน — ลำดับ section ตาม preset.sections (§4.4)
// basic-01: hero → featured → categories → grid → footer(อยู่ใน layout)

import Link from 'next/link';
import { Suspense } from 'react';
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar';
import { ArticleCards } from '@/components/storefront/ArticleCards';
import { CatalogSidebar } from '@/components/storefront/CatalogSidebar';
import { CategoryBannerRow } from '@/components/storefront/CategoryBannerRow';
import { FaqList } from '@/components/storefront/FaqList';
import { RouteCards } from '@/components/storefront/RouteCards';
import { ServiceCards } from '@/components/storefront/ServiceCards';
import { ServiceHero } from '@/components/storefront/ServiceHero';
import { TestimonialsBand } from '@/components/storefront/TestimonialsBand';
import { VehicleCards } from '@/components/storefront/VehicleCards';
import { CategoryCircleRow } from '@/components/storefront/CategoryCircleRow';
import { ContactCtaBand } from '@/components/storefront/ContactCtaBand';
import { FeatureBand } from '@/components/storefront/FeatureBand';
import { FeatureListBand } from '@/components/storefront/FeatureListBand';
import { FeaturedScroller } from '@/components/storefront/FeaturedScroller';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { HeroCarousel, type HeroSlide } from '@/components/storefront/HeroCarousel';
import { HighlightsBand } from '@/components/storefront/HighlightsBand';
import { LookbookSplit } from '@/components/storefront/LookbookSplit';
import { LuxePerksRow } from '@/components/storefront/LuxePerksRow';
import { MemberBenefitsBand } from '@/components/storefront/MemberBenefitsBand';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { SectionHeading } from '@/components/storefront/SectionHeading';
import { ServiceBand } from '@/components/storefront/ServiceBand';
import { ToolsRow } from '@/components/storefront/ToolsRow';
import { TrustBar } from '@/components/storefront/TrustBar';
import { UspStrip } from '@/components/storefront/UspStrip';
import {
  ArrowRightIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
} from '@/components/storefront/icons';
import { fetchFeatured, fetchFilterOptions, fetchLatest } from '@/lib/catalog';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_FEATURE_BAND_TITLE,
  DEFAULT_FEATURE_LIST,
  DEFAULT_FEATURE_LIST_TITLE,
  DEFAULT_USP,
  getThemeContent,
  resolveVariantLabels,
} from '@/lib/theme-content';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import type { ThemeSection } from '@/themes/types';

export default async function StorefrontHomePage() {
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);
  const content = getThemeContent(ctx.store.theme_overrides);
  const variantLabels = resolveVariantLabels(content);
  const isStoreCard = preset.variants.productCard === 'store';
  const isSimpleCard = preset.variants.productCard === 'simple';
  const isLuxeCard = preset.variants.productCard === 'luxe';
  // §3.1 (ref T1): ปุ่มการ์ดตาม flag — เว็บแนะนำสินค้า = "ดูรายละเอียด", มีระบบสั่งซื้อ = "สั่งซื้อ"
  const detailButtonText = ctx.features.online_ordering ? 'สั่งซื้อ' : 'ดูรายละเอียด';

  const db = createAdminClient();
  const [featuredRaw, latest, { data: categories }, catalog, homeCatalog, filterOptions] =
    await Promise.all([
      // การ์ดแบบ 'store' โชว์แถวเดียว 6 ใบตาม ref T2 / 'simple' 4 ใบตาม ref T1 / 'luxe' 4 ใบใหญ่ตาม ref T4
      fetchFeatured(ctx.tenantId, isStoreCard ? 6 : isSimpleCard || isLuxeCard ? 4 : 8),
      fetchLatest(ctx.tenantId),
      db
        .from('categories')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { ascending: true }),
      // section 'catalog' (ธีม one-page) — แคตตาล็อกเต็มบนหน้าแรก
      preset.sections.includes('catalog') ? fetchLatest(ctx.tenantId, 24) : Promise.resolve([]),
      // section 'homeCatalog' (ธีม marketplace — ref T3) — 2 แถว × 5 ใบ
      preset.sections.includes('homeCatalog') ? fetchLatest(ctx.tenantId, 10) : Promise.resolve([]),
      preset.sections.includes('homeCatalog')
        ? fetchFilterOptions(ctx.tenantId)
        : Promise.resolve({ sizes: [] as string[], colors: [] as string[] }),
    ]);

  // ธีม Commerce: badge "ใหม่" 2 ชิ้นแรก (เรียงตาม created_at ล่าสุดอยู่แล้ว)
  // ดาวรีวิวมาจาก DB จริงใน fetchFeatured (product_reviews — migration 010)
  const featured = isStoreCard
    ? featuredRaw.map((p, i) => ({ ...p, badge: i < 2 ? 'ใหม่' : p.badge }))
    : featuredRaw;

  // hero carousel (ref T3) — สไลด์จาก __content.heroSlides ที่มีรูปเท่านั้น
  const heroSlides: HeroSlide[] = (content.heroSlides ?? [])
    .filter((s): s is typeof s & { imageUrl: string } => Boolean(s.imageUrl))
    .map((s) => ({
      imageUrl: s.imageUrl,
      eyebrow: s.eyebrow,
      headline: s.headline,
      sub: s.sub,
      ctaText: s.ctaText,
      ctaHref: s.ctaHref,
    }));

  const sections: Record<ThemeSection, React.ReactNode> = {
    announcement: <AnnouncementBar key="announcement" text={ctx.store.announcement_text} />,
    hero:
      preset.variants.hero === 'carousel' && heroSlides.length > 0 ? (
        <HeroCarousel key="hero" slides={heroSlides} />
      ) : preset.variants.hero === 'luxe' ? (
        <HeroBanner
          key="hero"
          variant="luxe"
          imageUrl={
            content.hero?.imageUrl ??
            (ctx.store.banner_r2_key ? publicR2Url(ctx.store.banner_r2_key) : undefined)
          }
          eyebrow={content.hero?.eyebrow}
          headline={content.hero?.headline ?? ctx.store.name}
          subline={content.hero?.sub}
          ctaText={content.hero?.ctaText ?? 'ช้อปคอลเลกชัน'}
          ctaHref={content.hero?.ctaHref ?? '/products'}
          cta2Text={content.hero?.cta2Text}
          cta2Href={content.hero?.cta2Href}
        />
      ) : preset.variants.hero === 'commerce' || preset.variants.hero === 'split-panel' ? (
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
    usp: <UspStrip key="usp" items={content.usp ?? DEFAULT_USP} tone={isLuxeCard ? 'band' : 'plain'} />,
    featured:
      featured.length > 0 ? (
        <section key="featured" className="mx-auto max-w-(--container-max) px-4 py-12">
          {isLuxeCard ? (
            // หัว section แบบ ref T4 — serif กลางหน้า + eyebrow ตัวโปร่ง (ระยะ 96px §3.4)
            <div className="mb-10 mt-6 text-center">
              <p className="text-xs font-medium tracking-[0.35em] text-text-muted">NEW IN</p>
              <h2 className="mt-2 font-heading text-3xl text-text md:text-4xl">ใหม่ล่าสุด</h2>
            </div>
          ) : isStoreCard ? (
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
          {isLuxeCard && (
            <div className="mb-6 mt-10 text-center">
              <Link
                href="/products"
                className="inline-block border border-text px-10 py-3 text-sm font-medium tracking-wide text-text transition-colors hover:bg-primary hover:text-primary-fg"
              >
                ดูสินค้าทั้งหมด
              </Link>
            </div>
          )}
        </section>
      ) : null,
    /* --- ชุด T4 "LUXÉ" --- */
    lookbookSplit: (
      <div key="lookbookSplit" className="py-12">
        <LookbookSplit lookbook={content.lookbook} brandStory={content.brandStory} />
      </div>
    ),
    highlights:
      (content.highlights ?? []).length > 0 ? (
        <div key="highlights" className="py-6">
          <HighlightsBand items={content.highlights ?? []} />
        </div>
      ) : null,
    luxePerks: (
      <div key="luxePerks" className="py-12">
        <LuxePerksRow perks={content.perks ?? {}} />
      </div>
    ),
    trustBar: (
      <div key="trustBar" className="pt-12">
        <TrustBar trustText={content.trustText} />
      </div>
    ),
    /* --- ชุดเทมเพลตธุรกิจบริการรถ (S1/S2/S3) --- */
    serviceHero: (
      <ServiceHero
        key="serviceHero"
        hero={content.hero}
        storeName={ctx.store.name}
        inquiry={content.inquiry}
        lineUrl={content.contact?.lineUrl || content.socials?.line || undefined}
        phone={ctx.store.phone}
        badges={content.heroBadges}
      />
    ),
    serviceCards:
      (content.highlights ?? []).length > 0 ? (
        <ServiceCards
          key="serviceCards"
          title={content.servicesTitle ?? 'บริการของเรา'}
          items={content.highlights ?? []}
        />
      ) : null,
    vehicles:
      (content.vehicles ?? []).length > 0 ? (
        <VehicleCards
          key="vehicles"
          title={content.vehiclesTitle ?? 'รถของเรา'}
          sub={content.vehiclesSub}
          items={content.vehicles ?? []}
        />
      ) : null,
    routes:
      (content.routes ?? []).length > 0 ? (
        <RouteCards key="routes" title={content.routesTitle ?? 'เส้นทางยอดนิยม'} items={content.routes ?? []} />
      ) : null,
    testimonials:
      (content.testimonials ?? []).length > 0 ? (
        <TestimonialsBand
          key="testimonials"
          title={content.testimonialsTitle ?? 'ลูกค้าของเรา พูดถึงเรา'}
          items={content.testimonials ?? []}
        />
      ) : null,
    faq:
      (content.faq ?? []).length > 0 ? (
        <FaqList key="faq" title={content.faqTitle ?? 'คำถามที่พบบ่อย'} items={content.faq ?? []} />
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
      <FeatureBand
        key="featureBand"
        title={content.featureBandTitle ?? DEFAULT_FEATURE_BAND_TITLE}
        variantLabels={variantLabels}
      />
    ),
    contactCta: content.contact ? (
      <div key="contactCta" className="py-6">
        <ContactCtaBand contact={content.contact} variantLabels={variantLabels} />
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
    /* --- ชุด T3 "HUB" (marketplace) — ระยะ section 64px (py-8 ต่อฝั่ง §2) --- */
    categoryCircles:
      (content.categoryCircles ?? []).length > 0 ? (
        <div key="categoryCircles" className="pt-7">
          <CategoryCircleRow circles={content.categoryCircles ?? []} />
        </div>
      ) : null,
    homeCatalog:
      homeCatalog.length > 0 ? (
        <section key="homeCatalog" className="mx-auto max-w-(--container-max) px-4 py-8">
          <div className="grid items-start gap-5 lg:grid-cols-[240px_1fr]">
            {/* ฟิลเตอร์ทำงานจริง — กดแล้วพาไป /products พร้อม query param */}
            <Suspense fallback={null}>
              <CatalogSidebar
                categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
                sizes={filterOptions.sizes}
                colors={filterOptions.colors}
                mobileTrigger={false}
              />
            </Suspense>
            <div>
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight text-text">
                  สินค้ามาใหม่
                </h2>
                <Link
                  href="/products"
                  className="text-sm font-medium text-text-muted transition-colors hover:text-text"
                >
                  ดูทั้งหมด →
                </Link>
              </div>
              <ProductGrid
                products={homeCatalog}
                cardVariant={preset.variants.productCard}
                slug={ctx.slug}
                wishlistEnabled={ctx.features.wishlist}
              />
            </div>
          </div>
        </section>
      ) : null,
    memberBenefits:
      (content.memberBenefits ?? []).length > 0 ? (
        <div key="memberBenefits" className="py-4">
          <MemberBenefitsBand benefits={content.memberBenefits ?? []} />
        </div>
      ) : null,
    featuredScroller:
      featured.length > 0 ? (
        <section key="featuredScroller" className="mx-auto max-w-(--container-max) px-4 py-8">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text">
              สินค้าแนะนำ
            </h2>
            <Link
              href="/products"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <FeaturedScroller products={featured} />
        </section>
      ) : null,
    articles:
      (content.articles ?? []).length > 0 ? (
        <section key="articles" className="mx-auto max-w-(--container-max) px-4 py-8">
          <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-text">
            {content.articlesTitle ?? 'บทความแฟชั่น / Lookbook'}
          </h2>
          <ArticleCards articles={content.articles ?? []} />
        </section>
      ) : null,
    serviceBand: (
      <div key="serviceBand" className="pt-4">
        <ServiceBand
          title={content.serviceBandTitle ?? 'ระบบและบริการของร้าน'}
          variantLabels={variantLabels}
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
