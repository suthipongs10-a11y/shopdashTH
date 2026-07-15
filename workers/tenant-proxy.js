/**
 * Cloudflare Worker: พร็อกซี subdomain ร้าน (*.shopdashth.com) → Vercel
 * ------------------------------------------------------------------------
 * ทำไมต้องมี Worker ตัวนี้ (ดู DEPLOYMENT.md §1.1):
 *   - Vercel ออกใบรับรอง wildcard (`*.shopdashth.com`) ให้ไม่ได้ ถ้าโดเมนไม่ได้ใช้
 *     nameserver ของ Vercel — แต่โดเมนนี้จดกับ Cloudflare Registrar ซึ่งล็อก NS ไว้
 *     ที่ Cloudflare เปลี่ยนไม่ได้
 *   - Cloudflare (proxied) ต่อ origin โดยส่ง SNI = ชื่อ host ของผู้เข้าชม
 *     (nene.shopdashth.com) แต่ Vercel ไม่มี cert ของชื่อนั้น → TLS handshake ล้ม (525)
 *   - ต่อให้หลอก SNI ได้ Vercel ก็ตอบ 403 ถ้า SNI != Host (กันปลอมโดเมน)
 *
 * วิธีแก้: Cloudflare terminate TLS ฝั่งผู้ใช้ (Universal SSL ครอบ *.shopdashth.com ให้ฟรี)
 * แล้ว Worker ต่อ Vercel ผ่าน "ชื่อโดเมนของโปรเจกต์เอง" (SNI == Host == *.vercel.app → ผ่าน)
 * โดยฝากชื่อ host ร้านจริงไปใน header `x-tenant-host` (เซ็นด้วย secret) ให้ middleware.ts อ่าน
 *
 * ผูก route: `*.shopdashth.com/*` (zone shopdashth.com)
 * ตัวแปรลับ (Settings → Variables and Secrets):
 *   TENANT_PROXY_SECRET = ค่าเดียวกับ env `TENANT_PROXY_SECRET` บน Vercel
 */

// โดเมน production ของโปรเจกต์บน Vercel (มี cert ที่ถูกต้องเสมอ) — แก้ให้ตรงโปรเจกต์คุณ
const ORIGIN_HOST = 'shopdash-th.vercel.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const tenantHost = url.hostname; // เช่น nene.shopdashth.com / admin.shopdashth.com

    // ชี้ปลายทางไป Vercel ด้วยชื่อโปรเจกต์ (path + query เดิม) → SNI/Host ตรงกัน ไม่โดน 403/525
    url.hostname = ORIGIN_HOST;
    url.protocol = 'https:';
    url.port = '';

    const headers = new Headers(request.headers);
    headers.set('host', ORIGIN_HOST);
    headers.set('x-tenant-host', tenantHost); // host ร้านจริง — middleware.ts ใช้ resolve slug
    headers.set('x-tenant-proxy', env.TENANT_PROXY_SECRET); // กันปลอม header เมื่อยิงตรงเข้า vercel.app
    headers.set('x-forwarded-host', tenantHost);
    headers.set('x-forwarded-proto', 'https');

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const originResponse = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual', // 3xx จาก Vercel ต้องส่งกลับตรงๆ (แอปสร้าง Location เป็นโดเมนร้านแล้ว)
      ...(hasBody ? { duplex: 'half' } : {}),
    });

    // ส่ง response กลับตรงๆ — คงทั้ง status/headers/Set-Cookie
    // (คุกกี้ไม่ตั้ง Domain = host-only → เบราว์เซอร์ผูกกับโดเมนร้านที่ผู้ใช้เปิดโดยอัตโนมัติ)
    return new Response(originResponse.body, originResponse);
  },
};
