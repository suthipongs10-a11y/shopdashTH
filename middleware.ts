// Hostname routing (§1.4) — หัวใจ multi-tenancy ฝั่ง frontend
// Phase 2: resolve slug จาก subdomain แล้วแนบ header x-tenant-slug
// Phase 3: admin.{root} → /super-admin, root domain (+www) → /platform (landing/signup)
// ROOT_DOMAIN = shopdashth.com (ตั้งใน env — ค่า default ในไฟล์นี้เป็นแค่ fallback)
// Phase 4: custom domain → lookup ตาราง custom_domains (status=active) → slug

import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_SLUGS = new Set(['admin', 'www', 'api', 'app', 'mail']);

// ---------- custom domain lookup (edge-safe: fetch ตรงเข้า PostgREST + cache TTL 60s) ----------
const DOMAIN_CACHE_TTL_MS = 60_000;
const domainCache = new Map<string, { slug: string | null; expires: number }>();

async function resolveCustomDomain(host: string): Promise<string | null> {
  const cached = domainCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.slug;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  let slug: string | null = null;
  try {
    const res = await fetch(
      `${url}/rest/v1/custom_domains?domain=eq.${encodeURIComponent(host)}&status=eq.active&select=tenants(slug)&limit=1`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } },
    );
    if (res.ok) {
      const rows = (await res.json()) as { tenants: { slug: string } | null }[];
      slug = rows[0]?.tenants?.slug ?? null;
    }
  } catch {
    // DB ล่มชั่วคราว — อย่า cache ผลลบ ให้ลองใหม่ request หน้า
    return null;
  }

  if (domainCache.size > 500) domainCache.clear();
  domainCache.set(host, { slug, expires: Date.now() + DOMAIN_CACHE_TTL_MS });
  return slug;
}

// path ภายในที่ต้องเข้าผ่าน host ที่ถูกต้องเท่านั้น — ห้ามเปิดตรงจาก host ร้านค้า
const INTERNAL_PREFIXES = ['/super-admin', '/platform'];

type HostTarget =
  | { kind: 'super-admin' }
  | { kind: 'platform' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'unknown' };

function resolveHost(host: string): HostTarget {
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

  // production: admin.shopdashth.com / dev: admin.localhost
  if (host === `admin.${rootDomain}` || host === 'admin.localhost') {
    return { kind: 'super-admin' };
  }
  // production: shopdashth.com + www / dev: www.localhost (localhost เปล่า = demo เพื่อ DX)
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
  // custom domain — middleware() จะ lookup ตาราง custom_domains ต่อ (async)
  return { kind: 'unknown' };
}

// ไฟล์ static ใน public/ — ต้องปล่อยผ่านก่อน rewrite
// (host แพลตฟอร์ม/super-admin rewrite ทุก path เป็น /platform|/super-admin + path → ไฟล์ public จะ 404)
// ไม่รวม .xml/.txt เพราะ sitemap.xml และ robots.txt เป็น route ต่อ tenant ที่ต้องได้ x-tenant-slug
const STATIC_FILE = /\.(?:webp|png|jpe?g|gif|svg|ico|css|js|map|woff2?|ttf|mp4|webm)$/i;

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Cloudflare Worker พร็อกซี (workers/tenant-proxy.js) แนบ host ร้านจริงมาใน x-tenant-host
  // + secret เพราะ Vercel เห็น Host เป็น *.vercel.app (Vercel บังคับ SNI == Host, ออก wildcard
  // cert ให้ไม่ได้เมื่อ NS ไม่ใช่ของมัน) — ดู DEPLOYMENT.md §1.1
  const proxySecret = process.env.TENANT_PROXY_SECRET;
  const viaProxy = !!proxySecret && req.headers.get('x-tenant-proxy') === proxySecret;

  // server action redirect() ทำ internal fetch เข้า loopback (Host กลายเป็น localhost:3000)
  // host จริงของผู้ใช้อยู่ใน x-forwarded-host — ต้องอ่านตัวนั้นก่อน (proxy/Vercel ก็ตั้งให้เช่นกัน)
  const rawHost =
    (viaProxy ? req.headers.get('x-tenant-host') : null) ??
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    '';
  const host = rawHost.split(':')[0].toLowerCase();

  // cron ถูกเรียกจากโดเมน deployment (เช่น *.vercel.app) ไม่ใช่ host ร้าน —
  // ปล่อยผ่านทุก host, route ตรวจ CRON_SECRET เอง
  if (path.startsWith('/api/cron/')) return NextResponse.next();

  if (STATIC_FILE.test(path)) return NextResponse.next();

  let target = resolveHost(host);

  // host แปลกหน้า = อาจเป็น custom domain ของร้าน (งาน 4.8)
  if (target.kind === 'unknown' && host.includes('.') && !host.endsWith('.localhost')) {
    const slug = await resolveCustomDomain(host);
    if (slug) target = { kind: 'tenant', slug };
  }

  // เมื่อมาผ่าน Worker: Vercel เห็น Host เป็น *.vercel.app → ต้องบังคับ host จริงลง downstream
  // ทุกที่ที่อ่าน host/x-forwarded-host (sitemap, ลิงก์รีเซ็ตรหัส, /auth/confirm) จะได้โดเมนร้านถูก
  const requestHeaders = new Headers(req.headers);
  if (viaProxy) {
    requestHeaders.set('host', host);
    requestHeaders.set('x-forwarded-host', host);
    requestHeaders.set('x-forwarded-proto', 'https');
  }

  // robots.txt เป็น metadata route ที่ root ของ app เท่านั้น (Next ไม่รองรับใน route group)
  // — host แพลตฟอร์ม/super-admin ห้าม rewrite เป็น /platform/robots.txt (404) ให้ผ่านตรง
  // พร้อมบอกชนิด host ให้ app/robots.ts เลือกกติกา (host ร้านไหลตาม flow ปกติด้านล่าง)
  // เครื่องมือ dev: หน้า preview ธีม (gate ด้วย THEME_PREVIEW=1 ในตัว page — production ตอบ 404)
  // route อยู่ root ของ app จึงห้าม rewrite ตาม host
  if (path.startsWith('/theme-preview')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (path === '/robots.txt' && (target.kind === 'platform' || target.kind === 'super-admin')) {
    requestHeaders.set('x-robots-host-kind', target.kind);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // /super-admin, /platform เข้าตรงจาก host อื่นไม่ได้ (กัน bypass hostname routing)
  const hitsInternal = INTERNAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (target.kind === 'super-admin') {
    if (path.startsWith('/platform')) {
      return NextResponse.rewrite(new URL('/domain-not-configured', req.url), {
        request: { headers: requestHeaders },
      });
    }
    // /auth/confirm (PKCE) และ /api ใช้ path เดิม
    if (path.startsWith('/auth/') || path.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.rewrite(new URL(`/super-admin${path === '/' ? '' : path}`, req.url), {
      request: { headers: requestHeaders },
    });
  }

  if (target.kind === 'platform') {
    if (path.startsWith('/super-admin')) {
      return NextResponse.rewrite(new URL('/domain-not-configured', req.url), {
        request: { headers: requestHeaders },
      });
    }
    if (path.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.rewrite(new URL(`/platform${path === '/' ? '' : path}`, req.url), {
      request: { headers: requestHeaders },
    });
  }

  if (target.kind === 'unknown' || hitsInternal) {
    return NextResponse.rewrite(new URL('/domain-not-configured', req.url), {
      request: { headers: requestHeaders },
    });
  }

  requestHeaders.set('x-tenant-slug', target.slug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // ครอบทุก path รวม /api (route handlers ใช้ getTenantContext ด้วย)
  // ยกเว้น static assets ของ Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
