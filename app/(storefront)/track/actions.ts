'use server';

// ค้นหาออร์เดอร์สำหรับลูกค้า — ต้องกรอก เลขออร์เดอร์ + เบอร์โทร ตรงกันทั้งคู่
// (§2.1 — กัน enumeration) ตอบ "ไม่พบ" แบบเดียวกันทุกกรณี ไม่บอกว่าผิดช่องไหน

import type { TrackedOrder } from '@/components/storefront/types';
import type { Carrier, OrderStatus } from '@/lib/orders/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

export interface TrackState {
  order?: TrackedOrder;
  error?: string;
  searched?: boolean;
  /** echo ค่าที่ค้นล่าสุด — React 19 reset ฟอร์มหลัง action จึงต้องเติมค่ากลับให้ */
  orderNumber?: string;
  phone?: string;
}

export async function trackOrder(_prevState: TrackState, formData: FormData): Promise<TrackState> {
  const orderNumber = String(formData.get('order_number') ?? '').trim().toUpperCase();
  const phone = String(formData.get('phone') ?? '').trim();

  if (!orderNumber || !phone) {
    return { error: 'กรุณากรอกเลขออร์เดอร์และเบอร์โทรศัพท์', searched: true, orderNumber, phone };
  }

  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('orders')
    .select(
      'id, order_number, status, subtotal, shipping_fee, discount, total_amount, ' +
        'carrier, tracking_number, cancelled_reason, created_at, ' +
        'order_items(product_name, variant_label, unit_price, qty)',
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('order_number', orderNumber)
    .eq('ship_phone', phone)
    .maybeSingle();

  interface TrackRow {
    id: string;
    order_number: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    discount: number;
    total_amount: number;
    carrier: string | null;
    tracking_number: string | null;
    cancelled_reason: string | null;
    created_at: string;
    order_items: { product_name: string; variant_label: string | null; unit_price: number; qty: number }[];
  }
  const order = data as unknown as TrackRow | null;

  if (!order) {
    return {
      error: 'ไม่พบคำสั่งซื้อ — กรุณาตรวจสอบเลขออร์เดอร์และเบอร์โทรให้ถูกต้อง',
      searched: true,
      orderNumber,
      phone,
    };
  }

  // เหตุผลสลิปถูกปฏิเสธล่าสุด (โชว์เมื่อออร์เดอร์กลับมารอชำระ §7.1)
  let lastSlipRejectReason: string | null = null;
  if (order.status === 'pending_payment') {
    const { data: rejected } = await db
      .from('payment_slips')
      .select('reject_reason_th')
      .eq('tenant_id', ctx.tenantId)
      .eq('order_id', order.id)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastSlipRejectReason = rejected?.reject_reason_th ?? null;
  }

  return {
    searched: true,
    orderNumber,
    phone,
    order: {
      orderNumber: order.order_number,
      status: order.status as OrderStatus,
      createdAt: order.created_at,
      items: (order.order_items ?? []).map((i) => ({
        productName: i.product_name,
        variantLabel: i.variant_label,
        unitPrice: i.unit_price,
        qty: i.qty,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shipping_fee,
      discount: order.discount,
      totalAmount: order.total_amount,
      carrier: order.carrier as Carrier | null,
      trackingNumber: order.tracking_number,
      lastSlipRejectReason,
      cancelledReason: order.cancelled_reason,
    },
  };
}
