// Hostname routing (§1.4) — หัวใจ multi-tenancy ฝั่ง frontend
// Phase 2: resolve slug จาก subdomain แล้วแนบ header x-tenant-slug
// Phase 3: admin.{root} → /super-admin, root domain (+www) → /platform (landing/signup)
// Phase 4 จะเพิ่ม custom domain lookup

import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_SLUGS = new Set(['admin', 'www', 'api', 'app', 'mail']);

// path ภายในที่ต้องเข้าผ่าน host ที่ถูกต้องเท่านั้น — ห้ามเปิดตรงจาก host ร้านค้า
const INTERNAL_PREFIXES = ['/super-admin', '/platform'];

type HostTarget =
  | { kind: 'super-admin' }
  | { kind: 'platform' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'unknown' };

function resolveHost(host: string): HostTarget {
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdash.co';

  // production: admin.shopdash.co / dev: admin.localhost
  if (host === `admin.${rootDomain}` || host === 'admin.localhost') {
    return { kind: 'super-admin' };
  }
  // production: shopdash.co + www / dev: www.localhost (localhost เปล่า = demo เพื่อ DX)
  if (host === rootDomain || host === `www.${rootDomain}` || host === 'www.localhost') {
    return { kind: 'platform' };
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const slug = host.slice(0, -(rootDomain.length + 1));
    return RESERVED_SLUGS.has(slug) ? { kind: 'unknown' } : { kind: 'tenant', slug };
  }
  // dev: demo.localhost, shop2.localhost
  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, -'.localhost'.length);
    return RESERVED_SLUGS.has(slug) ? { kind: 'unknown' } : { kind: 'tenant', slug };
  }
  // dev convenience: localhost เปล่าๆ = ร้าน demo
  if (host === 'localhost' || host === '127.0.0.1') {
    return process.env.NODE_ENV === 'development'
      ? { kind: 'tenant', slug: 'demo' }
      : { kind: 'unknown' };
  }
  // custom domain — Phase 4 (งาน 4.8) จะ lookup ตาราง custom_domains
  return { kind: 'unknown' };
}

export function middleware(req: NextRequest) {
  // server action redirect() ทำ internal fetch เข้า loopback (Host กลายเป็น localhost:3000)
  // host จริงของผู้ใช้อยู่ใน x-forwarded-host — ต้องอ่านตัวนั้นก่อน (proxy/Vercel ก็ตั้งให้เช่นกัน)
  const rawHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const host = rawHost.split(':')[0].toLowerCase();
  const path = req.nextUrl.pathname;

  // cron ถูกเรียกจากโดเมน deployment (เช่น *.vercel.app) ไม่ใช่ host ร้าน —
  // ปล่อยผ่านทุก host, route ตรวจ CRON_SECRET เอง
  if (path.startsWith('/api/cron/')) return NextResponse.next();

  const target = resolveHost(host);

  // /super-admin, /platform เข้าตรงจาก host อื่นไม่ได้ (กัน bypass hostname routing)
  const hitsInternal = INTERNAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (target.kind === 'super-admin') {
    if (path.startsWith('/platform')) {
      return NextResponse.rewrite(new URL('/domain-not-configured', req.url));
    }
    // /auth/confirm (PKCE) และ /api ใช้ path เดิม
    if (path.startsWith('/auth/') || path.startsWith('/api/')) return NextResponse.next();
    return NextResponse.rewrite(new URL(`/super-admin${path === '/' ? '' : path}`, req.url));
  }

  if (target.kind === 'platform') {
    if (path.startsWith('/super-admin')) {
      return NextResponse.rewrite(new URL('/domain-not-configured', req.url));
    }
    if (path.startsWith('/api/')) return NextResponse.next();
    return NextResponse.rewrite(new URL(`/platform${path === '/' ? '' : path}`, req.url));
  }

  if (target.kind === 'unknown' || hitsInternal) {
    return NextResponse.rewrite(new URL('/domain-not-configured', req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', target.slug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // ครอบทุก path รวม /api (route handlers ใช้ getTenantContext ด้วย)
  // ยกเว้น static assets ของ Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
