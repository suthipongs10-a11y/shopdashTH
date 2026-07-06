// ข้อมูลลูกค้า (§2.3) — สร้างอัตโนมัติจาก checkout, dedupe ด้วยเบอร์โทร
// ยอดสะสมนับเฉพาะออร์เดอร์ที่จ่ายแล้ว (confirmed ขึ้นไป ไม่รวม cancelled)

import Link from 'next/link';
import { formatBaht, formatThaiDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

const PAID_STATUSES = ['confirmed', 'packing', 'shipped'];

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string;
  created_at: string;
  orders: { total_amount: number; status: string }[];
}

export default async function CustomersPage() {
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('customers')
    .select('id, name, phone, created_at, orders(total_amount, status)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);

  const customers = ((data ?? []) as unknown as CustomerRow[]).map((c) => {
    const paid = c.orders.filter((o) => PAID_STATUSES.includes(o.status));
    return {
      ...c,
      orderCount: c.orders.length,
      paidTotal: paid.reduce((sum, o) => sum + o.total_amount, 0),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">ลูกค้า</h1>
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        {customers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">
            ยังไม่มีลูกค้า — รายชื่อจะถูกสร้างอัตโนมัติเมื่อมีคำสั่งซื้อ
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">ชื่อ</th>
                <th className="px-4 py-2 font-medium">เบอร์โทร</th>
                <th className="px-4 py-2 text-right font-medium">ออร์เดอร์</th>
                <th className="px-4 py-2 text-right font-medium">ยอดสะสม (จ่ายแล้ว)</th>
                <th className="px-4 py-2 font-medium">ลูกค้าตั้งแต่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {c.name ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-right">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatBaht(c.paidTotal)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatThaiDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
