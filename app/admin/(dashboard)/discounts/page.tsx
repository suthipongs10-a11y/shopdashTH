// โค้ดส่วนลด (งาน 4.4 — §2.3) — เฉพาะแพลนที่มีฟีเจอร์ discount_codes

import { formatBaht, formatThaiDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { DiscountRowActions } from './discount-row-actions';
import { NewDiscountForm } from './new-discount-form';

export const dynamic = 'force-dynamic';

interface DiscountListRow {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export default async function DiscountsPage() {
  const ctx = await getTenantContext();

  if (!ctx.features.discount_codes) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-gray-900">โค้ดส่วนลด</h1>
        <p className="mt-2 text-sm text-gray-500">
          ฟีเจอร์นี้ใช้ได้กับแพลน Pro ขึ้นไป —{' '}
          <a href="/admin/plan" className="font-medium text-gray-900 underline underline-offset-2">
            อัปเกรดแพลน
          </a>{' '}
          เพื่อเปิดใช้งาน
        </p>
      </div>
    );
  }

  const db = createAdminClient();
  const { data } = await db
    .from('discount_codes')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as DiscountListRow[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">โค้ดส่วนลด</h1>
      <NewDiscountForm />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">โค้ด</th>
              <th className="px-4 py-3 font-medium">ส่วนลด</th>
              <th className="px-4 py-3 font-medium">ยอดขั้นต่ำ</th>
              <th className="px-4 py-3 font-medium">ใช้แล้ว/โควตา</th>
              <th className="px-4 py-3 font-medium">ช่วงเวลา</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{d.code}</td>
                <td className="px-4 py-3 text-gray-700">
                  {d.type === 'percent' ? `${d.value}%` : formatBaht(d.value)}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {d.min_order ? formatBaht(d.min_order) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {d.used_count}/{d.max_uses ?? '∞'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {d.starts_at || d.ends_at
                    ? `${d.starts_at ? formatThaiDate(d.starts_at) : '…'} – ${d.ends_at ? formatThaiDate(d.ends_at) : '…'}`
                    : 'ไม่จำกัด'}
                </td>
                <td className="px-4 py-3">
                  {d.is_active ? (
                    <span className="text-emerald-700">เปิดใช้งาน</span>
                  ) : (
                    <span className="text-gray-400">ปิด</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DiscountRowActions discountId={d.id} isActive={d.is_active} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีโค้ดส่วนลด
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
