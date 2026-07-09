// robots.txt ต่อ host (§5.5) — กัน index หน้า admin/ชำระเงิน, ชี้ sitemap ของร้าน
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/checkout', '/orders', '/track'],
    },
    sitemap: host ? `${proto}://${host}/sitemap.xml` : undefined,
  };
}
