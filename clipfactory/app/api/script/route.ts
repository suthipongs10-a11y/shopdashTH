import { NextResponse } from 'next/server';
import { generateScript } from '@/lib/gemini/script';
import { toThaiError } from '@/lib/gemini/client';
import { getTemplate } from '@/lib/templates';
import type { Platform, ProductInput, TemplateId } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  product?: Partial<ProductInput>;
  templateId?: TemplateId;
  platform?: Platform;
  targetSec?: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const name = body.product?.name?.trim();
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

  const [minSec, maxSec] = template.durationSec;
  const requested = Number(body.targetSec) || template.targetSec;
  const targetSec = Math.min(maxSec, Math.max(minSec, requested));

  const product: ProductInput = {
    name,
    price: body.product?.price?.trim() ?? '',
    sellingPoints: (body.product?.sellingPoints ?? []).map((s) => String(s).trim()).filter(Boolean),
    category: body.product?.category?.trim() ?? '',
    url: body.product?.url?.trim() ?? '',
    audience: body.product?.audience?.trim() ?? '',
  };

  try {
    const script = await generateScript({
      product,
      template,
      platform: body.platform === 'shopee' ? 'shopee' : 'tiktok',
      targetSec,
    });
    return NextResponse.json({ script, targetSec });
  } catch (err) {
    const { message, status } = toThaiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
