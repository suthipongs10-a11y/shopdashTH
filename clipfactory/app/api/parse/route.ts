import { NextResponse } from 'next/server';
import { parseProduct } from '@/lib/gemini/parse';
import { toThaiError } from '@/lib/gemini/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_INPUT = 8000;

export async function POST(req: Request) {
  let body: { raw?: unknown };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const raw = typeof body.raw === 'string' ? body.raw.trim() : '';
  if (!raw) return NextResponse.json({ error: 'ยังไม่ได้วางข้อความสินค้า' }, { status: 400 });
  if (raw.length > MAX_INPUT) {
    return NextResponse.json(
      { error: `ข้อความยาวเกินไป (สูงสุด ${MAX_INPUT.toLocaleString('th-TH')} ตัวอักษร)` },
      { status: 400 },
    );
  }

  try {
    const product = await parseProduct(raw, req.signal);
    if (!product.name) {
      return NextResponse.json(
        { error: 'หาชื่อสินค้าจากข้อความนี้ไม่เจอ ลองคัดลอกใหม่ให้มีชื่อสินค้าและราคาด้วย' },
        { status: 422 },
      );
    }
    return NextResponse.json({ product });
  } catch (err) {
    const { message, status } = toThaiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
