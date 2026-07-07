// Layout ของหน้า "แพลนของฉัน" — แยกจาก (dashboard) เพราะต้องเข้าได้แม้ร้าน locked (§7.4)

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { logout } from '@/app/admin/(dashboard)/actions';
import { getStoreUser, userRole } from '@/lib/auth';
import {
  getTenantContextAllowLocked,
  TenantNotFoundError,
  type TenantContext,
} from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';

export default async function PlanLayout({ children }: { children: React.ReactNode }) {
  let ctx: TenantContext;
  try {
    ctx = await getTenantContextAllowLocked();
  } catch (err) {
    if (err instanceof TenantNotFoundError) notFound();
    throw err;
  }

  const user = await getStoreUser(ctx);
  if (!user) redirect('/admin/login');

  // หน้าแพลนเฉพาะเจ้าของร้าน (§2.3 P4) — staff เห็นข้อความแจ้งแทน
  if (userRole(user) !== 'store_owner') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            เฉพาะเจ้าของร้านเท่านั้นที่จัดการแพลนได้
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            กรุณาติดต่อเจ้าของร้านเพื่อดำเนินการต่ออายุหรือเปลี่ยนแพลน
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-900">{ctx.store.name}</span>
            {ctx.status !== 'locked' && (
              <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-900">
                ← กลับหลังร้าน
              </Link>
            )}
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
