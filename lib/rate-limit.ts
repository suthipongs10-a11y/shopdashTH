// Rate limit ของ endpoint สาธารณะ (sliding window) — 2 backend:
// (ก) Upstash Redis (ตั้ง UPSTASH_REDIS_REST_URL/TOKEN) — นับรวมทุก instance ถูกต้องบน
//     Vercel serverless; เรียกผ่าน REST fetch ตรงๆ ไม่ต้องใช้ SDK
// (ข) in-memory ต่อ instance (ค่าเริ่มต้น เมื่อไม่ตั้ง env) — dev และ deploy เล็ก
// Redis ล่ม/timeout = fail-open ไปนับ in-memory ต่อ — rate limit เป็นด่านกัน abuse
// ห้ามกลายเป็นจุดที่ทำให้ลูกค้าจริงใช้งานไม่ได้

import 'server-only';

const WINDOWS = new Map<string, number[]>();
const MAX_KEYS = 5_000;
const REDIS_TIMEOUT_MS = 2_000;

function memoryLimited(key: string, limit: number, windowMs: number): boolean {
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

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

/** sliding window บน Redis sorted set — pipeline เดียว: กวาดของเก่า, นับ, บันทึก, ตั้งอายุ */
async function redisLimited(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean | null> {
  const config = redisConfig();
  if (!config) return null;

  const now = Date.now();
  const redisKey = `rl:${key}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const commands = [
    ['ZREMRANGEBYSCORE', redisKey, '0', String(now - windowMs)],
    ['ZADD', redisKey, String(now), member],
    ['ZCARD', redisKey],
    ['PEXPIRE', redisKey, String(windowMs)],
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
    const res = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const results = (await res.json()) as { result?: unknown; error?: string }[];
    const count = Number(results?.[2]?.result);
    if (!Number.isFinite(count)) return null;
    return count > limit;
  } catch {
    return null; // network/timeout → fallback in-memory
  }
}

/**
 * true = เกิน limit (ปฏิเสธคำขอ) — นับแบบ sliding window
 * key ควรรวม endpoint + ตัวระบุผู้เรียก เช่น `checkout:1.2.3.4`
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const viaRedis = await redisLimited(key, limit, windowMs);
  if (viaRedis !== null) return viaRedis;
  return memoryLimited(key, limit, windowMs);
}

/** IP ของผู้เรียก — x-forwarded-for ตัวแรก (Vercel/proxy ตั้งให้เสมอ) */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

export const RATE_LIMIT_MESSAGE = 'คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
