// Layout ของ storefront ทั้งหมด (Phase 1: เสิร์ฟที่ path ตรง `/`)
// ครอบด้วย ThemeScope — สี/ฟอนต์/รูปทรงทั้งหมดมาจาก token ของธีมร้าน (§4)

import { Footer } from '@/components/storefront/Footer';
import { publicR2Url } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { ThemeScope } from '@/themes/theme-scope';
import { StoreHeader } from './store-header';

// ข้อมูลร้าน/สินค้าเปลี่ยนได้ตลอด — ห้าม prerender ตอน build
// (Phase 2 จะ dynamic อัตโนมัติเมื่อ getTenantContext อ่าน header x-tenant-slug)
export const dynamic = 'force-dynamic';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
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
