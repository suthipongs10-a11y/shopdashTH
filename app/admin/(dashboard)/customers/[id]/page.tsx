// ประวัติสั่งซื้อรายลูกค้า (§2.3)

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { ORDER_STATUS_TH, type OrderStatus } from '@/lib/orders/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data: customer } = await db
    .from('customers')
    .select('id, name, phone, created_at')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!customer) notFound();

  const { data: orders } = await db
    .from('orders')
    .select('id, order_number, status, total_amount, created_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  const paidTotal = (orders ?? [])
    .filter((o) => ['confirmed', 'packing', 'shipped'].includes(o.status))
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-gray-500 hover:underline">
          ← กลับรายชื่อลูกค้า
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{customer.name ?? customer.phone}</h1>
        <p className="text-sm text-gray-500">
          {customer.phone} · ยอดสะสม (จ่ายแล้ว) {formatBaht(paidTotal)} · {(orders ?? []).length}{' '}
          ออร์เดอร์
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">เลขออร์เดอร์</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 text-right font-medium">ยอดสุทธิ</th>
              <th className="px-4 py-2 font-medium">เวลาสั่ง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {ORDER_STATUS_TH[o.status as OrderStatus]}
                </td>
                <td className="px-4 py-3 text-right">{formatBaht(o.total_amount)}</td>
                <td className="px-4 py-3 text-gray-500">{formatThaiDateTime(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
