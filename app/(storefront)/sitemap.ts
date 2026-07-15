// Sitemap ต่อ tenant (§5.5) — สินค้าเผยแพร่ของร้านที่ resolve จาก host
// middleware แนบ x-tenant-slug ให้ /sitemap.xml (matcher ไม่ได้ยกเว้น)

import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { requestOrigin } from '@/lib/request-origin';
import { getTenantContext } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let ctx: Awaited<ReturnType<typeof getTenantContext>>;
  try {
    ctx = await getTenantContext();
  } catch {
    return []; // host ไม่ใช่ร้าน / ร้าน locked-archived → sitemap ว่าง
  }

  const base = await requestOrigin();

  const db = createAdminClient();
  const { data } = await db
    .from('products')
    .select('id, created_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1000);

  const products: MetadataRoute.Sitemap = (data ?? []).map((p) => ({
    url: `${base}/products/${p.id}`,
    lastModified: p.created_at,
  }));

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.8 },
    ...products,
  ];
}
