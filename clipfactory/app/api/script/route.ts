import { NextResponse } from 'next/server';
import { generateScript } from '@/lib/gemini/script';
import { toThaiError } from '@/lib/gemini/client';
import { clampDuration, getTemplate } from '@/lib/templates';
import type { Platform, ProductInput, TemplateId } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** จำกัดความยาวของทุกช่อง กันข้อความยาวผิดปกติหลุดเข้าโมเดลและกินหน่วยความจำ */
const LIMITS = { name: 200, price: 60, category: 60, url: 500, audience: 200, point: 200, points: 10 };

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

interface Body {
  product?: Partial<ProductInput>;
  templateId?: TemplateId;
  platform?: Platform;
  targetSec?: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
    }
    body = parsed as Body;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const rawProduct = body.product;
  if (rawProduct !== undefined && (typeof rawProduct !== 'object' || rawProduct === null || Array.isArray(rawProduct))) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลสินค้าไม่ถูกต้อง' }, { status: 400 });
  }

  const name = text(body.product?.name, LIMITS.name);
  if (!name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อสินค้าก่อน' }, { status: 400 });
  }
  if (!body.templateId) {
    return NextResponse.json({ error: 'กรุณาเลือกสูตรคลิปก่อน' }, { status: 400 });
  }

  let template;
  try {
    template = getTemplate(body.templateId);
  } catch {
    return NextResponse.json({ error: 'ไม่รู้จักสูตรคลิปที่เลือก' }, { status: 400 });
  }

  const platform: Platform = body.platform === 'shopee' ? 'shopee' : 'tiktok';
  const targetSec = clampDuration(template, platform, Number(body.targetSec) || template.targetSec);

  const rawPoints = body.product?.sellingPoints;
  const product: ProductInput = {
    name,
    price: text(body.product?.price, LIMITS.price),
    sellingPoints: (Array.isArray(rawPoints) ? rawPoints : [])
      .slice(0, LIMITS.points)
      .map((s) => text(s, LIMITS.point))
      .filter(Boolean),
    category: text(body.product?.category, LIMITS.category),
    url: text(body.product?.url, LIMITS.url),
    audience: text(body.product?.audience, LIMITS.audience),
  };

  try {
    const script = await generateScript({
      product,
      template,
      platform,
      targetSec,
      signal: req.signal,
    });
    return NextResponse.json({ script, targetSec });
  } catch (err) {
    const { message, status } = toThaiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
