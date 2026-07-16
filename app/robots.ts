// robots.txt ต่อ host (§5.5) — ต้องอยู่ root ของ app/ เท่านั้น: Next.js ไม่รองรับ
// robots.ts ใน route group (ไฟล์เดิมที่ app/(storefront)/robots.ts ตอบ 404 ตลอด —
// ต่างจาก sitemap.ts ที่อยู่ใน group ได้) จึงใช้ไฟล์เดียวแล้วแยกกติกาตาม host:
// - host ร้าน (มี x-tenant-slug จาก middleware): กัน index หน้า admin/ชำระเงิน + ชี้ sitemap ร้าน
// - host แพลตฟอร์ม (landing): เปิด index ยกเว้น /api
// - host super-admin: ปิด index ทั้งเว็บ
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { requestOrigin } from '@/lib/request-origin';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const hostKind = h.get('x-robots-host-kind'); // middleware ตั้งให้เฉพาะ platform/super-admin

  if (hostKind === 'super-admin') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  if (hostKind === 'platform') {
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/api'] },
    };
  }

  // host ร้าน (default) — พฤติกรรมเดิมของไฟล์ที่ย้ายมา
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
