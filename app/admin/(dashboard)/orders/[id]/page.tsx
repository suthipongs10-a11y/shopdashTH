// หน้า detail ออร์เดอร์ (§2.3) — รายการสินค้า, ที่อยู่, สลิปทุกใบ (ประวัติเก็บครบ §7.1)

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { trackingUrl } from '@/lib/carriers';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { CARRIER_TH, ORDER_STATUS_TH, type Carrier, type OrderStatus } from '@/lib/orders/status';
import { presignGetUrl } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { OrderActionsPanel } from './order-actions-panel';

const SLIP_STATUS_TH: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

interface AdminOrderRow {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  note: string | null;
  carrier: string | null;
  tracking_number: string | null;
  cancelled_reason: string | null;
  created_at: string;
  order_items: { product_name: string; variant_label: string | null; unit_price: number; qty: number }[];
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('orders')
    .select(
      'id, order_number, status, subtotal, shipping_fee, discount, total_amount, ' +
        'ship_name, ship_phone, ship_address, note, carrier, tracking_number, cancelled_reason, created_at, ' +
        'order_items(product_name, variant_label, unit_price, qty)',
    )
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!data) notFound();
  const order = data as unknown as AdminOrderRow;
  const status = order.status as OrderStatus;

  const { data: slips } = await db
    .from('payment_slips')
    .select('id, r2_key, status, reject_reason_th, created_at, reviewed_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });

  const slipLinks = await Promise.all(
    (slips ?? []).map(async (s) => ({ ...s, url: await presignGetUrl(s.r2_key) })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">
            ← กลับรายการออร์เดอร์
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">สั่งเมื่อ {formatThaiDateTime(order.created_at)}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {ORDER_STATUS_TH[status]}
        </span>
      </div>

      {status === 'cancelled' && order.cancelled_reason && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          เหตุผลที่ยกเลิก: {order.cancelled_reason}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* รายการสินค้า */}
          <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">สินค้า</th>
                  <th className="px-4 py-2 text-right font-medium">ราคา × จำนวน</th>
                  <th className="px-4 py-2 text-right font-medium">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(order.order_items ?? []).map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{item.product_name}</span>
                      {item.variant_label && (
                        <span className="text-gray-500"> · {item.variant_label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatBaht(item.unit_price)} × {item.qty}
                    </td>
                    <td className="px-4 py-3 text-right">{formatBaht(item.unit_price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50 text-sm">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-gray-500">
                    ค่าจัดส่ง
                  </td>
                  <td className="px-4 py-2 text-right">
                    {order.shipping_fee === 0 ? 'ส่งฟรี' : formatBaht(order.shipping_fee)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td colSpan={2} className="px-4 py-2 text-right">
                    ยอดสุทธิ
                  </td>
                  <td className="px-4 py-2 text-right">{formatBaht(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* สลิปทั้งหมด (ประวัติเก็บทุกใบ — ห้ามลบ §7.1) */}
          <section className="rounded-md border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-500">
              สลิปโอนเงิน ({slipLinks.length} ใบ)
            </h2>
            {slipLinks.length === 0 ? (
              <p className="text-sm text-gray-400">ยังไม่มีสลิป</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {slipLinks.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline underline-offset-2"
                    >
                      ดูสลิป
                    </a>
                    <span
                      className={
                        s.status === 'approved'
                          ? 'text-green-600'
                          : s.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                      }
                    >
                      {SLIP_STATUS_TH[s.status]}
                    </span>
                    <span className="text-gray-400">{formatThaiDateTime(s.created_at)}</span>
                    {s.reject_reason_th && (
                      <span className="text-gray-500">— {s.reject_reason_th}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <OrderActionsPanel orderId={order.id} status={status} />

          {/* ข้อมูลจัดส่ง */}
          <section className="rounded-md border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-medium text-gray-500">ข้อมูลจัดส่ง</h2>
            <p className="font-medium text-gray-900">{order.ship_name}</p>
            <p className="text-gray-600">{order.ship_phone}</p>
            <p className="mt-1 whitespace-pre-wrap text-gray-600">{order.ship_address}</p>
            {order.note && (
              <p className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-yellow-800">
                หมายเหตุลูกค้า: {order.note}
              </p>
            )}
            {order.tracking_number && (
              <p className="mt-2 text-gray-900">
                ขนส่ง: {order.carrier ? CARRIER_TH[order.carrier as Carrier] : '-'} · เลขพัสดุ:{' '}
                <span className="font-medium">{order.tracking_number}</span>
                {trackingUrl(order.carrier, order.tracking_number) && (
                  <a
                    href={trackingUrl(order.carrier, order.tracking_number)!}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-blue-600 underline underline-offset-2"
                  >
                    เปิดหน้าติดตามของขนส่ง ↗
                  </a>
                )}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
