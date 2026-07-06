// ตารางออร์เดอร์ filter ตามสถานะ (§2.3)

import Link from 'next/link';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { ORDER_STATUSES, ORDER_STATUS_TH, type OrderStatus } from '@/lib/orders/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending_payment: 'bg-gray-100 text-gray-600',
  slip_uploaded: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;

  const ctx = await getTenantContext();
  const db = createAdminClient();

  let query = db
    .from('orders')
    .select('id, order_number, status, total_amount, ship_name, ship_phone, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (activeStatus) query = query.eq('status', activeStatus);
  const { data: orders } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">ออร์เดอร์</h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-full px-3 py-1 text-sm ${!activeStatus ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
        >
          ทั้งหมด
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${activeStatus === s ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            {ORDER_STATUS_TH[s]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        {(orders ?? []).length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">ยังไม่มีออร์เดอร์</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">เลขออร์เดอร์</th>
                <th className="px-4 py-2 font-medium">ลูกค้า</th>
                <th className="px-4 py-2 font-medium">ยอดสุทธิ</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 font-medium">เวลาสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-gray-900 hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.ship_name} · {o.ship_phone}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBaht(o.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[o.status as OrderStatus]}`}>
                      {ORDER_STATUS_TH[o.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatThaiDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
