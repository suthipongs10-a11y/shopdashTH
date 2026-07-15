import { headers } from 'next/headers';

// host ร้านจริงของ request — ใช้สร้าง absolute URL (ลิงก์รีเซ็ตรหัส, redirect, sitemap)
//
// เมื่อ traffic วิ่งผ่าน Cloudflare Worker → Vercel: Vercel "เขียนทับ" host / x-forwarded-host
// เป็น *.vercel.app ที่ระดับ serverless function (ทับค่าที่ middleware ตั้งด้วย) — จึงเชื่อ 2 header
// นั้นไม่ได้ ต้องอ่านจาก custom header `x-tenant-host` ที่ Worker แนบมา (Vercel ไม่แตะ custom header)
// validate ว่าเป็นโดเมนของเราจริงก่อนใช้ (กัน open-redirect กรณีมีคนยิงตรง vercel.app + ปลอม header)

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

export async function requestHost(): Promise<string | null> {
  const h = await headers();
  const proxied = h.get('x-tenant-host');
  if (proxied && (proxied === ROOT_DOMAIN || proxied.endsWith(`.${ROOT_DOMAIN}`))) {
    return proxied.toLowerCase();
  }
  // dev / เข้าตรง (ไม่ผ่าน Worker) — host อาจมี :port ต้องคงไว้ให้ URL ถูก
  return h.get('x-forwarded-host') ?? h.get('host') ?? null;
}

export async function requestOrigin(): Promise<string> {
  const host = (await requestHost()) ?? ROOT_DOMAIN;
  const proto = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  return `${proto}://${host}`;
}
