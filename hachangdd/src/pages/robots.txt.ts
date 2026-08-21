import type { APIRoute } from 'astro';
import { site } from '@/data/site';

/**
 * robots.txt สร้างตอน build — ชี้ไป sitemap index ที่ @astrojs/sitemap สร้างให้
 * ไม่บล็อกอะไรเป็นพิเศษ เพราะทุกหน้าตั้งใจให้ Google เก็บ ยกเว้นหน้าที่ใส่ noindex ไว้เอง
 */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
