// robots.txt ต่อ host (§5.5) — กัน index หน้า admin/ชำระเงิน, ชี้ sitemap ของร้าน
import type { MetadataRoute } from 'next';
import { requestOrigin } from '@/lib/request-origin';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/checkout', '/orders', '/track'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
