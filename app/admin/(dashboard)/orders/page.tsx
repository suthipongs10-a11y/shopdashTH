// ตารางออร์เดอร์ filter ตามสถานะ (§2.3)

import Link from 'next/link';
import { OrdersIcon } from '@/components/admin/icons';
import {
  Badge,
  EmptyState,
  ORDER_STATUS_TONE,
  PageHeader,
  tableWrap,
  tdClass,
  thClass,
  trHover,
} from '@/components/admin/ui';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { ORDER_STATUSES, ORDER_STATUS_TH, type OrderStatus } from '@/lib/orders/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

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

  const pillBase = 'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors';

  return (
    <div className="space-y-6">
      <PageHeader title="ออร์เดอร์" description="แสดง 100 รายการล่าสุด" />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`${pillBase} ${
            !activeStatus
              ? 'bg-gray-900 text-white shadow-sm'
              : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`${pillBase} ${
              activeStatus === s
                ? 'bg-gray-900 text-white shadow-sm'
                : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {ORDER_STATUS_TH[s]}
          </Link>
        ))}
      </div>

      {(orders ?? []).length === 0 ? (
        <EmptyState
          icon={<OrdersIcon size={22} />}
          title={activeStatus ? `ไม่มีออร์เดอร์สถานะ "${ORDER_STATUS_TH[activeStatus]}"` : 'ยังไม่มีออร์เดอร์'}
          sub="เมื่อลูกค้าสั่งซื้อจากหน้าร้าน ออร์เดอร์จะแสดงที่นี่ทันที"
        />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thClass}>เลขออร์เดอร์</th>
                <th className={thClass}>ลูกค้า</th>
                <th className={`${thClass} text-right`}>ยอดสุทธิ</th>
                <th className={thClass}>สถานะ</th>
                <th className={thClass}>เวลาสั่ง</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className={trHover}>
                  <td className={tdClass}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <span className="block font-medium text-gray-900">{o.ship_name}</span>
                    <span className="text-xs text-gray-500">{o.ship_phone}</span>
                  </td>
                  <td className={`${tdClass} text-right font-semibold text-gray-900`}>
                    {formatBaht(o.total_amount)}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>
                      {ORDER_STATUS_TH[o.status as OrderStatus]}
                    </Badge>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-gray-500`}>
                    {formatThaiDateTime(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
