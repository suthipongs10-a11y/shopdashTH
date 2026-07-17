// หน้า preview ธีมด้วยข้อมูล mock (ไม่แตะ DB) — เครื่องมือ dev สำหรับตรวจดีไซน์เทมเพลต
// ในสภาพแวดล้อมที่ไม่มี Supabase (เช่น CI) — เปิดเฉพาะเมื่อตั้ง THEME_PREVIEW=1 เท่านั้น
// ประกอบ section แบบเดียวกับหน้าแรก storefront (เฉพาะ section ของเทมเพลตบริการรถ)

import { notFound } from 'next/navigation';
import { StoreHeader } from '@/app/(storefront)/store-header';
import { CategoryCardRow } from '@/components/storefront/CategoryCardRow';
import { ContactCtaBand } from '@/components/storefront/ContactCtaBand';
import { FaqList } from '@/components/storefront/FaqList';
import { FeatureListBand } from '@/components/storefront/FeatureListBand';
import { Footer } from '@/components/storefront/Footer';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { RouteCards } from '@/components/storefront/RouteCards';
import { ServiceCards } from '@/components/storefront/ServiceCards';
import { ServiceHero } from '@/components/storefront/ServiceHero';
import { TestimonialsBand } from '@/components/storefront/TestimonialsBand';
import { UspStrip } from '@/components/storefront/UspStrip';
import { VehicleCards } from '@/components/storefront/VehicleCards';
import { PhoneIcon, StarIcon } from '@/components/storefront/icons';
import { DEFAULT_VARIANT_LABELS, type ThemeContent } from '@/lib/theme-content';
import { getPreset, THEME_PRESETS } from '@/themes/presets';
import { ThemeScope } from '@/themes/theme-scope';
import {
  PREVIEW_CATEGORIES,
  PREVIEW_CONTENT,
  PREVIEW_PRODUCTS,
  PREVIEW_STORE_NAMES,
} from './preview-content';

export const dynamic = 'force-dynamic';

export default async function ThemePreviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (process.env.THEME_PREVIEW !== '1') notFound();
  const { code } = await params;
  if (!THEME_PRESETS[code]) notFound();

  const preset = getPreset(code);
  const content: ThemeContent = PREVIEW_CONTENT[code] ?? PREVIEW_CONTENT['s3-taxi'];
  const storeName = PREVIEW_STORE_NAMES[code] ?? 'ร้านตัวอย่าง';
  const products = PREVIEW_PRODUCTS[code] ?? [];
  const isToyCard = preset.variants.productCard === 'toy';

  const sections: Partial<Record<string, React.ReactNode>> = {
    hero: (
      <HeroBanner
        key="hero"
        variant={preset.variants.hero}
        imageUrl={content.hero?.imageUrl}
        eyebrow={content.hero?.eyebrow}
        headline={content.hero?.headline ?? storeName}
        headline2={content.hero?.headline2}
        subline={content.hero?.sub}
        ctaText={content.hero?.ctaText ?? 'ช้อปเลย'}
        ctaHref={content.hero?.ctaHref ?? '#'}
      />
    ),
    categoryCards:
      (content.categoryBanners ?? []).length > 0 ? (
        <CategoryCardRow
          key="categoryCards"
          title="หมวดหมู่สินค้า"
          banners={content.categoryBanners ?? []}
        />
      ) : null,
    serviceHero: (
      <ServiceHero
        key="serviceHero"
        hero={content.hero}
        storeName={storeName}
        inquiry={content.inquiry}
        lineUrl="https://line.me/R/ti/p/@example"
        phone="021234567"
        badges={content.heroBadges}
      />
    ),
    serviceCards: (
      <ServiceCards
        key="serviceCards"
        title={content.servicesTitle ?? 'บริการของเรา'}
        items={content.highlights ?? []}
      />
    ),
    vehicles: (
      <VehicleCards
        key="vehicles"
        title={content.vehiclesTitle ?? 'รถของเรา'}
        sub={content.vehiclesSub}
        items={content.vehicles ?? []}
      />
    ),
    routes:
      (content.routes ?? []).length > 0 ? (
        <RouteCards key="routes" title={content.routesTitle ?? 'เส้นทางยอดนิยม'} items={content.routes ?? []} />
      ) : null,
    testimonials: (
      <TestimonialsBand
        key="testimonials"
        title={content.testimonialsTitle ?? 'ลูกค้าของเรา พูดถึงเรา'}
        items={content.testimonials ?? []}
        centered={isToyCard}
      />
    ),
    usp: (
      <UspStrip key="usp" items={content.usp ?? []} tone={isToyCard ? 'band' : 'plain'} />
    ),
    faq:
      (content.faq ?? []).length > 0 ? (
        <FaqList key="faq" title={content.faqTitle ?? 'คำถามที่พบบ่อย'} items={content.faq ?? []} />
      ) : null,
    featureList: content.featureList ? (
      <FeatureListBand
        key="featureList"
        title={content.featureListTitle ?? 'ขั้นตอนใช้บริการ'}
        items={content.featureList}
        note={content.featureListNote}
        noteHighlight={content.featureListNoteHighlight}
      />
    ) : null,
    contactCta: content.contact ? (
      <ContactCtaBand key="contactCta" contact={content.contact} variantLabels={DEFAULT_VARIANT_LABELS} />
    ) : null,
    featured:
      products.length > 0 ? (
        <section key="featured" className="mx-auto max-w-(--container-max) px-4 py-12">
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <StarIcon size={17} className="text-star" aria-hidden />
            <h2 className="font-heading text-2xl font-semibold text-text">สินค้าแนะนำ</h2>
            <StarIcon size={17} className="text-star" aria-hidden />
          </div>
          <ProductGrid
            products={products}
            cardVariant={preset.variants.productCard}
            slug="preview"
            wishlistEnabled
          />
          <div className="mt-9 text-center">
            <span className="inline-block rounded-full bg-surface px-8 py-3 text-sm font-semibold text-text">
              ดูสินค้าทั้งหมด
            </span>
          </div>
        </section>
      ) : (
        <div key="featured" className="mx-auto max-w-(--container-max) px-4 py-8 text-center text-sm text-text-muted">
          [preview: section สินค้า/บริการแนะนำ — ใช้ข้อมูลจริงจากแคตตาล็อกของร้าน]
        </div>
      ),
  };

  const previewCategories = (PREVIEW_CATEGORIES[code] ?? []).map((name, i) => ({
    id: `preview-cat-${i}`,
    name,
    href: '#',
  }));

  return (
    <ThemeScope themeCode={code}>
      {preset.layout?.utilityBar ? (
        // ธีมโหมด Commerce — ใช้ header จริง (utility bar + search + ตะกร้า)
        <StoreHeader
          slug="preview"
          storeName={storeName}
          tagline={content.tagline}
          logoUrl={null}
          categories={previewCategories}
          navVariant={preset.variants.categoryNav}
          freeShippingMin={699}
          layout={preset.layout}
          utilityItems={content.utility}
          wishlistEnabled
        />
      ) : (
        // header จำลองแบบย่อ (ของจริงมาจาก layout storefront)
        <header className="border-b border-soft bg-bg">
          <div className="mx-auto flex max-w-(--container-max) items-center justify-between px-4 py-4">
            <p className="font-heading text-lg font-bold text-text">{storeName}</p>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary">
              <PhoneIcon size={14} />
              02 123 4567
            </span>
          </div>
        </header>
      )}
      {preset.sections.filter((s) => s !== 'footer').map((s) => sections[s] ?? null)}
      {preset.layout?.footerVariant ? (
        <Footer
          storeName={storeName}
          address="123/45 ถนนตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10110"
          phone="021234567"
          variant={preset.layout.footerVariant}
          linkGroups={[
            {
              title: 'เมนู',
              links: [
                { label: 'หน้าแรก', href: '#' },
                { label: 'หมวดหมู่สินค้า', href: '#' },
                { label: 'สินค้าใหม่', href: '#' },
              ],
            },
            {
              title: 'ช่วยเหลือ',
              links: [
                { label: 'วิธีสั่งซื้อสินค้า', href: '#' },
                { label: 'การชำระเงิน', href: '#' },
                { label: 'ติดตามคำสั่งซื้อ', href: '#' },
              ],
            },
          ]}
          socials={content.socials}
        />
      ) : (
        <footer className="mt-auto bg-secondary py-8 text-center text-xs text-text-muted">
          © 2569 {storeName} — [preview: footer จริงตาม variant ของธีม]
        </footer>
      )}
    </ThemeScope>
  );
}
