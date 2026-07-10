// Rate limit แบบ in-memory ต่อ instance (sliding window) — ด่านแรกกัน abuse
// ของ endpoint สาธารณะ (DEPLOYMENT §8: ยังไม่มี rate limit ในโค้ด)
// ข้อจำกัด: นับต่อ process — บน serverless หลาย instance ตัวเลขไม่รวมกัน
// จึงเป็น "เพดานต่อ instance" — production จริงควรมี WAF/edge อีกชั้น

import 'server-only';

const WINDOWS = new Map<string, number[]>();
const MAX_KEYS = 5_000;

/**
 * true = เกิน limit (ปฏิเสธคำขอ) — นับแบบ sliding window
 * key ควรรวม endpoint + ตัวระบุผู้เรียก เช่น `checkout:1.2.3.4`
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  let hits = WINDOWS.get(key);
  if (!hits) {
    // กัน map โตไม่จำกัด — ตัด key เก่าสุดออก (insertion order)
    if (WINDOWS.size >= MAX_KEYS) {
      const oldest = WINDOWS.keys().next().value;
      if (oldest !== undefined) WINDOWS.delete(oldest);
    }
    hits = [];
    WINDOWS.set(key, hits);
  }

  while (hits.length > 0 && hits[0] <= cutoff) hits.shift();
  if (hits.length >= limit) return true;
  hits.push(now);
  return false;
}

/** IP ของผู้เรียก — x-forwarded-for ตัวแรก (Vercel/proxy ตั้งให้เสมอ) */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

export const RATE_LIMIT_MESSAGE = 'คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
