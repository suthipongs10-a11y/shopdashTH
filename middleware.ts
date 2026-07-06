// Hostname routing (§1.4) — หัวใจ multi-tenancy ฝั่ง frontend
// Phase 2: resolve slug จาก subdomain แล้วแนบ header x-tenant-slug
//   {slug}.shopdash.co / {slug}.localhost:3000 → storefront + store admin (path เดิม)
// Phase 3 จะเพิ่ม admin.shopdash.co → super-admin / Phase 4 เพิ่ม custom domain lookup

import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_SLUGS = new Set(['admin', 'www', 'api', 'app', 'mail']);

function resolveSlug(host: string): string | null {
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdash.co';

  if (host.endsWith(`.${rootDomain}`)) {
    return host.slice(0, -(rootDomain.length + 1));
  }
  // dev: demo.localhost, shop2.localhost
  if (host.endsWith('.localhost')) {
    return host.slice(0, -'.localhost'.length);
  }
  // dev convenience: localhost เปล่าๆ = ร้าน demo (production root domain = หน้า platform, Phase 3)
  if (host === 'localhost' || host === '127.0.0.1') {
    return process.env.NODE_ENV === 'development' ? 'demo' : null;
  }
  // custom domain — Phase 4 (งาน 4.8) จะ lookup ตาราง custom_domains
  return null;
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const slug = resolveSlug(host);

  // admin.shopdash.co → super-admin (Phase 3) / slug สงวนอื่นๆ ไม่ใช่ร้าน
  if (!slug || RESERVED_SLUGS.has(slug)) {
    return NextResponse.rewrite(new URL('/domain-not-configured', req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', slug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // ครอบทุก path รวม /api (route handlers ใช้ getTenantContext ด้วย)
  // ยกเว้น static assets ของ Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
