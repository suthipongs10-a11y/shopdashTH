import { NextResponse } from 'next/server';
import { researchTrends } from '@/lib/gemini/trends';
import { toThaiError } from '@/lib/gemini/client';
import type { Platform } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_QUERY = 200;

export async function POST(req: Request) {
  let body: { query?: unknown; platform?: unknown };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const queryTh = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY) : '';
  if (!queryTh) {
    return NextResponse.json({ error: 'กรุณาระบุหมวดสินค้าหรือหัวข้อที่อยากค้น' }, { status: 400 });
  }

  const platform: Platform = body.platform === 'shopee' ? 'shopee' : 'tiktok';

  try {
    const report = await researchTrends({
      queryTh,
      platform,
      todayIso: new Date().toISOString().slice(0, 10),
      signal: req.signal,
    });
    return NextResponse.json({ report });
  } catch (err) {
    const { message, status } = toThaiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
