// จัดการ staff (งาน 4.9 — §2.3) — เฉพาะเจ้าของร้าน + แพลนมีฟีเจอร์ staff_accounts

import { getStoreUser, userRole } from '@/lib/auth';
import { formatThaiDate } from '@/lib/format';
import { listStaff } from '@/lib/staff';
import { getTenantContext } from '@/lib/tenant-context';
import { InviteStaffForm, StaffRowActions } from './staff-client';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);

  if (user && userRole(user) !== 'store_owner') {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        เฉพาะเจ้าของร้านเท่านั้นที่จัดการ staff ได้
      </div>
    );
  }

  if (!ctx.features.staff_accounts) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
        <h1 className="text-lg font-semibold text-gray-900">จัดการ staff</h1>
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

  const staff = await listStaff(ctx.tenantId);
  const activeCount = staff.filter((s) => !s.disabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">จัดการ staff</h1>
        <p className="mt-1 text-sm text-gray-500">
          ใช้ {activeCount}/{ctx.plan.max_staff < 0 ? 'ไม่จำกัด' : ctx.plan.max_staff} ที่นั่ง
          (แพลน {ctx.plan.name_th})
        </p>
      </div>

      <InviteStaffForm />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">อีเมล</th>
              <th className="px-4 py-3 font-medium">เพิ่มเมื่อ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-gray-900">{s.email}</td>
                <td className="px-4 py-3 text-gray-500">{formatThaiDate(s.createdAt)}</td>
                <td className="px-4 py-3">
                  {s.disabled ? (
                    <span className="text-red-600">ถูกระงับ</span>
                  ) : (
                    <span className="text-green-700">ใช้งานได้</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StaffRowActions userId={s.id} disabled={s.disabled} />
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มี staff
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
