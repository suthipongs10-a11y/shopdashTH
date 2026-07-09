// Layout ของ storefront ทั้งหมด (Phase 1: เสิร์ฟที่ path ตรง `/`)
// ครอบด้วย ThemeScope — สี/ฟอนต์/รูปทรงทั้งหมดมาจาก token ของธีมร้าน (§4)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/storefront/Footer';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const { data: categories } = await db
    .from('categories')
    .select('id, name')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: true });

  const categoryItems = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    href: `/products?category=${c.id}`,
  }));

  return (
    <ThemeScope themeCode={ctx.store.theme_code} overrides={ctx.store.theme_overrides}>
      <StoreHeader
        slug={ctx.slug}
        storeName={ctx.store.name}
        logoUrl={ctx.store.logo_r2_key ? publicR2Url(ctx.store.logo_r2_key) : null}
        categories={categoryItems}
        navVariant={preset.variants.categoryNav}
        freeShippingMin={ctx.store.free_shipping_min}
      />
      <div className="flex-1">{children}</div>
      <Footer storeName={ctx.store.name} address={ctx.store.address} phone={ctx.store.phone} />
    </ThemeScope>
  );
}
