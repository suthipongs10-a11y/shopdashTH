import { notFound, redirect } from 'next/navigation';
import { getStoreUser } from '@/lib/auth';
import {
  getTenantContext,
  TenantLockedError,
  TenantNotFoundError,
  type TenantContext,
} from '@/lib/tenant-context';
import { Nav } from './nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let ctx: TenantContext;
  try {
    ctx = await getTenantContext();
  } catch (err) {
    // ร้าน locked: Phase 3 จะ redirect ไปหน้าจ่ายเงิน (§7.4) — ตอนนี้แจ้งสถานะ
    if (err instanceof TenantLockedError) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-gray-900">ร้านถูกระงับการใช้งานชั่วคราว</h1>
            <p className="mt-3 text-sm text-gray-500">
              กรุณาติดต่อ ShopDash เพื่อต่ออายุแพลนการใช้งาน
            </p>
          </div>
        </main>
      );
    }
    if (err instanceof TenantNotFoundError) notFound();
    throw err;
  }

  // ต้องเป็น owner/staff "ของร้านนี้" เท่านั้น (§2.4) — บัญชีร้านอื่นถูกปฏิเสธ
  const user = await getStoreUser(ctx);
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav storeName={ctx.store.name} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
