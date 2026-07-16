// หน้า preview ธีมด้วยข้อมูล mock (ไม่แตะ DB) — เครื่องมือ dev สำหรับตรวจดีไซน์เทมเพลต
// ในสภาพแวดล้อมที่ไม่มี Supabase (เช่น CI) — เปิดเฉพาะเมื่อตั้ง THEME_PREVIEW=1 เท่านั้น
// ประกอบ section แบบเดียวกับหน้าแรก storefront (เฉพาะ section ของเทมเพลตบริการรถ)

import { notFound } from 'next/navigation';
import { ContactCtaBand } from '@/components/storefront/ContactCtaBand';
import { FaqList } from '@/components/storefront/FaqList';
import { FeatureListBand } from '@/components/storefront/FeatureListBand';
import { RouteCards } from '@/components/storefront/RouteCards';
import { ServiceCards } from '@/components/storefront/ServiceCards';
import { ServiceHero } from '@/components/storefront/ServiceHero';
import { TestimonialsBand } from '@/components/storefront/TestimonialsBand';
import { UspStrip } from '@/components/storefront/UspStrip';
import { VehicleCards } from '@/components/storefront/VehicleCards';
import { PhoneIcon } from '@/components/storefront/icons';
import { DEFAULT_VARIANT_LABELS, type ThemeContent } from '@/lib/theme-content';
import { getPreset, THEME_PRESETS } from '@/themes/presets';
import { ThemeScope } from '@/themes/theme-scope';
import { PREVIEW_CONTENT, PREVIEW_STORE_NAMES } from './preview-content';

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

  const sections: Partial<Record<string, React.ReactNode>> = {
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
      />
    ),
    usp: <UspStrip key="usp" items={content.usp ?? []} tone="plain" />,
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
    featured: (
      <div key="featured" className="mx-auto max-w-(--container-max) px-4 py-8 text-center text-sm text-text-muted">
        [preview: section สินค้า/บริการแนะนำ — ใช้ข้อมูลจริงจากแคตตาล็อกของร้าน]
      </div>
    ),
  };

  return (
    <ThemeScope themeCode={code}>
      {/* header จำลองแบบย่อ (ของจริงมาจาก layout storefront) */}
      <header className="border-b border-soft bg-bg">
        <div className="mx-auto flex max-w-(--container-max) items-center justify-between px-4 py-4">
          <p className="font-heading text-lg font-bold text-text">{storeName}</p>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary">
            <PhoneIcon size={14} />
            02 123 4567
          </span>
        </div>
      </header>
      {preset.sections.filter((s) => s !== 'footer').map((s) => sections[s] ?? null)}
      <footer className="mt-auto bg-secondary py-8 text-center text-xs text-text-muted">
        © 2569 {storeName} — [preview: footer จริงตาม variant ของธีม]
      </footer>
    </ThemeScope>
  );
}
