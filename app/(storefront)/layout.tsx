// Layout ของ storefront ทั้งหมด (Phase 1: เสิร์ฟที่ path ตรง `/`)
// ครอบด้วย ThemeScope — สี/ฟอนต์/รูปทรงทั้งหมดมาจาก token ของธีมร้าน (§4)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/storefront/Footer';
import { MemberBar } from '@/components/storefront/MemberBar';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getThemeContent, type FooterLinkGroup } from '@/lib/theme-content';
import { formatBaht } from '@/lib/format';
import {
  getTenantContext,
  TenantLockedError,
  TenantNotFoundError,
  type TenantContext,
} from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { ThemeScope } from '@/themes/theme-scope';
import { StoreHeader } from './store-header';

export const dynamic = 'force-dynamic';

// SEO ต่อร้าน (§5.5) — title/description/OG จากชื่อร้าน + แบนเนอร์/โลโก้
export async function generateMetadata(): Promise<Metadata> {
  try {
    const ctx = await getTenantContext();
    const name = ctx.store.name;
    const ogKey = ctx.store.banner_r2_key ?? ctx.store.logo_r2_key;
    return {
      title: { default: name, template: `%s | ${name}` },
      description: `ร้าน ${name} — ช้อปออนไลน์ ชำระเงินผ่าน PromptPay`,
      openGraph: {
        title: name,
        siteName: name,
        type: 'website',
        images: ogKey ? [publicR2Url(ogKey)] : undefined,
      },
    };
  } catch {
    return { title: 'ShopDash' };
  }
}

// §7.4: ร้าน locked — ทุกหน้า storefront แทนด้วยหน้าเดียว
// "ปิดปรับปรุงชั่วคราว" ห้ามบอกลูกค้าว่าค้างจ่าย (รักษาหน้าให้ร้าน)
function LockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">ร้านนี้ปิดปรับปรุงชั่วคราว</h1>
        <p className="mt-3 text-sm text-gray-500">ขออภัยในความไม่สะดวก กรุณากลับมาใหม่ภายหลัง</p>
      </div>
    </main>
  );
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  let ctx: TenantContext;
  try {
    ctx = await getTenantContext();
  } catch (err) {
    if (err instanceof TenantLockedError) return <LockedPage />;
    if (err instanceof TenantNotFoundError) notFound();
    throw err;
  }
  const preset = getPreset(ctx.store.theme_code);

  const db = createAdminClient();
  const [{ data: categories }, { data: navPages }] = await Promise.all([
    db
      .from('categories')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .order('sort_order', { ascending: true }),
    // หน้าเพจเผยแพร่ (Phase 6) — โชว์ต่อแม้แพลนถูกดาวน์เกรด (§7.2 ของเดิมไม่หาย
    // gate เฉพาะการสร้าง/แก้ใน admin) — ก่อน migration 008 ตารางไม่มี → data null = []
    db
      .from('pages')
      .select('slug, title')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'published')
      .eq('show_in_nav', true)
      .order('sort_order', { ascending: true }),
  ]);

  // ธีมโหมดปุ่มแชท (ref T1): เมนูเป็นลิงก์หน้า (รวมสินค้า/เพจ) แทนรายชื่อหมวด
  const categoryItems = preset.layout?.headerContactButtons
    ? [
        { id: 'home', name: 'หน้าแรก', href: '/' },
        { id: 'all', name: 'รวมสินค้า', href: '/products' },
        ...(navPages ?? []).map((p) => ({ id: p.slug, name: p.title, href: `/p/${p.slug}` })),
      ]
    : (categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        href: `/products?category=${c.id}`,
      }));

  // เนื้อหา section ชุด Commerce (ธีมที่ตั้ง layout.utilityBar/footerVariant)
  const content = getThemeContent(ctx.store.theme_overrides);
  const utilityItems =
    content.utility ??
    [
      ctx.store.free_shipping_min != null
        ? { icon: 'truck' as const, text: `ส่งฟรีเมื่อสั่งซื้อครบ ${formatBaht(ctx.store.free_shipping_min)}` }
        : { icon: 'truck' as const, text: 'จัดส่งทั่วประเทศ' },
      { icon: 'clock' as const, text: 'เปลี่ยน/คืนสินค้าได้ภายใน 14 วัน' },
    ];
  const defaultLinkGroups: FooterLinkGroup[] = [
    {
      title: 'ช้อปปิ้ง',
      links: [
        { label: 'ใหม่ล่าสุด', href: '/products' },
        { label: 'สินค้าทั้งหมด', href: '/products' },
        { label: 'โปรโมชั่น', href: '/products' },
      ],
    },
    {
      title: 'บริการลูกค้า',
      links: [
        { label: 'วิธีสั่งซื้อ', href: '/p/help' },
        { label: 'การจัดส่ง', href: '/p/help' },
        { label: 'ติดต่อเรา', href: '/p/contact' },
      ],
    },
    {
      title: 'บัญชีของฉัน',
      links: [
        { label: 'ติดตามคำสั่งซื้อ', href: '/track' },
        { label: 'ประวัติคำสั่งซื้อ', href: '/track' },
        { label: 'รายการโปรด', href: '/products' },
      ],
    },
  ];

  const orderingEnabled = ctx.features.online_ordering;

  return (
    <ThemeScope themeCode={ctx.store.theme_code} overrides={ctx.store.theme_overrides}>
      {/* โหมดปุ่มแชท (ref T1): แถบประกาศดำอยู่บนสุดเหนือ header */}
      {preset.layout?.headerContactButtons && ctx.store.announcement_text && (
        <div className="bg-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-primary-fg">
          {ctx.store.announcement_text}
        </div>
      )}
      <StoreHeader
        slug={ctx.slug}
        storeName={ctx.store.name}
        tagline={content.tagline}
        logoUrl={ctx.store.logo_r2_key ? publicR2Url(ctx.store.logo_r2_key) : null}
        categories={categoryItems}
        navVariant={preset.variants.categoryNav}
        freeShippingMin={ctx.store.free_shipping_min}
        layout={preset.layout}
        utilityItems={utilityItems}
        wishlistEnabled={ctx.features.wishlist}
        orderingEnabled={orderingEnabled}
        contact={content.contact}
      />
      {/* แถบสมาชิกใต้ header (ref T3 — เนื้อหาโชว์ของธีม ระบบสมาชิกจริงเป็น Future) */}
      {preset.layout?.memberBar && content.memberBar && <MemberBar content={content.memberBar} />}
      {/* โหมดเว็บแนะนำสินค้า (ref T1): แถบแจ้งลูกค้าว่าเว็บนี้สั่งซื้อออนไลน์ไม่ได้ */}
      {!orderingEnabled && (
        <div className="border-b border-border-soft bg-surface px-4 py-2 text-center text-xs text-text-muted">
          {content.disclaimer?.text ?? 'เว็บไซต์นี้เป็นเพียงเว็บไซต์แนะนำสินค้า'}{' '}
          <span className="font-medium text-danger">
            {content.disclaimer?.highlight ?? 'ไม่สามารถสั่งซื้อและชำระเงินได้'}
          </span>
        </div>
      )}
      <div className="flex-1">{children}</div>
      <Footer
        storeName={ctx.store.name}
        address={ctx.store.address}
        phone={ctx.store.phone}
        pages={navPages ?? []}
        variant={preset.layout?.footerVariant ?? 'simple'}
        linkGroups={content.footerLinkGroups ?? defaultLinkGroups}
        newsletterText={content.newsletterText ?? 'รับสิทธิพิเศษและโปรโมชั่นก่อนใครทางอีเมล'}
        contact={content.contact}
        orderingEnabled={orderingEnabled}
        showPayments={preset.layout?.footerPayments}
        socials={content.socials}
        whyUsTitle={content.whyUsTitle}
      />
    </ThemeScope>
  );
}
