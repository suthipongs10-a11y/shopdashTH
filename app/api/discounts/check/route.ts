// เช็คโค้ดส่วนลดก่อนสั่งซื้อ (preview เท่านั้น) — การกันโควตา/บังคับจริงอยู่ที่ createOrder
// server คำนวณ subtotal จาก DB จาก items ที่ส่งมา (ไม่เชื่อยอดจาก client §8.5)

import { NextResponse } from 'next/server';
import { validateDiscountCode } from '@/lib/discounts';
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

interface CheckBody {
  code?: string;
  items?: { variantId: string; qty: number }[];
}

export async function POST(req: Request) {
  // กัน brute-force เดาโค้ดส่วนลด
  if (isRateLimited(`discount-check:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let body: CheckBody;
  try {
    body = (await req.json()) as CheckBody;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const ctx = await getTenantContext();
    // ฟีเจอร์ตามแพลน — server ตรวจเสมอ (DoD 6: เรียกตรงโดยไม่มีสิทธิ์ → 403)
    if (!ctx.features.discount_codes) {
      return NextResponse.json({ error: 'ร้านนี้ไม่รองรับโค้ดส่วนลด' }, { status: 403 });
    }
    const items = (body.items ?? []).filter(
      (i) => typeof i.variantId === 'string' && Number.isInteger(i.qty) && i.qty > 0,
    );
    if (!body.code?.trim() || items.length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกโค้ดส่วนลด' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: variants } = await db
      .from('product_variants')
      .select('id, price_override, products!inner(base_price, status)')
      .eq('tenant_id', ctx.tenantId)
      .in('id', items.map((i) => i.variantId));

    interface Row {
      id: string;
      price_override: number | null;
      products: { base_price: number; status: string };
    }
    const priceMap = new Map(
      ((variants ?? []) as unknown as Row[]).map((v) => [
        v.id,
        v.price_override ?? v.products.base_price,
      ]),
    );
    const subtotal = items.reduce((sum, i) => sum + (priceMap.get(i.variantId) ?? 0) * i.qty, 0);

    const result = await validateDiscountCode(ctx, body.code, subtotal);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

    return NextResponse.json({ ok: true, code: result.code, amount: result.amount });
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error('[api/discounts/check]', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
