// สถานะออร์เดอร์แบบย่อ — กล่อง "สถานะคำสั่งซื้อล่าสุด" บนหน้าแรก (ธีม Commerce)
// กติกาเดียวกับหน้าติดตาม (§2.1): ต้องส่ง เลขออร์เดอร์ + เบอร์โทร ตรงกันทั้งคู่
// ตอบ "ไม่พบ" แบบเดียวกันทุกกรณี — กัน enumeration

import { NextResponse } from 'next/server';
import { trackingUrl } from '@/lib/carriers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, TenantLockedError, TenantNotFoundError } from '@/lib/tenant-context';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const orderNumber = (url.searchParams.get('num') ?? '').trim().toUpperCase();
  const phone = (url.searchParams.get('phone') ?? '').trim();

  if (!orderNumber || !phone) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  let tenantId: string;
  try {
    tenantId = (await getTenantContext()).tenantId;
  } catch (err) {
    if (err instanceof TenantNotFoundError || err instanceof TenantLockedError) {
      return NextResponse.json({ found: false }, { status: 404 });
    }
    throw err;
  }

  const db = createAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('order_number, status, carrier, tracking_number, created_at')
    .eq('tenant_id', tenantId)
    .eq('order_number', orderNumber)
    .eq('ship_phone', phone)
    .maybeSingle();

  if (!order) return NextResponse.json({ found: false }, { status: 404 });

  return NextResponse.json({
    found: true,
    order: {
      orderNumber: order.order_number,
      status: order.status,
      createdAt: order.created_at,
      carrier: order.carrier,
      trackingNumber: order.tracking_number,
      trackingUrl: trackingUrl(order.carrier, order.tracking_number),
    },
  });
}
