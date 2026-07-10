// Guest checkout (§3.3 ข้อ 3) — เขียนผ่าน service role เท่านั้น ไม่เปิด INSERT ให้ anon
// server คำนวณราคา/ยอดจาก DB เองทั้งหมดใน lib/orders/create.ts

import { NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/line';
import { createOrder, type CheckoutCustomerInput, type CheckoutItemInput } from '@/lib/orders/create';
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

interface CheckoutRequestBody {
  items: CheckoutItemInput[];
  customer: CheckoutCustomerInput;
  /** โค้ดส่วนลด (P4) — server validate + กันโควตาเองใน createOrder */
  discountCode?: string;
}

export async function POST(req: Request) {
  if (isRateLimited(`checkout:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let body: CheckoutRequestBody;
  try {
    body = (await req.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const ctx = await getTenantContext();
    const result = await createOrder(
      ctx,
      body.items ?? [],
      body.customer ?? ({} as CheckoutCustomerInput),
      typeof body.discountCode === 'string' ? body.discountCode : undefined,
    );

    if (result.ok) {
      // แจ้งเตือน LINE (P4 — fire-and-forget, fail แล้วไม่กระทบออร์เดอร์)
      await notifyNewOrder(ctx, result.orderNumber, result.totalAmount);
      return NextResponse.json({ orderNumber: result.orderNumber, payToken: result.payToken });
    }
    if ('priceChanged' in result) {
      return NextResponse.json(
        { error: result.error, priceChanged: true, items: result.items },
        { status: result.status },
      );
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error('[api/checkout]', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 },
    );
  }
}
